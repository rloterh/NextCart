import type { SupabaseClient } from "@supabase/supabase-js";
import { getDisputeSlaState, isActiveDispute } from "@/lib/admin/governance";
import { getPayoutAnomaly } from "@/lib/orders/payout-state";
import { getPayoutEscalationMessage } from "@/lib/platform/notifications";
import type { DisputeCase, Product, Profile, Store } from "@/types";
import type { Order } from "@/types/orders";
import type { Review } from "@/types/reviews";
import type {
  PlatformAutomationDeliveryMode,
  PlatformAutomationJob,
  PlatformAutomationJobKey,
  PlatformAutomationPayload,
  PlatformAutomationRunPayload,
  PlatformAutomationSignal,
  PlatformExportDefinition,
  PlatformExportFormat,
  PlatformExportKind,
  PlatformInboxItem,
  PlatformNotificationStateRecord,
  PlatformOperatorAudience,
} from "@/types/platform";

type OperatorProfile = Pick<Profile, "id" | "role" | "full_name" | "email">;
type StoreSummary = Pick<Store, "id" | "name" | "slug" | "status" | "owner_id" | "settings" | "created_at">;
type OrderSummary = Pick<
  Order,
  | "id"
  | "order_number"
  | "status"
  | "total"
  | "created_at"
  | "updated_at"
  | "delivered_at"
  | "stripe_transfer_id"
  | "stripe_transfer_status"
  | "payout_reconciled_at"
  | "store_id"
> & {
  store: Pick<Store, "name" | "slug"> | null;
};
type DisputeSummary = Pick<
  DisputeCase,
  | "id"
  | "status"
  | "priority"
  | "summary"
  | "created_at"
  | "updated_at"
  | "assigned_admin_id"
  | "refund_decision"
  | "payout_hold_status"
> & {
  order: Pick<Order, "order_number"> | null;
  store: Pick<Store, "name" | "slug"> | null;
};
type HiddenReviewSummary = Pick<Review, "id" | "title" | "rating" | "created_at"> & {
  product: Pick<Product, "id" | "name"> | null;
  store: Pick<Store, "name" | "slug"> | null;
};

interface AdminAutomationDataset {
  disputes: DisputeSummary[];
  orders: OrderSummary[];
  pendingStores: StoreSummary[];
  hiddenReviews: HiddenReviewSummary[];
  unreadInbox: number;
  emailDeliveryAvailable: boolean;
}

interface VendorAutomationDataset {
  store: StoreSummary;
  disputes: DisputeSummary[];
  orders: OrderSummary[];
  unreadInbox: number;
  emailDeliveryAvailable: boolean;
}

interface PlatformExportFilters {
  windowDays?: number | null;
  status?: string | null;
  sla?: "all" | "breached" | "at_risk";
  onlyFlagged?: boolean;
  assignment?: "all" | "assigned" | "unassigned";
  scope?: "all" | "pending_vendors" | "hidden_reviews";
  agedOnly?: boolean;
}

function unwrapRelation<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function normalizeOrders(
  data: Array<Omit<OrderSummary, "store"> & { store: OrderSummary["store"] | OrderSummary["store"][] }>
) {
  return data.map((entry) => ({
    ...entry,
    store: unwrapRelation(entry.store),
  }));
}

function normalizeDisputes(
  data: Array<
    Omit<DisputeSummary, "order" | "store"> & {
      order: DisputeSummary["order"] | DisputeSummary["order"][];
      store: DisputeSummary["store"] | DisputeSummary["store"][];
    }
  >
) {
  return data.map((entry) => ({
    ...entry,
    order: unwrapRelation(entry.order),
    store: unwrapRelation(entry.store),
  }));
}

function normalizeReviews(
  data: Array<
    Omit<HiddenReviewSummary, "product" | "store"> & {
      product: HiddenReviewSummary["product"] | HiddenReviewSummary["product"][];
      store: HiddenReviewSummary["store"] | HiddenReviewSummary["store"][];
    }
  >
) {
  return data.map((entry) => ({
    ...entry,
    product: unwrapRelation(entry.product),
    store: unwrapRelation(entry.store),
  }));
}

function buildSignal(
  id: string,
  label: string,
  value: number,
  description: string,
  tone: PlatformAutomationSignal["tone"]
): PlatformAutomationSignal {
  return { id, label, value, description, tone };
}

function buildExportDefinitions(audience: PlatformOperatorAudience): PlatformExportDefinition[] {
  if (audience === "vendor") {
    return [
      {
        kind: "vendor_payout_review",
        label: "Vendor payout review",
        description: "Settlement-ready handoff for your store's payout and reconciliation review.",
        formats: ["csv", "json"],
        href: "/api/platform/exports?kind=vendor_payout_review",
        presets: [
          {
            label: "Lagging settlements",
            description: "Only delivered orders still waiting on payout settlement.",
            href: "/api/platform/exports?kind=vendor_payout_review&onlyFlagged=true&status=delivered",
          },
          {
            label: "Last 14 days",
            description: "Recent settlement activity for week-over-week finance review.",
            href: "/api/platform/exports?kind=vendor_payout_review&windowDays=14",
          },
        ],
      },
    ];
  }

  return [
    {
      kind: "admin_payout_review",
      label: "Payout review export",
      description: "Delivered-order settlement handoff for finance or ops review.",
      formats: ["csv", "json"],
      href: "/api/platform/exports?kind=admin_payout_review",
      presets: [
        {
          label: "Settlement lag only",
          description: "Delivered orders still missing paid transfer status.",
          href: "/api/platform/exports?kind=admin_payout_review&onlyFlagged=true&status=delivered",
        },
        {
          label: "Last 7 days",
          description: "Recent settlement activity for daily finance reconciliation.",
          href: "/api/platform/exports?kind=admin_payout_review&windowDays=7",
        },
      ],
    },
    {
      kind: "dispute_queue",
      label: "Dispute queue export",
      description: "Current dispute workflow snapshot with SLA pressure, ownership, and refund posture.",
      formats: ["csv", "json"],
      href: "/api/platform/exports?kind=dispute_queue",
      presets: [
        {
          label: "SLA breaches",
          description: "Only overdue dispute cases that need immediate intervention.",
          href: "/api/platform/exports?kind=dispute_queue&sla=breached",
        },
        {
          label: "Unassigned disputes",
          description: "Active cases still waiting on a clear owner.",
          href: "/api/platform/exports?kind=dispute_queue&assignment=unassigned",
        },
      ],
    },
    {
      kind: "moderation_backlog",
      label: "Moderation backlog export",
      description: "Pending vendor and hidden-review backlog for governance handoff.",
      formats: ["csv", "json"],
      href: "/api/platform/exports?kind=moderation_backlog",
      presets: [
        {
          label: "Aged backlog",
          description: "Only moderation items that have already started to age.",
          href: "/api/platform/exports?kind=moderation_backlog&agedOnly=true",
        },
        {
          label: "Pending vendors only",
          description: "Focus strictly on vendor approval backlog.",
          href: "/api/platform/exports?kind=moderation_backlog&scope=pending_vendors",
        },
      ],
    },
  ];
}

function buildJobs(
  audience: PlatformOperatorAudience,
  counts: Record<PlatformAutomationJobKey, number>,
  emailDeliveryAvailable: boolean
): PlatformAutomationJob[] {
  const emailMode: PlatformAutomationDeliveryMode = emailDeliveryAvailable ? "email_ready" : "email_disabled";

  if (audience === "vendor") {
    return [
      {
        key: "delay_digest",
        label: "Delay digest boundary",
        description: "Prepare the current payout, dispute, and exception digest for scheduled delivery.",
        itemsAffected: counts.delay_digest,
        deliveryMode: emailMode,
      },
      {
        key: "payout_lag_followup",
        label: "Payout lag follow-up",
        description: "Summarize delivered orders still waiting on settlement progress.",
        itemsAffected: counts.payout_lag_followup,
        deliveryMode: "preview",
      },
    ];
  }

  return [
    {
      key: "delay_digest",
      label: "Marketplace digest boundary",
      description: "Prepare the current governance digest for scheduled send or operator review.",
      itemsAffected: counts.delay_digest,
      deliveryMode: emailMode,
    },
    {
      key: "stale_dispute_reminder",
      label: "Stale dispute reminder",
      description: "Surface overdue or unassigned dispute cases that need immediate ownership.",
      itemsAffected: counts.stale_dispute_reminder,
      deliveryMode: "preview",
    },
    {
      key: "payout_lag_followup",
      label: "Payout lag follow-up",
      description: "Prepare delivered-order settlement gaps and payout anomalies for finance review.",
      itemsAffected: counts.payout_lag_followup,
      deliveryMode: "preview",
    },
    {
      key: "moderation_backlog_reminder",
      label: "Moderation backlog reminder",
      description: "Summarize aged vendor approvals and hidden reviews that still need governance action.",
      itemsAffected: counts.moderation_backlog_reminder,
      deliveryMode: "preview",
    },
  ];
}

function getAutomationSecretConfigured() {
  return Boolean(process.env.PLATFORM_AUTOMATION_SECRET?.trim());
}

export function isAutomationSecretValid(request: Request) {
  const configured = process.env.PLATFORM_AUTOMATION_SECRET?.trim();
  if (!configured) {
    return false;
  }

  const authorization = request.headers.get("authorization");
  return authorization === `Bearer ${configured}`;
}

export async function fetchNotificationStates(
  supabase: SupabaseClient,
  userId: string
) {
  const { data, error } = await supabase
    .from("notification_states")
    .select("user_id, item_id, state, read_at, archived_at, updated_at")
    .eq("user_id", userId);

  if (error) {
    return [] as PlatformNotificationStateRecord[];
  }

  return (data ?? []) as PlatformNotificationStateRecord[];
}

async function fetchAdminAutomationDataset(
  supabase: SupabaseClient,
  profile: OperatorProfile,
  inboxPreview: PlatformInboxItem[],
  emailDeliveryAvailable: boolean
): Promise<AdminAutomationDataset> {
  const [disputesRes, ordersRes, pendingStoresRes, hiddenReviewsRes, states] = await Promise.all([
    supabase
      .from("dispute_cases")
      .select("id, status, priority, summary, created_at, updated_at, assigned_admin_id, refund_decision, payout_hold_status, order:orders(order_number), store:stores(name, slug)")
      .order("updated_at", { ascending: false })
      .limit(30),
    supabase
      .from("orders")
      .select("id, order_number, status, total, created_at, updated_at, delivered_at, stripe_transfer_id, stripe_transfer_status, payout_reconciled_at, store_id, store:stores(name, slug)")
      .order("updated_at", { ascending: false })
      .limit(60),
    supabase
      .from("stores")
      .select("id, owner_id, name, slug, status, settings, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(30),
    supabase
      .from("reviews")
      .select("id, title, rating, created_at, product:products(id, name), store:stores(name, slug)")
      .eq("is_visible", false)
      .order("created_at", { ascending: true })
      .limit(30),
    fetchNotificationStates(supabase, profile.id),
  ]);

  const firstError = [disputesRes.error, ordersRes.error, pendingStoresRes.error, hiddenReviewsRes.error].find(Boolean);
  if (firstError) {
    throw new Error(firstError.message);
  }

  return {
    disputes: normalizeDisputes(
      ((disputesRes.data ?? []) as unknown as Array<
        Omit<DisputeSummary, "order" | "store"> & {
          order: DisputeSummary["order"] | DisputeSummary["order"][];
          store: DisputeSummary["store"] | DisputeSummary["store"][];
        }
      >)
    ),
    orders: normalizeOrders(
      ((ordersRes.data ?? []) as unknown as Array<
        Omit<OrderSummary, "store"> & { store: OrderSummary["store"] | OrderSummary["store"][] }
      >)
    ),
    pendingStores: (pendingStoresRes.data ?? []) as StoreSummary[],
    hiddenReviews: normalizeReviews(
      ((hiddenReviewsRes.data ?? []) as unknown as Array<
        Omit<HiddenReviewSummary, "product" | "store"> & {
          product: HiddenReviewSummary["product"] | HiddenReviewSummary["product"][];
          store: HiddenReviewSummary["store"] | HiddenReviewSummary["store"][];
        }
      >)
    ),
    unreadInbox: states.filter((entry) => entry.state === "unread").length || inboxPreview.length,
    emailDeliveryAvailable,
  };
}

async function fetchVendorAutomationDataset(
  supabase: SupabaseClient,
  profile: OperatorProfile,
  inboxPreview: PlatformInboxItem[],
  emailDeliveryAvailable: boolean
): Promise<VendorAutomationDataset> {
  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id, owner_id, name, slug, status, settings, created_at")
    .eq("owner_id", profile.id)
    .single();

  if (storeError || !store) {
    throw new Error(storeError?.message ?? "Vendor store unavailable.");
  }

  const [disputesRes, ordersRes, states] = await Promise.all([
    supabase
      .from("dispute_cases")
      .select("id, status, priority, summary, created_at, updated_at, assigned_admin_id, refund_decision, payout_hold_status, order:orders(order_number), store:stores(name, slug)")
      .eq("store_id", store.id)
      .order("updated_at", { ascending: false })
      .limit(20),
    supabase
      .from("orders")
      .select("id, order_number, status, total, created_at, updated_at, delivered_at, stripe_transfer_id, stripe_transfer_status, payout_reconciled_at, store_id, store:stores(name, slug)")
      .eq("store_id", store.id)
      .order("updated_at", { ascending: false })
      .limit(40),
    fetchNotificationStates(supabase, profile.id),
  ]);

  const firstError = [disputesRes.error, ordersRes.error].find(Boolean);
  if (firstError) {
    throw new Error(firstError.message);
  }

  return {
    store: store as StoreSummary,
    disputes: normalizeDisputes(
      ((disputesRes.data ?? []) as unknown as Array<
        Omit<DisputeSummary, "order" | "store"> & {
          order: DisputeSummary["order"] | DisputeSummary["order"][];
          store: DisputeSummary["store"] | DisputeSummary["store"][];
        }
      >)
    ),
    orders: normalizeOrders(
      ((ordersRes.data ?? []) as unknown as Array<
        Omit<OrderSummary, "store"> & { store: OrderSummary["store"] | OrderSummary["store"][] }
      >)
    ),
    unreadInbox: states.filter((entry) => entry.state === "unread").length || inboxPreview.length,
    emailDeliveryAvailable,
  };
}

function buildAdminSummary(dataset: AdminAutomationDataset) {
  const activeDisputes = dataset.disputes.filter((entry) => isActiveDispute(entry.status));
  const staleDisputes = activeDisputes.filter((entry) => {
    const sla = getDisputeSlaState(entry.created_at, entry.priority, entry.status);
    return sla.tone === "danger" || !entry.assigned_admin_id;
  });
  const payoutLagOrders = dataset.orders.filter(
    (entry) => entry.status === "delivered" && entry.stripe_transfer_status !== "paid"
  );
  const payoutAnomalies = dataset.orders.filter((entry) =>
    Boolean(
      getPayoutAnomaly(
        entry.status,
        entry.stripe_transfer_id,
        entry.stripe_transfer_status,
        entry.payout_reconciled_at
      )
    )
  );
  const agedPendingVendors = dataset.pendingStores.filter(
    (entry) => Date.now() - new Date(entry.created_at).getTime() >= 1000 * 60 * 60 * 24
  );
  const agedHiddenReviews = dataset.hiddenReviews.filter(
    (entry) => Date.now() - new Date(entry.created_at).getTime() >= 1000 * 60 * 60 * 12
  );
  const moderationBacklog = agedPendingVendors.length + agedHiddenReviews.length;

  const signals = [
    buildSignal(
      "stale-disputes",
      "Stale disputes",
      staleDisputes.length,
      "Active disputes that are overdue or still missing a clear owner.",
      staleDisputes.length > 0 ? "danger" : "success"
    ),
    buildSignal(
      "payout-lag",
      "Payout lag",
      payoutLagOrders.length,
      "Delivered orders still waiting for transfer settlement progress.",
      payoutLagOrders.length > 0 ? "warning" : "success"
    ),
    buildSignal(
      "finance-anomalies",
      "Finance anomalies",
      payoutAnomalies.length,
      "Orders whose payout trail shows a reversal, failure, or missing reconciliation.",
      payoutAnomalies.length > 0 ? "danger" : "success"
    ),
    buildSignal(
      "moderation-backlog",
      "Moderation backlog",
      moderationBacklog,
      "Pending vendors and hidden reviews that have started to age in the queue.",
      moderationBacklog > 0 ? "warning" : "success"
    ),
    buildSignal(
      "unread-inbox",
      "Unread inbox",
      dataset.unreadInbox,
      "Governance notifications still waiting for operator review.",
      dataset.unreadInbox > 0 ? "info" : "success"
    ),
  ];

  const counts: Record<PlatformAutomationJobKey, number> = {
    delay_digest: signals.reduce((sum, entry) => sum + entry.value, 0),
    stale_dispute_reminder: staleDisputes.length,
    payout_lag_followup: payoutLagOrders.length + payoutAnomalies.length,
    moderation_backlog_reminder: moderationBacklog,
  };

  return {
    signals,
    counts,
    summary:
      staleDisputes.length > 0 || payoutLagOrders.length > 0 || moderationBacklog > 0
        ? "Automation can now package overdue disputes, settlement lag, and moderation backlog into recurring review jobs and operator handoffs."
        : "Governance queues are currently healthy, and the automation layer is ready for recurring reminders when pressure returns.",
  };
}

function buildVendorSummary(dataset: VendorAutomationDataset) {
  const activeDisputes = dataset.disputes.filter((entry) => isActiveDispute(entry.status));
  const payoutLagOrders = dataset.orders.filter(
    (entry) => entry.status === "delivered" && entry.stripe_transfer_status !== "paid"
  );
  const payoutAnomalies = dataset.orders.filter((entry) =>
    Boolean(
      getPayoutAnomaly(
        entry.status,
        entry.stripe_transfer_id,
        entry.stripe_transfer_status,
        entry.payout_reconciled_at
      )
    )
  );
  const exceptionOrders = dataset.orders.filter((entry) =>
    ["delivery_failed", "reshipping", "return_initiated", "return_approved", "return_in_transit", "return_received"].includes(entry.status)
  );
  const payoutEscalation = getPayoutEscalationMessage({
    anomalyCount: payoutAnomalies.length,
    outstandingSettlements: payoutLagOrders.length,
  });

  const signals = [
    buildSignal(
      "exception-orders",
      "Exception follow-up",
      exceptionOrders.length,
      "Orders still moving through reship or return handling.",
      exceptionOrders.length > 0 ? "warning" : "success"
    ),
    buildSignal(
      "active-disputes",
      "Active disputes",
      activeDisputes.length,
      "Cases that still need vendor-side awareness or recovery context.",
      activeDisputes.length > 0 ? "warning" : "success"
    ),
    buildSignal(
      "payout-lag",
      "Settlement lag",
      payoutLagOrders.length,
      "Delivered orders still waiting for payout reconciliation progress.",
      payoutLagOrders.length > 0 ? "warning" : "success"
    ),
    buildSignal(
      "finance-anomalies",
      "Finance anomalies",
      payoutAnomalies.length,
      "Orders whose payout trail needs manual review before it feels settled.",
      payoutAnomalies.length > 0 ? "danger" : "success"
    ),
    buildSignal(
      "unread-inbox",
      "Unread inbox",
      dataset.unreadInbox,
      "Operational notifications still waiting for review.",
      dataset.unreadInbox > 0 ? "info" : "success"
    ),
  ];

  const counts: Record<PlatformAutomationJobKey, number> = {
    delay_digest: signals.reduce((sum, entry) => sum + entry.value, 0),
    stale_dispute_reminder: activeDisputes.length,
    payout_lag_followup: payoutLagOrders.length + payoutAnomalies.length,
    moderation_backlog_reminder: 0,
  };

  return {
    signals,
    counts,
    summary:
      payoutEscalation?.description ??
      "Automation can now package store-level delay digests and payout follow-up into schedule-ready handoffs for your operations team.",
  };
}

export async function buildPlatformAutomationPayload({
  supabase,
  profile,
  inboxPreview,
  emailDeliveryAvailable,
}: {
  supabase: SupabaseClient;
  profile: OperatorProfile;
  inboxPreview: PlatformInboxItem[];
  emailDeliveryAvailable: boolean;
}): Promise<PlatformAutomationPayload> {
  if (profile.role === "vendor") {
    const dataset = await fetchVendorAutomationDataset(supabase, profile, inboxPreview, emailDeliveryAvailable);
    const summary = buildVendorSummary(dataset);

    return {
      audience: "vendor",
      summary: summary.summary,
      signals: summary.signals,
      jobs: buildJobs("vendor", summary.counts, emailDeliveryAvailable),
      exports: buildExportDefinitions("vendor"),
      emailDeliveryAvailable,
      automationSecretConfigured: getAutomationSecretConfigured(),
      generatedAt: new Date().toISOString(),
    };
  }

  const dataset = await fetchAdminAutomationDataset(supabase, profile, inboxPreview, emailDeliveryAvailable);
  const summary = buildAdminSummary(dataset);

  return {
    audience: "admin",
    summary: summary.summary,
    signals: summary.signals,
    jobs: buildJobs("admin", summary.counts, emailDeliveryAvailable),
    exports: buildExportDefinitions("admin"),
    emailDeliveryAvailable,
    automationSecretConfigured: getAutomationSecretConfigured(),
    generatedAt: new Date().toISOString(),
  };
}

function buildCsv(rows: Array<Record<string, string | number | null>>) {
  if (rows.length === 0) {
    return "";
  }

  const headers = Object.keys(rows[0]);
  const escapeCell = (value: string | number | null) => {
    const stringValue = value === null ? "" : String(value);
    if (/[",\n]/.test(stringValue)) {
      return `"${stringValue.replace(/"/g, "\"\"")}"`;
    }
    return stringValue;
  };

  return [headers.join(","), ...rows.map((row) => headers.map((header) => escapeCell(row[header] ?? null)).join(","))].join("\n");
}

function formatExportResult(
  kind: PlatformExportKind,
  format: PlatformExportFormat,
  rows: Array<Record<string, string | number | null>>
) {
  const filename = `${kind}-${new Date().toISOString().slice(0, 10)}.${format}`;
  if (format === "json") {
    return {
      filename,
      contentType: "application/json; charset=utf-8",
      body: JSON.stringify(rows, null, 2),
    };
  }

  return {
    filename,
    contentType: "text/csv; charset=utf-8",
    body: buildCsv(rows),
  };
}

function filterOrders(
  orders: OrderSummary[],
  filters: PlatformExportFilters
) {
  const now = Date.now();
  return orders.filter((order) => {
    if (filters.status && order.status !== filters.status) {
      return false;
    }

    if (filters.windowDays && now - new Date(order.updated_at).getTime() > filters.windowDays * 24 * 60 * 60 * 1000) {
      return false;
    }

    if (filters.onlyFlagged) {
      const anomaly = getPayoutAnomaly(order.status, order.stripe_transfer_id, order.stripe_transfer_status, order.payout_reconciled_at);
      const laggingSettlement = order.status === "delivered" && order.stripe_transfer_status !== "paid";
      if (!anomaly && !laggingSettlement) {
        return false;
      }
    }

    return true;
  });
}

function filterDisputes(
  disputes: DisputeSummary[],
  filters: PlatformExportFilters
) {
  return disputes.filter((dispute) => {
    if (filters.status && dispute.status !== filters.status) {
      return false;
    }

    if (filters.assignment === "unassigned" && dispute.assigned_admin_id) {
      return false;
    }

    if (filters.assignment === "assigned" && !dispute.assigned_admin_id) {
      return false;
    }

    if (filters.sla && filters.sla !== "all") {
      const sla = getDisputeSlaState(dispute.created_at, dispute.priority, dispute.status);
      if (filters.sla === "breached" && sla.tone !== "danger") {
        return false;
      }
      if (filters.sla === "at_risk" && !["danger", "warning"].includes(sla.tone)) {
        return false;
      }
    }

    if (filters.windowDays) {
      const ageMs = Date.now() - new Date(dispute.updated_at).getTime();
      if (ageMs > filters.windowDays * 24 * 60 * 60 * 1000) {
        return false;
      }
    }

    return true;
  });
}

export async function exportPlatformData({
  supabase,
  profile,
  kind,
  format,
  filters,
}: {
  supabase: SupabaseClient;
  profile: OperatorProfile;
  kind: PlatformExportKind;
  format: PlatformExportFormat;
  filters: PlatformExportFilters;
}) {
  if (profile.role === "vendor") {
    if (kind !== "vendor_payout_review") {
      throw new Error("Vendors can only export their payout review handoff.");
    }

    const dataset = await fetchVendorAutomationDataset(supabase, profile, [], false);
    const rows = filterOrders(dataset.orders, filters).map((order) => ({
      order_number: order.order_number,
      store_name: dataset.store.name,
      order_status: order.status,
      payout_status: order.stripe_transfer_status ?? "pending_review",
      transfer_id: order.stripe_transfer_id ?? null,
      reconciled_at: order.payout_reconciled_at ?? null,
      anomaly: getPayoutAnomaly(order.status, order.stripe_transfer_id, order.stripe_transfer_status, order.payout_reconciled_at)?.label ?? null,
    }));

    return formatExportResult(kind, format, rows);
  }

  const adminDataset = await fetchAdminAutomationDataset(supabase, profile, [], false);

  switch (kind) {
    case "admin_payout_review":
      return formatExportResult(
        kind,
        format,
        filterOrders(adminDataset.orders, filters).map((order) => ({
          order_number: order.order_number,
          store_name: order.store?.name ?? "Unknown store",
          order_status: order.status,
          payout_status: order.stripe_transfer_status ?? "pending_review",
          transfer_id: order.stripe_transfer_id ?? null,
          reconciled_at: order.payout_reconciled_at ?? null,
          anomaly: getPayoutAnomaly(order.status, order.stripe_transfer_id, order.stripe_transfer_status, order.payout_reconciled_at)?.label ?? null,
        }))
      );
    case "dispute_queue":
      return formatExportResult(
        kind,
        format,
        filterDisputes(adminDataset.disputes, filters).map((dispute) => {
          const sla = getDisputeSlaState(dispute.created_at, dispute.priority, dispute.status);
          return {
            order_number: dispute.order?.order_number ?? "Unknown order",
            store_name: dispute.store?.name ?? "Unknown store",
            status: dispute.status,
            priority: dispute.priority,
            assigned_admin_id: dispute.assigned_admin_id ?? null,
            sla_label: sla.label,
            refund_decision: dispute.refund_decision,
            payout_hold_status: dispute.payout_hold_status,
            created_at: dispute.created_at,
            updated_at: dispute.updated_at,
          };
        })
      );
    case "moderation_backlog":
      return formatExportResult(
        kind,
        format,
        [
          ...adminDataset.pendingStores
            .filter((store) => {
              if (filters.scope === "hidden_reviews") {
                return false;
              }
              if (!filters.agedOnly) {
                return true;
              }
              return Date.now() - new Date(store.created_at).getTime() >= 24 * 60 * 60 * 1000;
            })
            .map((store) => ({
            entity_type: "vendor",
            title: store.name,
            detail: store.slug,
            backlog_signal: "pending_approval",
            created_at: store.created_at,
          })),
          ...adminDataset.hiddenReviews
            .filter((review) => {
              if (filters.scope === "pending_vendors") {
                return false;
              }
              if (!filters.agedOnly) {
                return true;
              }
              return Date.now() - new Date(review.created_at).getTime() >= 12 * 60 * 60 * 1000;
            })
            .map((review) => ({
            entity_type: "review",
            title: review.title || `${review.rating}-star review`,
            detail: review.store?.name ?? "Unknown store",
            backlog_signal: "hidden_review",
            created_at: review.created_at,
          })),
        ]
      );
    default:
      throw new Error("Unknown export kind.");
  }
}

export async function runPlatformAutomationJob({
  supabase,
  profile,
  jobKey,
  inboxPreview,
  emailDeliveryAvailable,
  deliverDigest,
}: {
  supabase: SupabaseClient;
  profile: OperatorProfile;
  jobKey: PlatformAutomationJobKey;
  inboxPreview: PlatformInboxItem[];
  emailDeliveryAvailable: boolean;
  deliverDigest?: boolean;
}): Promise<PlatformAutomationRunPayload> {
  const payload = await buildPlatformAutomationPayload({
    supabase,
    profile,
    inboxPreview,
    emailDeliveryAvailable,
  });

  const job = payload.jobs.find((entry) => entry.key === jobKey);
  if (!job) {
    throw new Error("That automation job is not available for the current operator role.");
  }

  const signalPreview = payload.signals
    .filter((entry) => entry.value > 0)
    .slice(0, 2)
    .map((entry) => `${entry.value} ${entry.label.toLowerCase()}`)
    .join(", ");

  const nextAction =
    job.key === "delay_digest"
      ? deliverDigest
        ? "The digest delivery boundary ran to policy recipients. Keep the trigger secret configured before wiring production cron."
        : "Use this schedule-ready boundary to hand the digest to your eventual cron or queue runner."
      : job.key === "stale_dispute_reminder"
        ? "Route the dispute queue export to the assigned governance owner and clear unowned cases first."
        : job.key === "moderation_backlog_reminder"
          ? "Share the moderation backlog export with governance reviewers before pending items age further."
          : "Use the payout review export to hand finance the orders still waiting on reconciliation.";

  return {
    jobKey,
    completedAt: new Date().toISOString(),
    itemsAffected: job.itemsAffected,
    deliveryMode: job.deliveryMode,
    summary:
      signalPreview.length > 0
        ? `${job.label} is prepared around ${signalPreview}.`
        : `${job.label} is prepared, and there are no active blockers in this queue right now.`,
    nextAction,
  };
}
