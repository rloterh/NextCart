"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ClipboardList, EyeOff, Package, ShieldAlert, Sparkles, Star, Store, UserRoundCheck } from "lucide-react";
import { PermissionBoundarySummary } from "@/components/platform/permission-boundary-summary";
import { SensitiveActionReview } from "@/components/platform/sensitive-action-review";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageIntro, PageTransition } from "@/components/ui/page-shell";
import { ProductStatusBadge, ToneBadge, VendorStatusBadge } from "@/components/ui/status-badge";
import { SkeletonBlock, StatePanel } from "@/components/ui/state-panel";
import { recordAdminAction } from "@/lib/admin/audit";
import { getPayoutAnomaly } from "@/lib/orders/payout-state";
import { isExceptionStatus, isReturnStatus } from "@/lib/orders/operations-metrics";
import { getSensitiveWorkflowReview } from "@/lib/platform/access-review";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatDate, formatPrice } from "@/lib/utils/constants";
import { useUIStore } from "@/stores/ui-store";
import type { AdminAction, Category, Product, Profile, Store as StoreType, VendorStatus } from "@/types";
import type { Order } from "@/types/orders";
import type { Review } from "@/types/reviews";

type QueueFilter = "all" | "product" | "vendor" | "review" | "order";
type QueueSeverity = "low" | "medium" | "high";

type ModerationProduct = Pick<
  Product,
  "id" | "store_id" | "name" | "slug" | "status" | "is_featured" | "view_count" | "sale_count" | "stock_quantity" | "price" | "rating_avg" | "rating_count" | "created_at"
> & { store: Pick<StoreType, "id" | "name" | "slug"> | null; category: Pick<Category, "id" | "name"> | null };

type ModerationVendor = Pick<
  StoreType,
  "id" | "owner_id" | "name" | "slug" | "status" | "rating_avg" | "rating_count" | "total_orders" | "total_revenue" | "created_at"
> & { owner: Pick<Profile, "id" | "full_name" | "email"> | null };

type ModerationReview = Pick<
  Review,
  "id" | "product_id" | "store_id" | "rating" | "title" | "body" | "is_verified_purchase" | "is_visible" | "helpful_count" | "created_at"
> & { profile: Pick<Profile, "full_name"> | null; product: Pick<Product, "id" | "name" | "slug" | "status"> | null; store: Pick<StoreType, "id" | "name" | "slug" | "status"> | null };

type ModerationOrder = Pick<
  Order,
  "id" | "order_number" | "status" | "total" | "created_at" | "stripe_transfer_id" | "stripe_transfer_status" | "payout_reconciled_at"
> & { buyer: Pick<Profile, "full_name" | "email"> | null; store: Pick<StoreType, "id" | "name" | "slug" | "status"> | null };

type ModerationQueueItem =
  | { entityType: "product"; id: string; severity: QueueSeverity; title: string; subtitle: string; createdAt: string; tags: string[]; product: ModerationProduct }
  | { entityType: "vendor"; id: string; severity: QueueSeverity; title: string; subtitle: string; createdAt: string; tags: string[]; vendor: ModerationVendor }
  | { entityType: "review"; id: string; severity: QueueSeverity; title: string; subtitle: string; createdAt: string; tags: string[]; review: ModerationReview }
  | { entityType: "order"; id: string; severity: QueueSeverity; title: string; subtitle: string; createdAt: string; tags: string[]; order: ModerationOrder };

type QueueHistoryAction = AdminAction & {
  admin: Pick<Profile, "id" | "full_name" | "email"> | null;
};

const queueTabs: Array<{ label: string; value: QueueFilter }> = [
  { label: "All", value: "all" },
  { label: "Products", value: "product" },
  { label: "Vendors", value: "vendor" },
  { label: "Reviews", value: "review" },
  { label: "Orders", value: "order" },
];

function isQueueFilter(value: string | null): value is QueueFilter {
  return value === "all" || value === "product" || value === "vendor" || value === "review" || value === "order";
}

const severityClasses: Record<QueueSeverity, string> = {
  low: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300",
  medium: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300",
  high: "bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300",
};

function buildProductItem(product: ModerationProduct): ModerationQueueItem | null {
  const tags: string[] = [];
  let severity: QueueSeverity = "low";
  if (product.status === "draft") tags.push("Draft awaiting review");
  if (product.status === "paused") {
    tags.push("Paused listing");
    severity = "medium";
  }
  if (product.stock_quantity <= 0 && product.status === "active") {
    tags.push("Out of stock while active");
    severity = "medium";
  }
  if (product.rating_count >= 3 && product.rating_avg < 3.2) {
    tags.push("Low buyer rating");
    severity = "high";
  }
  return tags.length ? { entityType: "product", id: product.id, severity, title: product.name, subtitle: product.store?.name ?? "Unknown store", createdAt: product.created_at, tags, product } : null;
}

function buildVendorItem(vendor: ModerationVendor): ModerationQueueItem | null {
  const tags: string[] = [];
  let severity: QueueSeverity = "low";
  if (vendor.status === "pending") {
    tags.push("Pending approval");
    severity = "high";
  }
  if (vendor.status === "suspended") {
    tags.push("Suspended storefront");
    severity = "high";
  }
  if (vendor.rating_count >= 5 && vendor.rating_avg < 3.5) {
    tags.push("Trust score review");
    severity = "medium";
  }
  return tags.length ? { entityType: "vendor", id: vendor.id, severity, title: vendor.name, subtitle: vendor.owner?.full_name || vendor.owner?.email || "Owner unavailable", createdAt: vendor.created_at, tags, vendor } : null;
}

function buildReviewItem(review: ModerationReview): ModerationQueueItem | null {
  const tags: string[] = [];
  let severity: QueueSeverity = "low";
  if (!review.is_visible) {
    tags.push("Hidden from storefront");
    severity = "medium";
  }
  if (review.rating <= 2) {
    tags.push("Low rating");
    severity = "medium";
  }
  if (review.helpful_count >= 5) tags.push("High visibility review");
  return tags.length ? { entityType: "review", id: review.id, severity, title: review.title || `${review.rating}-star review`, subtitle: review.product?.name ?? "Product unavailable", createdAt: review.created_at, tags, review } : null;
}

function buildOrderItem(order: ModerationOrder): ModerationQueueItem | null {
  const tags: string[] = [];
  let severity: QueueSeverity = "medium";
  if (isExceptionStatus(order.status)) {
    tags.push("Operational exception");
    severity = "high";
  }
  if (isReturnStatus(order.status) && order.status !== "refunded") tags.push("Return flow open");
  const payoutAnomaly = getPayoutAnomaly(order.status, order.stripe_transfer_id, order.stripe_transfer_status, order.payout_reconciled_at);
  if (payoutAnomaly) tags.push(payoutAnomaly.label);
  return tags.length ? { entityType: "order", id: order.id, severity, title: order.order_number, subtitle: order.store?.name ?? "Unknown store", createdAt: order.created_at, tags, order } : null;
}

export default function AdminModerationPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const addToast = useUIStore((state) => state.addToast);
  const [products, setProducts] = useState<ModerationProduct[]>([]);
  const [vendors, setVendors] = useState<ModerationVendor[]>([]);
  const [reviews, setReviews] = useState<ModerationReview[]>([]);
  const [orders, setOrders] = useState<ModerationOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<QueueFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [policyReason, setPolicyReason] = useState("");
  const [reviewCheckpointConfirmed, setReviewCheckpointConfirmed] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [actionHistory, setActionHistory] = useState<Record<string, QueueHistoryAction[]>>({});

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();
    const [productsRes, vendorsRes, reviewsRes, ordersRes, actionsRes] = await Promise.all([
      supabase.from("products").select("id, store_id, name, slug, status, is_featured, view_count, sale_count, stock_quantity, price, rating_avg, rating_count, created_at, store:stores(id, name, slug), category:categories(id, name)").order("created_at", { ascending: false }).limit(80),
      supabase.from("stores").select("id, owner_id, name, slug, status, rating_avg, rating_count, total_orders, total_revenue, created_at, owner:profiles(id, full_name, email)").order("created_at", { ascending: false }).limit(60),
      supabase.from("reviews").select("id, product_id, store_id, rating, title, body, is_verified_purchase, is_visible, helpful_count, created_at, profile:profiles(full_name), product:products(id, name, slug, status), store:stores(id, name, slug, status)").order("created_at", { ascending: false }).limit(80),
      supabase.from("orders").select("id, order_number, status, total, created_at, stripe_transfer_id, stripe_transfer_status, payout_reconciled_at, buyer:profiles(full_name, email), store:stores(id, name, slug, status)").order("created_at", { ascending: false }).limit(80),
      supabase.from("admin_actions").select("*, admin:profiles(id, full_name, email)").in("entity_type", ["product", "vendor", "review", "order"]).order("created_at", { ascending: false }).limit(200),
    ]);

    const firstError = [productsRes.error, vendorsRes.error, reviewsRes.error, ordersRes.error, actionsRes.error].find(Boolean);
    if (firstError) {
      setProducts([]);
      setVendors([]);
      setReviews([]);
      setOrders([]);
      setActionHistory({});
      setError(firstError.message);
      setLoading(false);
      return;
    }

    setProducts((productsRes.data ?? []) as ModerationProduct[]);
    setVendors((vendorsRes.data ?? []) as ModerationVendor[]);
    setReviews((reviewsRes.data ?? []) as ModerationReview[]);
    setOrders((ordersRes.data ?? []) as ModerationOrder[]);
    const historyMap: Record<string, QueueHistoryAction[]> = {};
    for (const action of ((actionsRes.data ?? []) as QueueHistoryAction[])) {
      const key = `${action.entity_type}:${action.entity_id}`;
      historyMap[key] ??= [];
      historyMap[key].push(action);
    }
    setActionHistory(historyMap);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchQueue();
  }, [fetchQueue]);

  useEffect(() => {
    const nextFilter = searchParams.get("view");
    if (isQueueFilter(nextFilter) && nextFilter !== filter) {
      setFilter(nextFilter);
      return;
    }

    if (!nextFilter && filter !== "all") {
      setFilter("all");
    }
  }, [filter, searchParams]);

  const updateFilter = useCallback(
    (nextFilter: QueueFilter) => {
      setFilter(nextFilter);
      const params = new URLSearchParams(searchParams.toString());
      if (nextFilter === "all") {
        params.delete("view");
      } else {
        params.set("view", nextFilter);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const queueItems = useMemo(
    () =>
      [...products.map(buildProductItem), ...vendors.map(buildVendorItem), ...reviews.map(buildReviewItem), ...orders.map(buildOrderItem)]
        .filter((item): item is ModerationQueueItem => Boolean(item))
        .sort((left, right) => {
          const severityRank = { high: 3, medium: 2, low: 1 };
          const severityDiff = severityRank[right.severity] - severityRank[left.severity];
          return severityDiff || new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
        }),
    [orders, products, reviews, vendors]
  );

  const visibleItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return queueItems.filter((item) => {
      if (filter !== "all" && item.entityType !== filter) return false;
      if (!normalizedSearch) return true;
      return [item.title, item.subtitle, ...item.tags].join(" ").toLowerCase().includes(normalizedSearch);
    });
  }, [filter, queueItems, search]);

  useEffect(() => {
    if (!visibleItems.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !visibleItems.some((item) => item.id === selectedId)) {
      setSelectedId(visibleItems[0].id);
    }
  }, [selectedId, visibleItems]);

  useEffect(() => {
    setReviewCheckpointConfirmed(false);
  }, [selectedId]);

  const selectedItem = visibleItems.find((item) => item.id === selectedId) ?? null;
  const selectedHistory = selectedItem ? actionHistory[`${selectedItem.entityType}:${selectedItem.id}`] ?? [] : [];
  const summary = {
    total: queueItems.length,
    high: queueItems.filter((item) => item.severity === "high").length,
    reviews: queueItems.filter((item) => item.entityType === "review").length,
    orders: queueItems.filter((item) => item.entityType === "order").length,
  };
  const selectedReviewCheckpoint = selectedItem
    ? selectedItem.entityType === "vendor"
      ? getSensitiveWorkflowReview({ key: "vendor_governance" })
      : selectedItem.entityType === "review"
        ? getSensitiveWorkflowReview({ key: "review_moderation" })
        : null
    : null;

  async function getCurrentAdminId() {
    const supabase = getSupabaseBrowserClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      addToast({ type: "error", title: "Admin session unavailable", description: authError?.message ?? "Please refresh and try again." });
      return null;
    }
    return user.id;
  }

  async function handleProductAction(product: ModerationProduct, action: "activate" | "pause" | "feature" | "unfeature") {
    const adminId = await getCurrentAdminId();
    if (!adminId) return;
    setActiveAction(`product:${product.id}:${action}`);
    const supabase = getSupabaseBrowserClient();
    const changes = action === "activate" ? { status: "active" } : action === "pause" ? { status: "paused" } : { is_featured: action === "feature" };
    const { error: updateError } = await supabase.from("products").update(changes).eq("id", product.id);
    if (!updateError) {
      await recordAdminAction(supabase, {
        adminId,
        action: `moderation.${action}`,
        entityType: "product",
        entityId: product.id,
        reason: policyReason,
        metadata: { productName: product.name, nextState: changes },
        sensitivity: "elevated",
        route: "/admin/moderation",
        queueHref: "/admin/moderation?view=product",
        capability: "governance_moderation",
      });
      addToast({ type: "success", title: "Product moderated", description: `${product.name} was updated successfully.` });
      setPolicyReason("");
      await fetchQueue();
    } else {
      addToast({ type: "error", title: "Product update failed", description: updateError.message });
    }
    setActiveAction(null);
  }

  async function handleVendorAction(vendor: ModerationVendor, action: "approve" | "suspend" | "reinstate") {
    if (policyReason.trim().length < 12) {
      addToast({
        type: "error",
        title: "Policy reason required",
        description: "Add a clear moderation reason before changing vendor governance state.",
      });
      return;
    }
    if (!reviewCheckpointConfirmed) {
      addToast({
        type: "error",
        title: "Review checkpoint required",
        description: "Confirm the vendor governance review checklist before applying this action.",
      });
      return;
    }
    const adminId = await getCurrentAdminId();
    if (!adminId) return;
    setActiveAction(`vendor:${vendor.id}:${action}`);
    const supabase = getSupabaseBrowserClient();
    const nextStatus: VendorStatus = action === "approve" || action === "reinstate" ? "approved" : "suspended";
    const { error: updateError } = await supabase.from("stores").update({ status: nextStatus }).eq("id", vendor.id);
    if (!updateError && nextStatus === "approved") await supabase.from("profiles").update({ role: "vendor" }).eq("id", vendor.owner_id);
    if (!updateError) {
      await recordAdminAction(supabase, {
        adminId,
        action: `vendor.${action}`,
        entityType: "vendor",
        entityId: vendor.id,
        reason: policyReason,
        metadata: { storeName: vendor.name, nextStatus },
        sensitivity: action === "suspend" ? "high" : "elevated",
        route: "/admin/moderation",
        queueHref: "/admin/moderation?view=vendor",
        capability: "vendor_governance",
      });
      addToast({ type: "success", title: "Vendor updated", description: `${vendor.name} is now ${nextStatus}.` });
      setPolicyReason("");
      setReviewCheckpointConfirmed(false);
      await fetchQueue();
    } else {
      addToast({ type: "error", title: "Vendor update failed", description: updateError.message });
    }
    setActiveAction(null);
  }

  async function handleReviewAction(review: ModerationReview, action: "hide" | "restore") {
    if (policyReason.trim().length < 12) {
      addToast({
        type: "error",
        title: "Moderation reason required",
        description: "Add a clear reason before changing review visibility.",
      });
      return;
    }
    if (!reviewCheckpointConfirmed) {
      addToast({
        type: "error",
        title: "Review checkpoint required",
        description: "Confirm the review-moderation checklist before applying this action.",
      });
      return;
    }
    const adminId = await getCurrentAdminId();
    if (!adminId) return;
    setActiveAction(`review:${review.id}:${action}`);
    const supabase = getSupabaseBrowserClient();
    const nextVisibility = action === "restore";
    const { error: updateError } = await supabase.from("reviews").update({ is_visible: nextVisibility }).eq("id", review.id);
    if (!updateError) {
      await recordAdminAction(supabase, {
        adminId,
        action: `review.${action}`,
        entityType: "review",
        entityId: review.id,
        reason: policyReason,
        metadata: { rating: review.rating, nextVisibility },
        sensitivity: "elevated",
        route: "/admin/moderation",
        queueHref: "/admin/moderation?view=review",
        capability: "review_moderation",
      });
      addToast({ type: "success", title: nextVisibility ? "Review restored" : "Review hidden", description: "Storefront review visibility has been updated." });
      setPolicyReason("");
      setReviewCheckpointConfirmed(false);
      await fetchQueue();
    } else {
      addToast({ type: "error", title: "Review update failed", description: updateError.message });
    }
    setActiveAction(null);
  }

  return (
    <PageTransition>
      <div className="max-w-3xl">
        <PageIntro
          title="Moderation queue"
          description="Review catalog quality, vendor readiness, sensitive reviews, and flagged operational issues in one queue."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Queue items", value: summary.total, icon: ShieldAlert },
          { label: "High priority", value: summary.high, icon: AlertTriangle },
          { label: "Review decisions", value: summary.reviews, icon: EyeOff },
          { label: "Operational escalations", value: summary.orders, icon: ClipboardList },
        ].map((card) => (
          <Card key={card.label} className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-widest text-stone-400">{card.label}</p>
              <div className="rounded-full bg-stone-100 p-2 text-stone-700 dark:bg-stone-800 dark:text-stone-300"><card.icon className="h-4 w-4" /></div>
            </div>
            <p className="mt-3 text-2xl font-medium text-stone-900 dark:text-white">{card.value}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1">
          {queueTabs.map((tab) => (
            <button key={tab.value} type="button" onClick={() => updateFilter(tab.value)} className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors ${filter === tab.value ? "bg-stone-900 text-white dark:bg-white dark:text-stone-900" : "text-stone-500 hover:text-stone-900 dark:hover:text-white"}`}>
              {tab.label}
            </button>
          ))}
        </div>
        <input type="text" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search queue items or signals" className="h-9 w-full border-b border-stone-200 bg-transparent text-sm placeholder:text-stone-400 focus:border-stone-900 focus:outline-none dark:border-stone-700 sm:w-72" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_380px]">
        <Card className="p-0">
          <div className="border-b border-stone-100 px-5 py-4 dark:border-stone-800">
            <p className="text-xs font-medium uppercase tracking-widest text-stone-400">Review queue</p>
            <p className="mt-1 text-sm text-stone-500">{visibleItems.length} item(s) match the current moderation view.</p>
          </div>
          {loading ? (
            <div className="space-y-3 p-5">{Array.from({ length: 6 }).map((_, index) => <SkeletonBlock key={index} lines={3} />)}</div>
          ) : error ? (
            <div className="p-5">
              <StatePanel
                tone="danger"
                title="We could not load the moderation queue"
                description={error}
                actionLabel="Try again"
                onAction={() => void fetchQueue()}
              />
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="p-5">
              <StatePanel
                title="No moderation items match the current filters"
                description="Try another queue tab or search term to review a different signal."
                icon={ShieldAlert}
              />
            </div>
          ) : (
            <div className="divide-y divide-stone-100 dark:divide-stone-800">
              {visibleItems.map((item) => (
                <button key={`${item.entityType}:${item.id}`} type="button" onClick={() => setSelectedId(item.id)} className={`w-full px-5 py-4 text-left transition-colors ${selectedId === item.id ? "bg-stone-50 dark:bg-stone-800/40" : "hover:bg-stone-50/70 dark:hover:bg-stone-800/20"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${severityClasses[item.severity]}`}>{item.severity}</span>
                        <span className="text-[10px] font-medium uppercase tracking-widest text-stone-400">{item.entityType}</span>
                      </div>
                      <p className="mt-2 text-sm font-medium text-stone-900 dark:text-white">{item.title}</p>
                      <p className="mt-1 text-xs text-stone-500">{item.subtitle}</p>
                    </div>
                    <p className="text-[10px] uppercase tracking-wider text-stone-400">{formatDate(item.createdAt)}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">{item.tags.map((tag) => <span key={tag} className="border border-stone-200 px-2 py-1 text-[10px] uppercase tracking-wider text-stone-500 dark:border-stone-700 dark:text-stone-400">{tag}</span>)}</div>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card className="space-y-5">
          {!selectedItem ? (
            <div className="flex min-h-[320px] items-center justify-center text-center text-sm text-stone-500">Select an item to inspect moderation context and take action.</div>
          ) : (
            <>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${severityClasses[selectedItem.severity]}`}>{selectedItem.severity}</span>
                  <span className="text-[10px] font-medium uppercase tracking-widest text-stone-400">{selectedItem.entityType}</span>
                </div>
                <h2 className="mt-3 font-serif text-xl text-stone-900 dark:text-white">{selectedItem.title}</h2>
                <p className="mt-1 text-sm text-stone-500">{selectedItem.subtitle}</p>
              </div>

              <div className="space-y-3 border-y border-stone-100 py-4 text-sm dark:border-stone-800">
                {selectedItem.entityType === "product" && <>
                  <div className="flex items-center justify-between gap-3"><span className="text-stone-500">Status</span><ProductStatusBadge status={selectedItem.product.status} /></div>
                  <div className="flex items-center justify-between gap-3"><span className="text-stone-500">Merchandising</span><span className="font-medium text-stone-900 dark:text-white">{selectedItem.product.is_featured ? "Featured" : "Standard listing"}</span></div>
                  <div className="flex items-center justify-between gap-3"><span className="text-stone-500">Signals</span><span className="font-medium text-stone-900 dark:text-white">{selectedItem.product.sale_count} sales / {selectedItem.product.view_count} views / {selectedItem.product.stock_quantity} in stock</span></div>
                </>}
                {selectedItem.entityType === "vendor" && <>
                  <div className="flex items-center justify-between gap-3"><span className="text-stone-500">Status</span><VendorStatusBadge status={selectedItem.vendor.status} /></div>
                  <div className="flex items-center justify-between gap-3"><span className="text-stone-500">Owner</span><span className="font-medium text-stone-900 dark:text-white">{selectedItem.vendor.owner?.email ?? "Owner unavailable"}</span></div>
                  <div className="flex items-center justify-between gap-3"><span className="text-stone-500">Business volume</span><span className="font-medium text-stone-900 dark:text-white">{selectedItem.vendor.total_orders} orders / {formatPrice(Number(selectedItem.vendor.total_revenue))}</span></div>
                </>}
                {selectedItem.entityType === "review" && <>
                  <div className="flex items-center justify-between gap-3"><span className="text-stone-500">Rating</span><ToneBadge tone={selectedItem.review.rating <= 2 ? "danger" : selectedItem.review.rating === 3 ? "warning" : "success"}>{selectedItem.review.rating} / 5</ToneBadge></div>
                  <div className="flex items-center justify-between gap-3"><span className="text-stone-500">Visibility</span><ToneBadge tone={selectedItem.review.is_visible ? "success" : "muted"}>{selectedItem.review.is_visible ? "Visible" : "Hidden"}</ToneBadge></div>
                  <div><p className="text-xs font-medium uppercase tracking-widest text-stone-400">Review body</p><p className="mt-2 text-sm text-stone-600 dark:text-stone-300">{selectedItem.review.body?.trim() || "No body was submitted with this review."}</p></div>
                </>}
                {selectedItem.entityType === "order" && <>
                  <div className="flex items-center justify-between gap-3"><span className="text-stone-500">Status</span><span className="font-medium text-stone-900 dark:text-white">{selectedItem.order.status.replaceAll("_", " ")}</span></div>
                  <div className="flex items-center justify-between gap-3"><span className="text-stone-500">Buyer</span><span className="font-medium text-stone-900 dark:text-white">{selectedItem.order.buyer?.full_name || selectedItem.order.buyer?.email || "Buyer unavailable"}</span></div>
                  <div><p className="text-xs font-medium uppercase tracking-widest text-stone-400">Payout signal</p><p className="mt-2 text-sm text-stone-600 dark:text-stone-300">{getPayoutAnomaly(selectedItem.order.status, selectedItem.order.stripe_transfer_id, selectedItem.order.stripe_transfer_status, selectedItem.order.payout_reconciled_at)?.description ?? "This order is on a normal settlement path right now."}</p></div>
                </>}
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-stone-400">Action history</p>
                {selectedHistory.length === 0 ? (
                  <p className="mt-2 text-sm text-stone-500">No prior moderation actions have been logged for this item yet.</p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {selectedHistory.slice(0, 4).map((action) => (
                      <div key={action.id} className="border border-stone-200 bg-stone-50/70 px-3 py-3 text-sm dark:border-stone-800 dark:bg-stone-950/30">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-stone-900 dark:text-white">{action.action.replaceAll("_", " ")}</p>
                            <p className="mt-1 text-xs text-stone-500">{action.admin?.full_name ?? action.admin?.email ?? "Unknown admin"}</p>
                          </div>
                          <p className="text-xs text-stone-500">{formatDate(action.created_at)}</p>
                        </div>
                        {action.reason ? <p className="mt-2 text-sm text-stone-500">{action.reason}</p> : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="policy-reason" className="text-xs font-medium uppercase tracking-widest text-stone-400">Policy note</label>
                <textarea id="policy-reason" value={policyReason} onChange={(event) => setPolicyReason(event.target.value)} rows={4} placeholder="Add the policy or context behind this action." className="mt-2 w-full border border-stone-200 bg-transparent px-3 py-2 text-sm text-stone-700 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none dark:border-stone-700 dark:text-stone-200" />
              </div>

              {selectedItem.entityType === "vendor" || selectedItem.entityType === "review" ? (
                <PermissionBoundarySummary
                  title={selectedItem.entityType === "vendor" ? "Vendor governance boundary" : "Review moderation boundary"}
                  status="attention"
                  capability={selectedItem.entityType === "vendor" ? "vendor_governance" : "review_moderation"}
                  summary={
                    selectedItem.entityType === "vendor"
                      ? "Vendor approval, suspension, and reinstatement affect storefront trust, access expectations, and may require parallel review of disputes or payout posture."
                      : "Review visibility changes affect buyer trust surfaces and should be tied to a clear policy rationale rather than sentiment alone."
                  }
                  operatorGuidance={
                    selectedItem.entityType === "vendor"
                      ? "Escalate when the storefront has open disputes, payout risk, or mixed moderation signals that make the governance decision less obvious."
                      : "Escalate when the review suggests fraud, coordinated abuse, or a broader trust issue that should widen beyond this single moderation action."
                  }
                />
              ) : null}

              {selectedReviewCheckpoint ? (
                <SensitiveActionReview
                  review={selectedReviewCheckpoint}
                  checked={reviewCheckpointConfirmed}
                  onCheckedChange={setReviewCheckpointConfirmed}
                />
              ) : null}

              <div className="flex flex-wrap gap-2">
                {selectedItem.entityType === "product" && <>
                  {selectedItem.product.status === "paused" ? <Button size="sm" variant="ghost" isLoading={activeAction === `product:${selectedItem.product.id}:activate`} onClick={() => void handleProductAction(selectedItem.product, "activate")} leftIcon={<UserRoundCheck className="h-3.5 w-3.5 text-emerald-600" />}>Activate</Button> : <Button size="sm" variant="ghost" isLoading={activeAction === `product:${selectedItem.product.id}:pause`} onClick={() => void handleProductAction(selectedItem.product, "pause")} leftIcon={<AlertTriangle className="h-3.5 w-3.5 text-amber-600" />}>Pause</Button>}
                  <Button size="sm" variant="ghost" isLoading={activeAction === `product:${selectedItem.product.id}:${selectedItem.product.is_featured ? "unfeature" : "feature"}`} onClick={() => void handleProductAction(selectedItem.product, selectedItem.product.is_featured ? "unfeature" : "feature")} leftIcon={<Sparkles className="h-3.5 w-3.5 text-amber-500" />}>{selectedItem.product.is_featured ? "Remove feature" : "Feature product"}</Button>
                  <Link href={`/products/${selectedItem.product.store_id}/${selectedItem.product.slug}`} target="_blank" rel="noreferrer"><Button size="sm" variant="ghost" leftIcon={<Package className="h-3.5 w-3.5" />}>View listing</Button></Link>
                </>}
                {selectedItem.entityType === "vendor" && <>
                  {selectedItem.vendor.status === "pending" && <Button size="sm" variant="ghost" isLoading={activeAction === `vendor:${selectedItem.vendor.id}:approve`} onClick={() => void handleVendorAction(selectedItem.vendor, "approve")} leftIcon={<UserRoundCheck className="h-3.5 w-3.5 text-emerald-600" />}>Approve</Button>}
                  {selectedItem.vendor.status === "approved" ? <Button size="sm" variant="ghost" isLoading={activeAction === `vendor:${selectedItem.vendor.id}:suspend`} onClick={() => void handleVendorAction(selectedItem.vendor, "suspend")} leftIcon={<AlertTriangle className="h-3.5 w-3.5 text-red-500" />}>Suspend</Button> : selectedItem.vendor.status === "suspended" ? <Button size="sm" variant="ghost" isLoading={activeAction === `vendor:${selectedItem.vendor.id}:reinstate`} onClick={() => void handleVendorAction(selectedItem.vendor, "reinstate")} leftIcon={<UserRoundCheck className="h-3.5 w-3.5 text-emerald-600" />}>Reinstate</Button> : null}
                  <Link href={`/vendors/${selectedItem.vendor.slug}`} target="_blank" rel="noreferrer"><Button size="sm" variant="ghost" leftIcon={<Store className="h-3.5 w-3.5" />}>View storefront</Button></Link>
                </>}
                {selectedItem.entityType === "review" && <>
                  {selectedItem.review.is_visible ? <Button size="sm" variant="ghost" isLoading={activeAction === `review:${selectedItem.review.id}:hide`} onClick={() => void handleReviewAction(selectedItem.review, "hide")} leftIcon={<EyeOff className="h-3.5 w-3.5 text-red-500" />}>Hide review</Button> : <Button size="sm" variant="ghost" isLoading={activeAction === `review:${selectedItem.review.id}:restore`} onClick={() => void handleReviewAction(selectedItem.review, "restore")} leftIcon={<Sparkles className="h-3.5 w-3.5 text-emerald-600" />}>Restore review</Button>}
                  {selectedItem.review.product && <Link href={`/products/${selectedItem.review.store_id}/${selectedItem.review.product.slug}`} target="_blank" rel="noreferrer"><Button size="sm" variant="ghost" leftIcon={<Star className="h-3.5 w-3.5" />}>View product</Button></Link>}
                </>}
                {selectedItem.entityType === "order" && <>
                  <Link href="/admin/orders"><Button size="sm" variant="ghost" leftIcon={<ClipboardList className="h-3.5 w-3.5" />}>Open order review</Button></Link>
                  <Link href="/admin/disputes"><Button size="sm" variant="ghost" leftIcon={<AlertTriangle className="h-3.5 w-3.5 text-amber-600" />}>Open disputes</Button></Link>
                </>}
              </div>
            </>
          )}
        </Card>
      </div>
    </PageTransition>
  );
}
