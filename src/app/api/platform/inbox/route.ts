import { NextResponse } from "next/server";
import { getDisputeSlaState, isActiveDispute } from "@/lib/admin/governance";
import {
  createInboxPayload,
  createPlatformInboxItem,
  getDisputeInboxTone,
  getOrderRecoveryMessage,
  getPayoutHoldLabel,
  getRefundDecisionLabel,
} from "@/lib/platform/notifications";
import { getPayoutAnomaly, getPayoutState } from "@/lib/orders/payout-state";
import { renderOrderCommunicationTemplate } from "@/lib/orders/communication-templates";
import { orderStatusCopy } from "@/lib/orders/status-copy";
import { getStoreProfileContent } from "@/lib/storefront/store-profile";
import { getSupabaseServerClient, getServerUser } from "@/lib/supabase/server";
import type { AdminAction, DisputeCase, Profile, Store } from "@/types";
import type { Order } from "@/types/orders";

type InboxProfile = Pick<Profile, "id" | "role" | "full_name" | "email">;
type InboxStore = Pick<Store, "id" | "name" | "slug" | "status" | "settings">;
type BuyerOrderRecord = Pick<
  Order,
  "id" | "order_number" | "status" | "created_at" | "updated_at" | "tracking_number" | "tracking_url"
> & {
  store: Pick<Store, "name" | "slug" | "settings"> | null;
};
type VendorOrderRecord = Pick<
  Order,
  | "id"
  | "order_number"
  | "status"
  | "created_at"
  | "updated_at"
  | "tracking_number"
  | "tracking_url"
  | "stripe_transfer_id"
  | "stripe_transfer_status"
  | "payout_reconciled_at"
> & {
  store: Pick<Store, "name" | "slug" | "settings"> | null;
};
type DisputeRecord = Pick<
  DisputeCase,
  | "id"
  | "status"
  | "priority"
  | "summary"
  | "created_at"
  | "updated_at"
  | "refund_decision"
  | "payout_hold_status"
> & {
  order: Pick<Order, "order_number"> | null;
  store: Pick<Store, "name" | "slug"> | null;
};
type ModerationActionRecord = Pick<
  AdminAction,
  "id" | "action" | "entity_type" | "entity_id" | "reason" | "metadata" | "created_at"
>;

function unwrapRelation<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function normalizeBuyerOrders(data: Array<Omit<BuyerOrderRecord, "store"> & { store: BuyerOrderRecord["store"] | BuyerOrderRecord["store"][] }>) {
  return data.map((entry) => ({
    ...entry,
    store: unwrapRelation(entry.store),
  }));
}

function normalizeVendorOrders(data: Array<Omit<VendorOrderRecord, "store"> & { store: VendorOrderRecord["store"] | VendorOrderRecord["store"][] }>) {
  return data.map((entry) => ({
    ...entry,
    store: unwrapRelation(entry.store),
  }));
}

function normalizeDisputes(
  data: Array<
    Omit<DisputeRecord, "order" | "store"> & {
      order: DisputeRecord["order"] | DisputeRecord["order"][];
      store: DisputeRecord["store"] | DisputeRecord["store"][];
    }
  >
) {
  return data.map((entry) => ({
    ...entry,
    order: unwrapRelation(entry.order),
    store: unwrapRelation(entry.store),
  }));
}

function normalizeActionLabel(action: string) {
  return action.replaceAll(".", " ").replaceAll("_", " ");
}

function toNotificationTone(
  tone: "warning" | "danger" | "muted" | "default" | "success"
) {
  switch (tone) {
    case "danger":
      return "danger";
    case "warning":
      return "warning";
    case "muted":
      return "muted";
    case "success":
      return "success";
    default:
      return "info";
  }
}

function buildBuyerItems(orders: BuyerOrderRecord[]) {
  return orders.flatMap((order) => {
    const href = `/account/orders/${order.id}`;
    const profile = order.store ? getStoreProfileContent(order.store) : null;

    if (
      order.status === "reshipping" ||
      order.status === "return_initiated" ||
      order.status === "return_approved" ||
      order.status === "return_in_transit" ||
      order.status === "return_received"
    ) {
      return [
        createPlatformInboxItem({
          id: `buyer-${order.id}-${order.status}`,
          eventKey: "order.exception_opened",
          audience: "buyer",
          tone: order.status === "return_received" ? "info" : "warning",
          title:
            order.status === "reshipping"
              ? `${order.store?.name ?? "Vendor"} is arranging a replacement shipment`
              : `Return progress updated for ${order.order_number}`,
          description: renderOrderCommunicationTemplate(order.status, profile, {
            orderNumber: order.order_number,
            storeName: order.store?.name ?? null,
            supportEmail: profile?.supportEmail,
            trackingNumber: order.tracking_number,
            trackingUrl: order.tracking_url,
            returnsPolicy: profile?.returnsPolicy,
            processingTime: profile?.processingTime,
          }),
          createdAt: order.updated_at,
          href,
          actionLabel: "Review order",
          templateContext: {
            orderNumber: order.order_number,
            orderStatus: order.status.replaceAll("_", " "),
            route: href,
            storeName: order.store?.name ?? null,
            supportEmail: profile?.supportEmail,
          },
        }),
      ];
    }

    if (order.status === "delivery_failed") {
      const recovery = getOrderRecoveryMessage({
        audience: "buyer",
        status: order.status,
        storeName: order.store?.name ?? null,
        supportEmail: profile?.supportEmail,
      });

      return [
        createPlatformInboxItem({
          id: `buyer-${order.id}-delivery_failed`,
          eventKey: "order.exception_opened",
          audience: "buyer",
          tone: "warning",
          title: `Delivery follow-up is active for ${order.order_number}`,
          description: recovery?.description ?? orderStatusCopy[order.status].buyerMessage,
          createdAt: order.updated_at,
          href,
          actionLabel: "View recovery plan",
          templateContext: {
            orderNumber: order.order_number,
            orderStatus: order.status.replaceAll("_", " "),
            route: href,
            storeName: order.store?.name ?? null,
            supportEmail: profile?.supportEmail,
          },
        }),
      ];
    }

    if (["shipped", "out_for_delivery", "delivered"].includes(order.status)) {
      return [
        createPlatformInboxItem({
          id: `buyer-${order.id}-${order.status}`,
          eventKey: "order.status_updated",
          audience: "buyer",
          tone: order.status === "delivered" ? "success" : "info",
          title:
            order.status === "delivered"
              ? `${order.order_number} was delivered`
              : `${order.order_number} is now ${orderStatusCopy[order.status].label.toLowerCase()}`,
          description: orderStatusCopy[order.status].buyerMessage,
          createdAt: order.updated_at,
          href,
          actionLabel: order.tracking_url ? "Track order" : "View order",
          templateContext: {
            orderNumber: order.order_number,
            orderStatus: orderStatusCopy[order.status].label,
            route: href,
            storeName: order.store?.name ?? null,
          },
        }),
      ];
    }

    return [];
  });
}

function buildVendorItems({
  disputes,
  moderationActions,
  orders,
  store,
}: {
  disputes: DisputeRecord[];
  moderationActions: ModerationActionRecord[];
  orders: VendorOrderRecord[];
  store: InboxStore;
}) {
  const items = [];

  for (const order of orders) {
    const href = `/vendor/orders/${order.id}`;
    const profile = order.store ? getStoreProfileContent(order.store) : null;
    const anomaly = getPayoutAnomaly(
      order.status,
      order.stripe_transfer_id,
      order.stripe_transfer_status,
      order.payout_reconciled_at
    );

    if (
      order.status === "delivery_failed" ||
      order.status === "reshipping" ||
      order.status === "return_initiated" ||
      order.status === "return_approved" ||
      order.status === "return_in_transit" ||
      order.status === "return_received"
    ) {
      const recovery = getOrderRecoveryMessage({
        audience: "vendor",
        status: order.status,
        storeName: store.name,
        supportEmail: profile?.supportEmail,
      });

      items.push(
        createPlatformInboxItem({
          id: `vendor-${order.id}-${order.status}`,
          eventKey: "order.exception_opened",
          audience: "vendor",
          tone: order.status === "delivery_failed" ? "danger" : "warning",
          title: `Order ${order.order_number} needs recovery follow-up`,
          description: recovery?.description ?? orderStatusCopy[order.status].vendorMessage,
          createdAt: order.updated_at,
          href,
          actionLabel: "Open order",
          templateContext: {
            orderNumber: order.order_number,
            orderStatus: order.status.replaceAll("_", " "),
            route: href,
            storeName: store.name,
            supportEmail: profile?.supportEmail,
          },
        })
      );
    }

    if (anomaly || (order.status === "delivered" && order.stripe_transfer_status !== "paid")) {
      const payoutState = getPayoutState(
        order.status,
        order.stripe_transfer_id,
        order.stripe_transfer_status
      );

      items.push(
        createPlatformInboxItem({
          id: `vendor-${order.id}-payout`,
          eventKey: "payout.reconciliation_updated",
          audience: "vendor",
          tone: anomaly ? toNotificationTone(anomaly.tone) : toNotificationTone(payoutState.tone),
          title: `Payout update for ${order.order_number}`,
          description: anomaly?.description ?? payoutState.description,
          createdAt: order.updated_at,
          href,
          actionLabel: "Review payout state",
          templateContext: {
            orderNumber: order.order_number,
            payoutLabel: anomaly?.label ?? payoutState.label,
            route: href,
            storeName: store.name,
          },
        })
      );
    }
  }

  for (const dispute of disputes.filter((entry) => isActiveDispute(entry.status))) {
    const href = "/vendor/settings";
    items.push(
      createPlatformInboxItem({
        id: `vendor-dispute-${dispute.id}`,
        eventKey: "dispute.status_changed",
        audience: "vendor",
        tone: getDisputeInboxTone(dispute.priority, dispute.created_at, dispute.status),
        title: `Dispute update for ${dispute.order?.order_number ?? "an order"}`,
        description: `${dispute.summary} This case is ${dispute.status.replaceAll("_", " ")} with ${getRefundDecisionLabel(dispute.refund_decision)} and ${getPayoutHoldLabel(dispute.payout_hold_status)}.`,
        createdAt: dispute.updated_at,
        href,
        actionLabel: "Review dispute posture",
        templateContext: {
          disputePriority: dispute.priority,
          disputeStatus: dispute.status.replaceAll("_", " "),
          orderNumber: dispute.order?.order_number ?? null,
          route: href,
          storeName: dispute.store?.name ?? store.name,
        },
      })
    );
  }

  for (const action of moderationActions) {
    const metadata = action.metadata && typeof action.metadata === "object" ? action.metadata : {};
    const moderationOutcome =
      typeof metadata.nextStatus === "string"
        ? metadata.nextStatus.replaceAll("_", " ")
        : normalizeActionLabel(action.action);

    items.push(
      createPlatformInboxItem({
        id: `vendor-moderation-${action.id}`,
        eventKey: "moderation.review_completed",
        audience: "vendor",
        tone: moderationOutcome.includes("suspended") || moderationOutcome.includes("rejected") ? "danger" : "info",
        title: `Moderation update for ${store.name}`,
        description: action.reason?.trim() || `Marketplace governance recorded ${moderationOutcome} for this storefront.`,
        createdAt: action.created_at,
        href: "/vendor/settings",
        actionLabel: "Review store status",
        templateContext: {
          moderationEntity: store.name,
          moderationOutcome,
          moderationReason: action.reason,
          route: "/vendor/settings",
          storeName: store.name,
        },
      })
    );
  }

  return items;
}

function buildAdminItems({
  disputes,
  moderationActions,
  orders,
}: {
  disputes: DisputeRecord[];
  moderationActions: ModerationActionRecord[];
  orders: VendorOrderRecord[];
}) {
  const items = [];

  for (const dispute of disputes.filter((entry) => isActiveDispute(entry.status))) {
    const sla = getDisputeSlaState(dispute.created_at, dispute.priority, dispute.status);
    items.push(
      createPlatformInboxItem({
        id: `admin-dispute-${dispute.id}`,
        eventKey: "dispute.status_changed",
        audience: "admin",
        tone: getDisputeInboxTone(dispute.priority, dispute.created_at, dispute.status),
        title: `${dispute.order?.order_number ?? "Dispute case"} is ${sla.label}`,
        description: `${dispute.summary} Status: ${dispute.status.replaceAll("_", " ")}. ${getRefundDecisionLabel(dispute.refund_decision)} and ${getPayoutHoldLabel(dispute.payout_hold_status)}.`,
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
          id: `admin-order-${order.id}-${order.status}`,
          eventKey: "order.exception_opened",
          audience: "admin",
          tone: order.status === "delivery_failed" ? "danger" : "warning",
          title: `Order ${order.order_number} needs intervention`,
          description: `This order is in ${order.status.replaceAll("_", " ")} and may need marketplace oversight if vendor follow-up stalls.`,
          createdAt: order.updated_at,
          href: "/admin/orders",
          actionLabel: "Review order queue",
          templateContext: {
            orderNumber: order.order_number,
            orderStatus: order.status.replaceAll("_", " "),
            route: "/admin/orders",
            storeName: order.store?.name ?? null,
          },
        })
      );
    }

    if (payoutAnomaly || (order.status === "delivered" && order.stripe_transfer_status !== "paid")) {
      const payoutState = getPayoutState(
        order.status,
        order.stripe_transfer_id,
        order.stripe_transfer_status
      );

      items.push(
        createPlatformInboxItem({
          id: `admin-order-${order.id}-payout`,
          eventKey: "payout.reconciliation_updated",
          audience: "admin",
          tone: payoutAnomaly ? toNotificationTone(payoutAnomaly.tone) : toNotificationTone(payoutState.tone),
          title: `Settlement follow-up for ${order.order_number}`,
          description: payoutAnomaly?.description ?? payoutState.description,
          createdAt: order.updated_at,
          href: "/admin/orders",
          actionLabel: "Open finance review",
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
    const moderationOutcome =
      typeof metadata.nextState === "string"
        ? metadata.nextState.replaceAll("_", " ")
        : typeof metadata.nextStatus === "string"
          ? metadata.nextStatus.replaceAll("_", " ")
          : normalizeActionLabel(action.action);

    items.push(
      createPlatformInboxItem({
        id: `admin-moderation-${action.id}`,
        eventKey: "moderation.review_completed",
        audience: "admin",
        tone:
          moderationOutcome.includes("suspended") || moderationOutcome.includes("hidden") || moderationOutcome.includes("rejected")
            ? "warning"
            : "info",
        title: `Moderation update: ${entityLabel}`,
        description: action.reason?.trim() || `Governance recorded ${moderationOutcome} for this queue item.`,
        createdAt: action.created_at,
        href: "/admin/moderation",
        actionLabel: "Open moderation queue",
        templateContext: {
          moderationEntity: entityLabel,
          moderationOutcome,
          moderationReason: action.reason,
          route: "/admin/moderation",
        },
      })
    );
  }

  return items;
}

export async function GET() {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await getSupabaseServerClient();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, full_name, email")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: profileError?.message ?? "Profile unavailable" }, { status: 400 });
  }

  const currentProfile = profile as InboxProfile;

  if (currentProfile.role === "buyer") {
    const { data, error } = await supabase
      .from("orders")
      .select("id, order_number, status, created_at, updated_at, tracking_number, tracking_url, store:stores(name, slug, settings)")
      .eq("buyer_id", currentProfile.id)
      .order("updated_at", { ascending: false })
      .limit(12);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      createInboxPayload(
        buildBuyerItems(
          normalizeBuyerOrders(
            ((data ?? []) as unknown as Array<
              Omit<BuyerOrderRecord, "store"> & { store: BuyerOrderRecord["store"] | BuyerOrderRecord["store"][] }
            >)
          )
        ).slice(0, 8)
      )
    );
  }

  if (currentProfile.role === "vendor") {
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("id, name, slug, status, settings")
      .eq("owner_id", currentProfile.id)
      .single();

    if (storeError || !store) {
      return NextResponse.json(createInboxPayload([]));
    }

    const currentStore = store as InboxStore;
    const [ordersRes, disputesRes, moderationRes] = await Promise.all([
      supabase
        .from("orders")
        .select("id, order_number, status, created_at, updated_at, tracking_number, tracking_url, stripe_transfer_id, stripe_transfer_status, payout_reconciled_at, store:stores(name, slug, settings)")
        .eq("store_id", currentStore.id)
        .order("updated_at", { ascending: false })
        .limit(12),
      supabase
        .from("dispute_cases")
        .select("id, status, priority, summary, created_at, updated_at, refund_decision, payout_hold_status, order:orders(order_number), store:stores(name, slug)")
        .eq("store_id", currentStore.id)
        .order("updated_at", { ascending: false })
        .limit(8),
      supabase
        .from("admin_actions")
        .select("id, action, entity_type, entity_id, reason, metadata, created_at")
        .eq("entity_type", "vendor")
        .eq("entity_id", currentStore.id)
        .order("created_at", { ascending: false })
        .limit(3),
    ]);

    const firstError = [ordersRes.error, disputesRes.error, moderationRes.error].find(Boolean);
    if (firstError) {
      return NextResponse.json({ error: firstError.message }, { status: 400 });
    }

    return NextResponse.json(
      createInboxPayload(
        buildVendorItems({
          orders: normalizeVendorOrders(
            ((ordersRes.data ?? []) as unknown as Array<
              Omit<VendorOrderRecord, "store"> & { store: VendorOrderRecord["store"] | VendorOrderRecord["store"][] }
            >)
          ),
          disputes: normalizeDisputes(
            ((disputesRes.data ?? []) as unknown as Array<
              Omit<DisputeRecord, "order" | "store"> & {
                order: DisputeRecord["order"] | DisputeRecord["order"][];
                store: DisputeRecord["store"] | DisputeRecord["store"][];
              }
            >)
          ),
          moderationActions: (moderationRes.data ?? []) as ModerationActionRecord[],
          store: currentStore,
        }).slice(0, 10)
      )
    );
  }

  const [ordersRes, disputesRes, moderationRes] = await Promise.all([
    supabase
      .from("orders")
      .select("id, order_number, status, created_at, updated_at, tracking_number, tracking_url, stripe_transfer_id, stripe_transfer_status, payout_reconciled_at, store:stores(name, slug, settings)")
      .order("updated_at", { ascending: false })
      .limit(14),
    supabase
      .from("dispute_cases")
      .select("id, status, priority, summary, created_at, updated_at, refund_decision, payout_hold_status, order:orders(order_number), store:stores(name, slug)")
      .order("updated_at", { ascending: false })
      .limit(10),
    supabase
      .from("admin_actions")
      .select("id, action, entity_type, entity_id, reason, metadata, created_at")
      .in("entity_type", ["vendor", "product", "review"])
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const firstError = [ordersRes.error, disputesRes.error, moderationRes.error].find(Boolean);
  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 400 });
  }

  return NextResponse.json(
    createInboxPayload(
      buildAdminItems({
        orders: normalizeVendorOrders(
          ((ordersRes.data ?? []) as unknown as Array<
            Omit<VendorOrderRecord, "store"> & { store: VendorOrderRecord["store"] | VendorOrderRecord["store"][] }
          >)
        ),
        disputes: normalizeDisputes(
          ((disputesRes.data ?? []) as unknown as Array<
            Omit<DisputeRecord, "order" | "store"> & {
              order: DisputeRecord["order"] | DisputeRecord["order"][];
              store: DisputeRecord["store"] | DisputeRecord["store"][];
            }
          >)
        ),
        moderationActions: (moderationRes.data ?? []) as ModerationActionRecord[],
      }).slice(0, 12)
    )
  );
}
