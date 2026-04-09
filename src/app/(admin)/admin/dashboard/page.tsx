"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Clock3, DollarSign, EyeOff, Package, Scale, ShieldAlert, ShoppingCart, Store, TrendingUp, Users } from "lucide-react";
import { EventScaffoldPanel } from "@/components/platform/event-scaffold-panel";
import { LaunchReadinessPanel } from "@/components/platform/launch-readiness-panel";
import { DelayDigestPanel } from "@/components/platform/delay-digest-panel";
import { PlatformInboxPanel } from "@/components/platform/platform-inbox-panel";
import { AutomationOpsPanel } from "@/components/platform/automation-ops-panel";
import { Card } from "@/components/ui/card";
import { PageIntro, PageTransition } from "@/components/ui/page-shell";
import { SkeletonBlock, StatePanel } from "@/components/ui/state-panel";
import { usePlatformReadiness } from "@/hooks/use-platform-readiness";
import { getDisputeSlaState, isActiveDispute } from "@/lib/admin/governance";
import { getDisputeEscalationMessage, getModerationEscalationMessage } from "@/lib/platform/notifications";
import { isExceptionStatus, isReturnStatus } from "@/lib/orders/operations-metrics";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/utils/constants";
import type { Order } from "@/types/orders";
import type { Store as StoreType } from "@/types";

type AdminOrderSummary = Pick<Order, "total" | "status" | "store_id" | "stripe_transfer_status">;
type AdminStoreSummary = Pick<StoreType, "id" | "name" | "slug" | "status">;
type AdminDisputeSummary = {
  id: string;
  status: "open" | "investigating" | "vendor_action_required" | "refund_pending" | "resolved" | "dismissed";
  priority: "low" | "medium" | "high" | "critical";
  created_at: string;
  assigned_admin_id: string | null;
};

interface RiskQueueItem {
  storeId: string;
  storeName: string;
  storeSlug: string;
  exceptionCount: number;
  unresolvedReturns: number;
  payoutAlerts: number;
}

export default function AdminDashboard() {
  const {
    data: readinessData,
    loading: readinessLoading,
    error: readinessError,
    refetch: refetchReadiness,
  } = usePlatformReadiness();
  const [stats, setStats] = useState({
    users: 0,
    vendors: 0,
    products: 0,
    orders: 0,
    revenue: 0,
    pendingVendors: 0,
    exceptionOrders: 0,
    payoutAlerts: 0,
    unresolvedReturns: 0,
    hiddenReviews: 0,
    openDisputes: 0,
    suspendedVendors: 0,
    disputeSlaBreaches: 0,
    disputeSlaAtRisk: 0,
    unassignedDisputes: 0,
  });
  const [riskQueue, setRiskQueue] = useState<RiskQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
      setLoading(true);
      setError(null);
      const sb = getSupabaseBrowserClient();
      const [usersRes, storesRes, pendingRes, productsRes, ordersRes, hiddenReviewsRes, disputesRes] = await Promise.all([
        sb.from("profiles").select("*", { count: "exact", head: true }),
        sb.from("stores").select("id, name, slug, status"),
        sb.from("stores").select("*", { count: "exact", head: true }).eq("status", "pending"),
        sb.from("products").select("*", { count: "exact", head: true }).eq("status", "active"),
        sb.from("orders").select("total, status, store_id, stripe_transfer_status"),
        sb.from("reviews").select("*", { count: "exact", head: true }).eq("is_visible", false),
        sb.from("dispute_cases").select("id, status, priority, created_at, assigned_admin_id"),
      ]);

      const firstError = [
        usersRes.error,
        storesRes.error,
        pendingRes.error,
        productsRes.error,
        ordersRes.error,
        hiddenReviewsRes.error,
        disputesRes.error,
      ].find(Boolean);

      if (firstError) {
        setError(firstError.message);
        setRiskQueue([]);
        setLoading(false);
        return;
      }

      const orders = (ordersRes.data ?? []) as AdminOrderSummary[];
      const stores = (storesRes.data ?? []) as AdminStoreSummary[];
      const disputes = (disputesRes.data ?? []) as AdminDisputeSummary[];
      const activeDisputes = disputes.filter((dispute) => isActiveDispute(dispute.status));
      const disputeSlaBreaches = activeDisputes.filter((dispute) => getDisputeSlaState(dispute.created_at, dispute.priority, dispute.status).tone === "danger").length;
      const disputeSlaAtRisk = activeDisputes.filter((dispute) => getDisputeSlaState(dispute.created_at, dispute.priority, dispute.status).tone === "warning").length;
      const unassignedDisputes = activeDisputes.filter((dispute) => !dispute.assigned_admin_id).length;
      const revenue = orders.filter((order) => order.status === "delivered").reduce((sum, order) => sum + Number(order.total), 0);
      const exceptionOrders = orders.filter((order) => isExceptionStatus(order.status)).length;
      const unresolvedReturns = orders.filter((order) => isReturnStatus(order.status) && order.status !== "refunded").length;
      const payoutAlerts = orders.filter((order) => order.status === "delivered" && order.stripe_transfer_status !== "paid").length;

      const riskMap = new Map<string, RiskQueueItem>();
      for (const store of stores) {
        riskMap.set(store.id, {
          storeId: store.id,
          storeName: store.name,
          storeSlug: store.slug,
          exceptionCount: 0,
          unresolvedReturns: 0,
          payoutAlerts: 0,
        });
      }

      for (const order of orders) {
        const record = riskMap.get(order.store_id);
        if (!record) continue;

        if (isExceptionStatus(order.status)) {
          record.exceptionCount += 1;
        }

        if (isReturnStatus(order.status) && order.status !== "refunded") {
          record.unresolvedReturns += 1;
        }

        if (order.status === "delivered" && order.stripe_transfer_status !== "paid") {
          record.payoutAlerts += 1;
        }
      }

      setStats({
        users: usersRes.count ?? 0,
        vendors: stores.filter((store) => store.status === "approved").length,
        pendingVendors: pendingRes.count ?? 0,
        products: productsRes.count ?? 0,
        orders: orders.length,
        revenue,
        exceptionOrders,
        unresolvedReturns,
        payoutAlerts,
        hiddenReviews: hiddenReviewsRes.count ?? 0,
        openDisputes: activeDisputes.length,
        suspendedVendors: stores.filter((store) => store.status === "suspended").length,
        disputeSlaBreaches,
        disputeSlaAtRisk,
        unassignedDisputes,
      });
      setRiskQueue(
        [...riskMap.values()]
          .filter((item) => item.exceptionCount > 0 || item.unresolvedReturns > 0 || item.payoutAlerts > 0)
          .sort((left, right) => right.exceptionCount + right.unresolvedReturns + right.payoutAlerts - (left.exceptionCount + left.unresolvedReturns + left.payoutAlerts))
          .slice(0, 6)
      );
      setLoading(false);
    }, []);

  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard]);

  const kpis = [
    { label: "Total users", value: stats.users.toLocaleString(), icon: Users, color: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" },
    { label: "Active vendors", value: stats.vendors.toLocaleString(), icon: Store, color: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400", badge: stats.pendingVendors > 0 ? `${stats.pendingVendors} pending` : undefined },
    { label: "Products", value: stats.products.toLocaleString(), icon: Package, color: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400" },
    { label: "Orders", value: stats.orders.toLocaleString(), icon: ShoppingCart, color: "bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400" },
    { label: "Revenue", value: formatPrice(stats.revenue), icon: DollarSign, color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400" },
    { label: "Avg. order", value: stats.orders > 0 ? formatPrice(stats.revenue / stats.orders) : "$0", icon: TrendingUp, color: "bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400" },
  ];

  const riskCards = [
    { label: "Exception orders", value: stats.exceptionOrders, detail: "delivery failures and return flows", icon: AlertTriangle },
    { label: "Unresolved returns", value: stats.unresolvedReturns, detail: "return flows still open", icon: ShieldAlert },
    { label: "SLA breaches", value: stats.disputeSlaBreaches, detail: "disputes already outside target handling windows", icon: Clock3 },
    { label: "Payout alerts", value: stats.payoutAlerts, detail: "delivered orders not yet settled", icon: DollarSign },
  ];
  const governanceCards = [
    { label: "Open disputes", value: stats.openDisputes, detail: "cases needing investigation or refund action", icon: Scale, href: "/admin/disputes" },
    { label: "Cases at risk", value: stats.disputeSlaAtRisk, detail: "disputes close to missing their SLA", icon: Clock3, href: "/admin/disputes" },
    { label: "Unassigned cases", value: stats.unassignedDisputes, detail: "active cases still waiting for an owner", icon: ShieldAlert, href: "/admin/disputes" },
    { label: "Hidden reviews", value: stats.hiddenReviews, detail: "reviews removed from buyer-facing visibility", icon: EyeOff, href: "/admin/moderation" },
    { label: "Suspended vendors", value: stats.suspendedVendors, detail: "stores currently restricted from trading", icon: Store, href: "/admin/vendors" },
  ];
  const disputeEscalation = getDisputeEscalationMessage({
    breaches: stats.disputeSlaBreaches,
    atRisk: stats.disputeSlaAtRisk,
    unassigned: stats.unassignedDisputes,
  });
  const moderationEscalation = getModerationEscalationMessage({
    hiddenReviews: stats.hiddenReviews,
    pendingVendors: stats.pendingVendors,
  });

  if (loading) {
    return (
      <PageTransition>
        <PageIntro title="Platform overview" description="Monitor marketplace growth alongside trust, risk, and settlement health." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="space-y-3 p-5">
              <SkeletonBlock lines={3} />
            </Card>
          ))}
        </div>
      </PageTransition>
    );
  }
  if (error) {
    return (
      <PageTransition>
        <PageIntro title="Platform overview" description="Monitor marketplace growth alongside trust, risk, and settlement health." />
        <StatePanel
          title="We could not load the latest governance overview"
          description={error}
          tone="danger"
          actionLabel="Retry overview"
          onAction={() => void fetchDashboard()}
        />
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <PageIntro title="Platform overview" description="Monitor marketplace growth alongside trust, risk, and settlement health." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-widest text-stone-400">{kpi.label}</p>
              <div className={`p-2 ${kpi.color}`}><kpi.icon className="h-4 w-4" /></div>
            </div>
            <p className="mt-3 text-2xl font-medium text-stone-900 dark:text-white">{kpi.value}</p>
            {kpi.badge ? <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{kpi.badge}</p> : null}
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-stone-400">Trust and risk</p>
              <h2 className="mt-2 font-serif text-2xl text-stone-900 dark:text-white">Operational risk queue</h2>
              <p className="mt-2 text-sm text-stone-500">These stores currently show exception or payout signals worth review.</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/admin/orders"
                className="text-xs font-medium uppercase tracking-wider text-rose-700 transition-colors hover:text-rose-900 dark:text-rose-300 dark:hover:text-rose-100"
              >
                Review orders
              </Link>
              <div className="rounded-full bg-rose-50 p-3 text-rose-600 dark:bg-rose-900/20 dark:text-rose-300">
                <ShieldAlert className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {riskQueue.length === 0 ? (
              <StatePanel
                title="No stores are currently surfacing risk pressure"
                description="Exception, return, and payout alerts are clear across the marketplace right now."
                icon={ShieldAlert}
                className="border-dashed"
              />
            ) : (
              riskQueue.map((item) => (
                <div key={item.storeId} className="border border-stone-200 p-4 dark:border-stone-800">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-stone-900 dark:text-white">{item.storeName}</p>
                      <p className="mt-1 text-xs text-stone-500">/{item.storeSlug}</p>
                    </div>
                    <div className="text-right text-xs text-stone-500">
                      <p>{item.exceptionCount} exceptions</p>
                      <p>{item.unresolvedReturns} returns open</p>
                      <p>{item.payoutAlerts} payout alerts</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <div className="space-y-4">
          {riskCards.map((card) => (
            <Card key={card.label} className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-stone-400">{card.label}</p>
                  <p className="mt-3 text-2xl font-medium text-stone-900 dark:text-white">{card.value}</p>
                  <p className="mt-1 text-xs text-stone-500">{card.detail}</p>
                </div>
                <div className="rounded-full bg-stone-100 p-3 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                  <card.icon className="h-5 w-5" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {governanceCards.map((card) => (
          <Link key={card.label} href={card.href}>
            <Card className="p-5 transition-colors hover:bg-stone-50 dark:hover:bg-stone-900/80">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-stone-400">{card.label}</p>
                  <p className="mt-3 text-2xl font-medium text-stone-900 dark:text-white">{card.value}</p>
                  <p className="mt-1 text-xs text-stone-500">{card.detail}</p>
                </div>
                <div className="rounded-full bg-stone-100 p-3 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                  <card.icon className="h-5 w-5" />
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {disputeEscalation || moderationEscalation ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {disputeEscalation ? (
            <StatePanel
              title={disputeEscalation.title}
              description={disputeEscalation.description}
              tone={disputeEscalation.tone}
              actionLabel="Review disputes"
              onAction={() => {
                window.location.href = "/admin/disputes";
              }}
            />
          ) : null}
          {moderationEscalation ? (
            <StatePanel
              title={moderationEscalation.title}
              description={moderationEscalation.description}
              tone={moderationEscalation.tone}
              actionLabel="Open moderation"
              onAction={() => {
                window.location.href = "/admin/moderation";
              }}
            />
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <PlatformInboxPanel
          title="Governance inbox"
          description="Operational events that need review, assignment, or escalation before trust issues spread."
          emptyTitle="Governance inbox is clear"
          emptyDescription="Disputes, moderation actions, and settlement alerts will appear here when intervention is needed."
        />

        <DelayDigestPanel
          title="Marketplace governance digest"
          description="A role-aware delay summary for disputes, moderation pressure, and payout lag, ready to email when delivery is configured."
        />

        <AutomationOpsPanel
          title="Scheduled governance automation"
          description="Preview recurring dispute, moderation, and payout follow-up jobs, then hand finance or governance clean export snapshots."
        />

        <LaunchReadinessPanel
          title="Platform launch controls"
          description="Track configuration health for checkout, payouts, content, and privileged governance workflows before issues reach customers or operators."
          audience="admin"
          checks={readinessData?.checks ?? []}
          loading={readinessLoading}
          error={readinessError}
          onRetry={() => void refetchReadiness()}
        />

        <EventScaffoldPanel
          title="Automation and notification groundwork"
          description="These marketplace events now feed the in-app inbox and share email-ready boundaries for future delivery automation."
          audience="admin"
          events={readinessData?.events ?? []}
          loading={readinessLoading}
          error={readinessError}
          onRetry={() => void refetchReadiness()}
        />
      </div>
    </PageTransition>
  );
}
