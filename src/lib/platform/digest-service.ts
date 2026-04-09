import { isActiveDispute, getDisputeSlaState } from "@/lib/admin/governance";
import { createAdminDigest, createVendorDigest } from "@/lib/platform/digests";
import {
  applyNotificationStateToItems,
  isMissingNotificationStateTable,
  summarizeInboxItems,
} from "@/lib/platform/inbox-state";
import {
  createPlatformInboxItem,
  getDisputeInboxTone,
  getPayoutHoldLabel,
  getRefundDecisionLabel,
} from "@/lib/platform/notifications";
import { getPayoutAnomaly, getPayoutState } from "@/lib/orders/payout-state";
import { sendPlatformDigestEmail } from "@/lib/platform/email";
import { getServerPlatformChecks } from "@/lib/platform/readiness.server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdminAction, DisputeCase, Profile, Store } from "@/types";
import type { Order } from "@/types/orders";
import type {
  PlatformDigestDeliveryPolicy,
  PlatformDigestPayload,
  PlatformInboxItem,
  PlatformNotificationStateRecord,
} from "@/types/platform";

export type DigestProfile = Pick<Profile, "id" | "role" | "full_name" | "email">;

type DigestStore = Pick<Store, "id" | "name" | "slug" | "status" | "settings">;
type DigestOrder = Pick<
  Order,
  "id" | "order_number" | "status" | "updated_at" | "stripe_transfer_id" | "stripe_transfer_status" | "payout_reconciled_at"
> & {
  store: Pick<Store, "name" | "slug"> | null;
};
type DigestDispute = Pick<
  DisputeCase,
  "id" | "status" | "priority" | "summary" | "created_at" | "updated_at" | "refund_decision" | "payout_hold_status" | "assigned_admin_id"
> & {
  order: Pick<Order, "order_number"> | null;
  store: Pick<Store, "name" | "slug"> | null;
};
type DigestModerationAction = Pick<AdminAction, "id" | "action" | "entity_type" | "entity_id" | "reason" | "metadata" | "created_at">;

function unwrapRelation<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function normalizeOrders(
  data: Array<Omit<DigestOrder, "store"> & { store: DigestOrder["store"] | DigestOrder["store"][] }>
) {
  return data.map((entry) => ({ ...entry, store: unwrapRelation(entry.store) }));
}

function normalizeDisputes(
  data: Array<
    Omit<DigestDispute, "order" | "store"> & {
      order: DigestDispute["order"] | DigestDispute["order"][];
      store: DigestDispute["store"] | DigestDispute["store"][];
    }
  >
) {
  return data.map((entry) => ({
    ...entry,
    order: unwrapRelation(entry.order),
    store: unwrapRelation(entry.store),
  }));
}

function getEmailDeliveryAvailable() {
  return getServerPlatformChecks().some(
    (check) => check.id === "notification_delivery" && check.status !== "blocked"
  );
}

function isValidRecipient(email: string | null | undefined) {
  return Boolean(email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
}

function uniqueRecipients(recipients: Array<string | null | undefined>) {
  return Array.from(new Set(recipients.filter((entry): entry is string => isValidRecipient(entry))));
}

export async function fetchDigestNotificationStates(
  supabase: SupabaseClient,
  userId: string
) {
  const { data, error } = await supabase
    .from("notification_states")
    .select("user_id, item_id, state, read_at, archived_at, updated_at")
    .eq("user_id", userId);

  if (error) {
    if (isMissingNotificationStateTable(error.message)) {
      return [] as PlatformNotificationStateRecord[];
    }

    throw new Error(error.message);
  }

  return (data ?? []) as PlatformNotificationStateRecord[];
}

function buildVendorPreviewItems({
  store,
  orders,
  disputes,
  moderationActions,
}: {
  store: DigestStore;
  orders: DigestOrder[];
  disputes: DigestDispute[];
  moderationActions: DigestModerationAction[];
}) {
  const items: PlatformInboxItem[] = [];

  for (const order of orders) {
    const payoutAnomaly = getPayoutAnomaly(
      order.status,
      order.stripe_transfer_id,
      order.stripe_transfer_status,
      order.payout_reconciled_at
    );

    if (payoutAnomaly || (order.status === "delivered" && order.stripe_transfer_status !== "paid")) {
      const payoutState = getPayoutState(order.status, order.stripe_transfer_id, order.stripe_transfer_status);
      items.push(
        createPlatformInboxItem({
          id: `vendor-${order.id}-payout`,
          eventKey: "payout.reconciliation_updated",
          audience: "vendor",
          tone: payoutAnomaly?.tone === "danger" ? "danger" : "warning",
          title: `Payout update for ${order.order_number}`,
          description: payoutAnomaly?.description ?? payoutState.description,
          createdAt: order.updated_at,
          href: `/vendor/orders/${order.id}`,
          actionLabel: "Review payout state",
          templateContext: {
            orderNumber: order.order_number,
            payoutLabel: payoutAnomaly?.label ?? payoutState.label,
            route: `/vendor/orders/${order.id}`,
            storeName: store.name,
          },
        })
      );
    }

    if (
      order.status === "delivery_failed" ||
      order.status === "reshipping" ||
      order.status === "return_initiated" ||
      order.status === "return_approved" ||
      order.status === "return_in_transit" ||
      order.status === "return_received"
    ) {
      items.push(
        createPlatformInboxItem({
          id: `vendor-${order.id}-${order.status}`,
          eventKey: "order.exception_opened",
          audience: "vendor",
          tone: order.status === "delivery_failed" ? "danger" : "warning",
          title: `Order ${order.order_number} needs follow-up`,
          description: `This order is in ${order.status.replaceAll("_", " ")} and needs vendor-side recovery handling.`,
          createdAt: order.updated_at,
          href: `/vendor/orders/${order.id}`,
          actionLabel: "Open order",
          templateContext: {
            orderNumber: order.order_number,
            orderStatus: order.status.replaceAll("_", " "),
            route: `/vendor/orders/${order.id}`,
            storeName: store.name,
          },
        })
      );
    }
  }

  for (const dispute of disputes.filter((entry) => isActiveDispute(entry.status))) {
    items.push(
      createPlatformInboxItem({
        id: `vendor-dispute-${dispute.id}`,
        eventKey: "dispute.status_changed",
        audience: "vendor",
        tone: getDisputeInboxTone(dispute.priority, dispute.created_at, dispute.status),
        title: `Dispute update for ${dispute.order?.order_number ?? "an order"}`,
        description: `${dispute.summary} ${getRefundDecisionLabel(dispute.refund_decision)} and ${getPayoutHoldLabel(dispute.payout_hold_status)}.`,
        createdAt: dispute.updated_at,
        href: "/vendor/settings",
        actionLabel: "Review dispute posture",
        templateContext: {
          disputePriority: dispute.priority,
          disputeStatus: dispute.status.replaceAll("_", " "),
          orderNumber: dispute.order?.order_number ?? null,
          route: "/vendor/settings",
          storeName: dispute.store?.name ?? store.name,
        },
      })
    );
  }

  for (const action of moderationActions) {
    const metadata = action.metadata && typeof action.metadata === "object" ? action.metadata : {};
    const outcome =
      typeof metadata.nextStatus === "string"
        ? metadata.nextStatus.replaceAll("_", " ")
        : action.action.replaceAll(".", " ");

    items.push(
      createPlatformInboxItem({
        id: `vendor-moderation-${action.id}`,
        eventKey: "moderation.review_completed",
        audience: "vendor",
        tone: outcome.includes("suspended") || outcome.includes("rejected") ? "danger" : "info",
        title: `Moderation update for ${store.name}`,
        description: action.reason?.trim() || `Marketplace governance recorded ${outcome} for this storefront.`,
        createdAt: action.created_at,
        href: "/vendor/settings",
        actionLabel: "Review store status",
        templateContext: {
          moderationEntity: store.name,
          moderationOutcome: outcome,
          moderationReason: action.reason,
          route: "/vendor/settings",
          storeName: store.name,
        },
      })
    );
  }

  return items
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 5);
}

function buildAdminPreviewItems({
  orders,
  disputes,
  moderationActions,
}: {
  orders: DigestOrder[];
  disputes: DigestDispute[];
  moderationActions: DigestModerationAction[];
}) {
  const items: PlatformInboxItem[] = [];

  for (const dispute of disputes.filter((entry) => isActiveDispute(entry.status))) {
    const sla = getDisputeSlaState(dispute.created_at, dispute.priority, dispute.status);
    items.push(
      createPlatformInboxItem({
        id: `admin-dispute-${dispute.id}`,
        eventKey: "dispute.status_changed",
        audience: "admin",
        tone: getDisputeInboxTone(dispute.priority, dispute.created_at, dispute.status),
        title: `${dispute.order?.order_number ?? "Dispute case"} is ${sla.label}`,
        description: `${dispute.summary} ${getRefundDecisionLabel(dispute.refund_decision)} and ${getPayoutHoldLabel(dispute.payout_hold_status)}.`,
        createdAt: dispute.updated_at,
        href: "/admin/disputes",
        actionLabel: "Open dispute queue",
        templateContext: {
          disputePriority: dispute.priority,
          disputeStatus: dispute.status.replaceAll("_", " "),
          orderNumber: dispute.order?.order_number ?? null,
          route: "/admin/disputes",
          storeName: dispute.store?.name ?? null,
        },
      })
    );
  }

  for (const order of orders) {
    const payoutAnomaly = getPayoutAnomaly(
      order.status,
      order.stripe_transfer_id,
      order.stripe_transfer_status,
      order.payout_reconciled_at
    );

    if (payoutAnomaly || (order.status === "delivered" && order.stripe_transfer_status !== "paid")) {
      const payoutState = getPayoutState(order.status, order.stripe_transfer_id, order.stripe_transfer_status);
      items.push(
        createPlatformInboxItem({
          id: `admin-order-${order.id}-payout`,
          eventKey: "payout.reconciliation_updated",
          audience: "admin",
          tone: payoutAnomaly?.tone === "danger" ? "danger" : "warning",
          title: `Settlement follow-up for ${order.order_number}`,
          description: payoutAnomaly?.description ?? payoutState.description,
          createdAt: order.updated_at,
          href: "/admin/orders",
          actionLabel: "Review finance queue",
          templateContext: {
            orderNumber: order.order_number,
            payoutLabel: payoutAnomaly?.label ?? payoutState.label,
            route: "/admin/orders",
            storeName: order.store?.name ?? null,
          },
        })
      );
    }
  }

  for (const action of moderationActions) {
    const metadata = action.metadata && typeof action.metadata === "object" ? action.metadata : {};
    const entityLabel =
      typeof metadata.storeName === "string"
        ? metadata.storeName
        : typeof metadata.productName === "string"
          ? metadata.productName
          : action.entity_type;
    const outcome =
      typeof metadata.nextState === "string"
        ? metadata.nextState.replaceAll("_", " ")
        : typeof metadata.nextStatus === "string"
          ? metadata.nextStatus.replaceAll("_", " ")
          : action.action.replaceAll(".", " ");

    items.push(
      createPlatformInboxItem({
        id: `admin-moderation-${action.id}`,
        eventKey: "moderation.review_completed",
        audience: "admin",
        tone: outcome.includes("hidden") || outcome.includes("rejected") || outcome.includes("suspended") ? "warning" : "info",
        title: `Moderation update: ${entityLabel}`,
        description: action.reason?.trim() || `Governance recorded ${outcome} for this queue item.`,
        createdAt: action.created_at,
        href: "/admin/moderation",
        actionLabel: "Open moderation queue",
        templateContext: {
          moderationEntity: entityLabel,
          moderationOutcome: outcome,
          moderationReason: action.reason,
          route: "/admin/moderation",
        },
      })
    );
  }

  return items
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, 5);
}

export async function resolveDigestDeliveryPolicy(
  supabase: SupabaseClient,
  profile: DigestProfile,
  store?: DigestStore | null
): Promise<PlatformDigestDeliveryPolicy> {
  if (profile.role === "vendor") {
    const supportEmail =
      store?.settings && typeof store.settings === "object" && typeof store.settings.supportEmail === "string"
        ? store.settings.supportEmail
        : null;
    const recipients = uniqueRecipients([profile.email, supportEmail]);

    return {
      mode: "policy",
      label: "Store ops policy",
      summary:
        recipients.length > 1
          ? "Digest delivery will reach the store owner and the configured support inbox."
          : "Digest delivery will reach the primary vendor inbox until more storefront recipients are configured.",
      recipients,
    };
  }

  const envRecipients = uniqueRecipients(
    (process.env.ADMIN_DIGEST_EMAILS ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
  );

  if (envRecipients.length > 0) {
    return {
      mode: "policy",
      label: "Admin team policy",
      summary: "Digest delivery is pinned to the ADMIN_DIGEST_EMAILS operator list.",
      recipients: envRecipients,
    };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("email")
    .eq("role", "admin");

  if (error) {
    throw new Error(error.message);
  }

  const recipients = uniqueRecipients((data ?? []).map((entry) => entry.email));

  return {
    mode: "policy",
    label: "Admin team policy",
    summary:
      recipients.length > 0
        ? "Digest delivery falls back to all current admin accounts because no dedicated admin digest list is configured."
        : "No admin digest recipients are configured yet. Add ADMIN_DIGEST_EMAILS or ensure admin profiles have valid emails.",
    recipients,
  };
}

export async function getDigestPayloadForProfile(
  supabase: SupabaseClient,
  profile: DigestProfile
): Promise<PlatformDigestPayload> {
  const emailDeliveryAvailable = getEmailDeliveryAvailable();

  if (profile.role === "vendor") {
    const { data: store } = await supabase
      .from("stores")
      .select("id, name, slug, status, settings")
      .eq("owner_id", profile.id)
      .single();

    if (!store) {
      const deliveryPolicy = await resolveDigestDeliveryPolicy(supabase, profile, null);
      return createVendorDigest({
        storeName: "Vendor operations",
        exceptionOrders: 0,
        openDisputes: 0,
        outstandingSettlements: 0,
        anomalyCount: 0,
        unreadInbox: 0,
        inboxPreview: [],
        emailDeliveryAvailable,
        deliveryPolicy,
      });
    }

    const currentStore = store as DigestStore;
    const [ordersRes, disputesRes, moderationRes, states, deliveryPolicy] = await Promise.all([
      supabase
        .from("orders")
        .select("id, order_number, status, updated_at, stripe_transfer_id, stripe_transfer_status, payout_reconciled_at, store:stores(name, slug)")
        .eq("store_id", currentStore.id)
        .order("updated_at", { ascending: false })
        .limit(20),
      supabase
        .from("dispute_cases")
        .select("id, status, priority, summary, created_at, updated_at, refund_decision, payout_hold_status, assigned_admin_id, order:orders(order_number), store:stores(name, slug)")
        .eq("store_id", currentStore.id)
        .order("updated_at", { ascending: false })
        .limit(10),
      supabase
        .from("admin_actions")
        .select("id, action, entity_type, entity_id, reason, metadata, created_at")
        .eq("entity_type", "vendor")
        .eq("entity_id", currentStore.id)
        .order("created_at", { ascending: false })
        .limit(3),
      fetchDigestNotificationStates(supabase, profile.id),
      resolveDigestDeliveryPolicy(supabase, profile, currentStore),
    ]);

    if (ordersRes.error || disputesRes.error || moderationRes.error) {
      throw new Error(ordersRes.error?.message ?? disputesRes.error?.message ?? moderationRes.error?.message ?? "Unable to build vendor digest.");
    }

    const orders = normalizeOrders(
      ((ordersRes.data ?? []) as Array<
        Omit<DigestOrder, "store"> & { store: DigestOrder["store"] | DigestOrder["store"][] }
      >)
    );
    const disputes = normalizeDisputes(
      ((disputesRes.data ?? []) as Array<
        Omit<DigestDispute, "order" | "store"> & {
          order: DigestDispute["order"] | DigestDispute["order"][];
          store: DigestDispute["store"] | DigestDispute["store"][];
        }
      >)
    );
    const moderationActions = (moderationRes.data ?? []) as DigestModerationAction[];
    const preview = applyNotificationStateToItems(
      buildVendorPreviewItems({ store: currentStore, orders, disputes, moderationActions }),
      states
    );
    const summary = summarizeInboxItems(preview);

    return createVendorDigest({
      storeName: currentStore.name,
      exceptionOrders: orders.filter((order) =>
        ["delivery_failed", "reshipping", "return_initiated", "return_approved", "return_in_transit", "return_received"].includes(order.status)
      ).length,
      openDisputes: disputes.filter((dispute) => isActiveDispute(dispute.status)).length,
      outstandingSettlements: orders.filter((order) => order.status === "delivered" && order.stripe_transfer_status !== "paid").length,
      anomalyCount: orders.filter((order) =>
        Boolean(getPayoutAnomaly(order.status, order.stripe_transfer_id, order.stripe_transfer_status, order.payout_reconciled_at))
      ).length,
      unreadInbox: summary.unread,
      inboxPreview: preview,
      emailDeliveryAvailable,
      deliveryPolicy,
    });
  }

  if (profile.role !== "admin") {
    throw new Error("Digest access is limited to vendor and admin operators.");
  }

  const [ordersRes, disputesRes, moderationRes, hiddenReviewsRes, pendingVendorsRes, states, deliveryPolicy] = await Promise.all([
    supabase
      .from("orders")
      .select("id, order_number, status, updated_at, stripe_transfer_id, stripe_transfer_status, payout_reconciled_at, store:stores(name, slug)")
      .order("updated_at", { ascending: false })
      .limit(24),
    supabase
      .from("dispute_cases")
      .select("id, status, priority, summary, created_at, updated_at, refund_decision, payout_hold_status, assigned_admin_id, order:orders(order_number), store:stores(name, slug)")
      .order("updated_at", { ascending: false })
      .limit(16),
    supabase
      .from("admin_actions")
      .select("id, action, entity_type, entity_id, reason, metadata, created_at")
      .in("entity_type", ["vendor", "product", "review"])
      .order("created_at", { ascending: false })
      .limit(6),
    supabase.from("reviews").select("*", { count: "exact", head: true }).eq("is_visible", false),
    supabase.from("stores").select("*", { count: "exact", head: true }).eq("status", "pending"),
    fetchDigestNotificationStates(supabase, profile.id),
    resolveDigestDeliveryPolicy(supabase, profile, null),
  ]);

  if (ordersRes.error || disputesRes.error || moderationRes.error || hiddenReviewsRes.error || pendingVendorsRes.error) {
    throw new Error(
      ordersRes.error?.message ??
        disputesRes.error?.message ??
        moderationRes.error?.message ??
        hiddenReviewsRes.error?.message ??
        pendingVendorsRes.error?.message ??
        "Unable to build admin digest."
    );
  }

  const orders = normalizeOrders(
    ((ordersRes.data ?? []) as Array<
      Omit<DigestOrder, "store"> & { store: DigestOrder["store"] | DigestOrder["store"][] }
    >)
  );
  const disputes = normalizeDisputes(
    ((disputesRes.data ?? []) as Array<
      Omit<DigestDispute, "order" | "store"> & {
        order: DigestDispute["order"] | DigestDispute["order"][];
        store: DigestDispute["store"] | DigestDispute["store"][];
      }
    >)
  );
  const moderationActions = (moderationRes.data ?? []) as DigestModerationAction[];
  const preview = applyNotificationStateToItems(
    buildAdminPreviewItems({ orders, disputes, moderationActions }),
    states
  );
  const summary = summarizeInboxItems(preview);
  const activeDisputes = disputes.filter((dispute) => isActiveDispute(dispute.status));

  return createAdminDigest({
    openDisputes: activeDisputes.length,
    slaBreaches: activeDisputes.filter((dispute) => getDisputeSlaState(dispute.created_at, dispute.priority, dispute.status).tone === "danger").length,
    unassignedDisputes: activeDisputes.filter((dispute) => !dispute.assigned_admin_id).length,
    moderationBacklog: (pendingVendorsRes.count ?? 0) + (hiddenReviewsRes.count ?? 0),
    payoutAlerts: orders.filter((order) => order.status === "delivered" && order.stripe_transfer_status !== "paid").length,
    unreadInbox: summary.unread,
    inboxPreview: preview,
    emailDeliveryAvailable,
    deliveryPolicy,
  });
}

export async function sendDigestForProfile({
  supabase,
  profile,
  scope,
}: {
  supabase: SupabaseClient;
  profile: DigestProfile;
  scope: "self" | "policy";
}) {
  const digest = await getDigestPayloadForProfile(supabase, profile);
  const recipients = scope === "policy" ? digest.deliveryPolicy.recipients : uniqueRecipients([profile.email]);

  if (recipients.length === 0) {
    throw new Error("No digest recipients are configured for this operator policy.");
  }

  await Promise.all(recipients.map((to) => sendPlatformDigestEmail({ to, digest })));

  return {
    recipientCount: recipients.length,
    recipients,
    digest,
  };
}
