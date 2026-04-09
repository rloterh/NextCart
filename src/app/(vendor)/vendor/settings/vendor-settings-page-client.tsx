"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowUpRight, CreditCard, ShieldCheck, Store, Wallet } from "lucide-react";
import { EventScaffoldPanel } from "@/components/platform/event-scaffold-panel";
import { LaunchReadinessPanel } from "@/components/platform/launch-readiness-panel";
import { DelayDigestPanel } from "@/components/platform/delay-digest-panel";
import { PlatformInboxPanel } from "@/components/platform/platform-inbox-panel";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageIntro, PageTransition } from "@/components/ui/page-shell";
import { SkeletonBlock, StatePanel } from "@/components/ui/state-panel";
import { useAuth } from "@/hooks/use-auth";
import { getPayoutEscalationMessage } from "@/lib/platform/notifications";
import { usePlatformReadiness } from "@/hooks/use-platform-readiness";
import { getPayoutAnomaly, getPayoutState } from "@/lib/orders/payout-state";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatPrice, slugify } from "@/lib/utils/constants";
import { useUIStore } from "@/stores/ui-store";
import type { Order } from "@/types/orders";

interface VendorSettingsPageClientProps {
  stripeState?: string;
}

interface StoreSettingsFormState {
  name: string;
  slug: string;
  description: string;
  logoUrl: string;
  bannerUrl: string;
  supportEmail: string;
  shippingNote: string;
  storyHeadline: string;
  craftsmanshipNote: string;
  returnsPolicy: string;
  processingTime: string;
  policyHighlights: string;
  reshipTemplate: string;
  returnInitiatedTemplate: string;
  returnApprovedTemplate: string;
  returnTransitTemplate: string;
  returnReceivedTemplate: string;
}

interface FinanceSnapshot {
  grossSales: number;
  estimatedPayouts: number;
  platformFees: number;
  openOrders: number;
  settledOrders: number;
  latestOrderDate: string | null;
}

interface PayoutAuditSummary {
  reconciledOrders: number;
  outstandingSettlements: number;
  anomalyCount: number;
  averageReconcileDays: number;
}

type FinanceOrderSummary = Pick<Order, "id" | "order_number" | "status" | "total" | "platform_fee" | "created_at" | "delivered_at" | "stripe_transfer_id" | "stripe_transfer_status" | "payout_reconciled_at">;

interface TemplateFieldProps {
  label: string;
  value: string;
  helper: string;
  placeholder: string;
  onChange: (value: string) => void;
}

function TemplateField({ label, value, helper, placeholder, onChange }: TemplateFieldProps) {
  return (
    <div>
      <label className="block text-xs font-medium uppercase tracking-widest text-stone-500 dark:text-stone-400">{label}</label>
      <textarea
        rows={4}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 w-full border-b border-stone-200 bg-transparent py-2 text-sm placeholder:text-stone-400 focus:border-stone-900 focus:outline-none dark:border-stone-700"
        placeholder={placeholder}
      />
      <p className="mt-2 text-xs leading-relaxed text-stone-500">{helper}</p>
    </div>
  );
}

export function VendorSettingsPageClient({ stripeState }: VendorSettingsPageClientProps) {
  const { store, user, refreshProfile, isLoading: authLoading } = useAuth();
  const addToast = useUIStore((state) => state.addToast);
  const {
    data: readinessData,
    loading: readinessLoading,
    error: readinessError,
    refetch: refetchReadiness,
  } = usePlatformReadiness();
  const [form, setForm] = useState<StoreSettingsFormState>({
    name: "",
    slug: "",
    description: "",
    logoUrl: "",
    bannerUrl: "",
    supportEmail: "",
    shippingNote: "",
    storyHeadline: "",
    craftsmanshipNote: "",
    returnsPolicy: "",
    processingTime: "",
    policyHighlights: "",
    reshipTemplate: "",
    returnInitiatedTemplate: "",
    returnApprovedTemplate: "",
    returnTransitTemplate: "",
    returnReceivedTemplate: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isConnectingStripe, setIsConnectingStripe] = useState(false);
  const [isOpeningStripeDashboard, setIsOpeningStripeDashboard] = useState(false);
  const [financeSnapshot, setFinanceSnapshot] = useState<FinanceSnapshot | null>(null);
  const [payoutAudit, setPayoutAudit] = useState<PayoutAuditSummary | null>(null);
  const [financeOrders, setFinanceOrders] = useState<FinanceOrderSummary[]>([]);

  useEffect(() => {
    if (!store) return;

    const settings = store.settings ?? {};
    setForm({
      name: store.name,
      slug: store.slug,
      description: store.description ?? "",
      logoUrl: store.logo_url ?? "",
      bannerUrl: store.banner_url ?? "",
      supportEmail: typeof settings.supportEmail === "string" ? settings.supportEmail : user?.email ?? "",
      shippingNote: typeof settings.shippingNote === "string" ? settings.shippingNote : "",
      storyHeadline: typeof settings.storyHeadline === "string" ? settings.storyHeadline : "",
      craftsmanshipNote: typeof settings.craftsmanshipNote === "string" ? settings.craftsmanshipNote : "",
      returnsPolicy: typeof settings.returnsPolicy === "string" ? settings.returnsPolicy : "",
      processingTime: typeof settings.processingTime === "string" ? settings.processingTime : "",
      policyHighlights: Array.isArray(settings.policyHighlights) ? settings.policyHighlights.filter((value): value is string => typeof value === "string").join(", ") : "",
      reshipTemplate: typeof settings.reshipTemplate === "string" ? settings.reshipTemplate : "",
      returnInitiatedTemplate: typeof settings.returnInitiatedTemplate === "string" ? settings.returnInitiatedTemplate : "",
      returnApprovedTemplate: typeof settings.returnApprovedTemplate === "string" ? settings.returnApprovedTemplate : "",
      returnTransitTemplate: typeof settings.returnTransitTemplate === "string" ? settings.returnTransitTemplate : "",
      returnReceivedTemplate: typeof settings.returnReceivedTemplate === "string" ? settings.returnReceivedTemplate : "",
    });
  }, [store, user?.email]);

  useEffect(() => {
    if (stripeState === "success") {
      addToast({
        type: "success",
        title: "Stripe onboarding updated",
        description: "Your payout setup has been refreshed. We recommend reviewing your store settings before going live.",
      });
    }

    if (stripeState === "refresh") {
      addToast({
        type: "warning",
        title: "Stripe onboarding incomplete",
        description: "Continue the payout setup flow when you are ready to finish account verification.",
      });
    }
  }, [addToast, stripeState]);

  useEffect(() => {
    async function fetchFinanceSnapshot() {
      if (!store) {
        setFinanceSnapshot(null);
        setPayoutAudit(null);
        setFinanceOrders([]);
        return;
      }

      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from("orders")
        .select("id, order_number, status, total, platform_fee, created_at, delivered_at, stripe_transfer_id, stripe_transfer_status, payout_reconciled_at")
        .eq("store_id", store.id);

      const orders = (data ?? []) as FinanceOrderSummary[];
      const grossSales = orders.reduce((sum, order) => sum + Number(order.total), 0);
      const platformFees = orders.reduce((sum, order) => sum + Number(order.platform_fee), 0);
      const estimatedPayouts = grossSales - platformFees;
      const openOrders = orders.filter((order) => ["pending", "confirmed", "processing", "packed", "shipped", "out_for_delivery"].includes(order.status)).length;
      const settledOrders = orders.filter((order) => order.status === "delivered" || Boolean(order.stripe_transfer_id)).length;
      const latestOrderDate = orders.length > 0 ? orders.map((order) => order.created_at).sort().at(-1) ?? null : null;
      const reconciledOrders = orders.filter((order) => Boolean(order.payout_reconciled_at)).length;
      const outstandingSettlements = orders.filter((order) => order.status === "delivered" && order.stripe_transfer_status !== "paid").length;
      const anomalyCount = orders.filter((order) =>
        Boolean(getPayoutAnomaly(order.status, order.stripe_transfer_id, order.stripe_transfer_status, order.payout_reconciled_at))
      ).length;
      const reconciliationDurations = orders
        .filter((order) => order.payout_reconciled_at)
        .map((order) => {
          const comparisonStart = order.delivered_at ?? order.created_at;
          const createdAt = new Date(comparisonStart).getTime();
          const reconciledAt = new Date(order.payout_reconciled_at as string).getTime();
          return Number.isFinite(createdAt) && Number.isFinite(reconciledAt)
            ? Math.max(0, Math.round((reconciledAt - createdAt) / (1000 * 60 * 60 * 24)))
            : 0;
        });

      setFinanceSnapshot({
        grossSales,
        estimatedPayouts,
        platformFees,
        openOrders,
        settledOrders,
        latestOrderDate,
      });
      setPayoutAudit({
        reconciledOrders,
        outstandingSettlements,
        anomalyCount,
        averageReconcileDays:
          reconciliationDurations.length > 0
            ? Math.round(reconciliationDurations.reduce((sum, value) => sum + value, 0) / reconciliationDurations.length)
            : 0,
      });
      setFinanceOrders(
        [...orders]
          .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
          .slice(0, 10)
      );
    }

    void fetchFinanceSnapshot();
  }, [store]);

  const payoutState = useMemo(() => {
    if (!store?.stripe_account_id) {
      return {
        label: "Not connected",
        description: "Connect Stripe Express to accept split payments and unlock payout visibility.",
      };
    }

    if (store.status === "approved") {
      return {
        label: "Connected and approved",
        description: "Your store is ready to collect payments and route payouts to Stripe Connect.",
      };
    }

    return {
      label: "Connected, awaiting review",
      description: "Stripe is attached to the store, and marketplace approval will finish the activation path.",
    };
  }, [store?.status, store?.stripe_account_id]);

  const launchChecklist = useMemo(
    () => [
      {
        label: "Editorial story",
        complete: Boolean(form.description.trim() && form.storyHeadline.trim()),
        detail: "Store description and story headline help buyers understand what makes this storefront distinctive.",
      },
      {
        label: "Support and policies",
        complete: Boolean(form.supportEmail.trim() && form.shippingNote.trim() && form.returnsPolicy.trim()),
        detail: "Support email, shipping note, and returns guidance should all be present before launch.",
      },
      {
        label: "Brand media",
        complete: Boolean(form.logoUrl.trim() && form.bannerUrl.trim()),
        detail: "Logo and banner media strengthen vendor trust surfaces and merchandising modules.",
      },
      {
        label: "Payout activation",
        complete: Boolean(store?.stripe_account_id && store.status === "approved"),
        detail: "Stripe onboarding and marketplace approval should both be complete before accepting live orders.",
      },
      {
        label: "Recovery templates",
        complete: Boolean(
          form.reshipTemplate.trim() &&
            form.returnInitiatedTemplate.trim() &&
            form.returnApprovedTemplate.trim()
        ),
        detail: "Recovery templates keep reship and return messaging consistent when orders hit exceptions.",
      },
    ],
    [
      form.bannerUrl,
      form.description,
      form.logoUrl,
      form.reshipTemplate,
      form.returnApprovedTemplate,
      form.returnInitiatedTemplate,
      form.returnsPolicy,
      form.shippingNote,
      form.storyHeadline,
      form.supportEmail,
      store?.status,
      store?.stripe_account_id,
    ]
  );
  const checklistCompleteCount = launchChecklist.filter((item) => item.complete).length;
  const payoutEscalation = getPayoutEscalationMessage({
    anomalyCount: payoutAudit?.anomalyCount ?? 0,
    outstandingSettlements: payoutAudit?.outstandingSettlements ?? 0,
  });

  function updateField<Key extends keyof StoreSettingsFormState>(key: Key, value: StoreSettingsFormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();

    if (!store) return;

    if (!form.name.trim()) {
      addToast({
        type: "error",
        title: "Store name is required",
        description: "Add a store name before saving brand settings.",
      });
      return;
    }

    if (form.supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.supportEmail)) {
      addToast({
        type: "error",
        title: "Support email is invalid",
        description: "Enter a valid support email so buyers know how to reach your team.",
      });
      return;
    }

    setIsSaving(true);
    const supabase = getSupabaseBrowserClient();
    const normalizedSlug = slugify(form.slug || form.name);
    const { error } = await supabase
      .from("stores")
      .update({
        name: form.name.trim(),
        slug: normalizedSlug,
        description: form.description.trim() || null,
        logo_url: form.logoUrl.trim() || null,
        banner_url: form.bannerUrl.trim() || null,
        settings: {
          ...(store.settings ?? {}),
          supportEmail: form.supportEmail.trim() || null,
          shippingNote: form.shippingNote.trim() || null,
          storyHeadline: form.storyHeadline.trim() || null,
          craftsmanshipNote: form.craftsmanshipNote.trim() || null,
          returnsPolicy: form.returnsPolicy.trim() || null,
          processingTime: form.processingTime.trim() || null,
          reshipTemplate: form.reshipTemplate.trim() || null,
          returnInitiatedTemplate: form.returnInitiatedTemplate.trim() || null,
          returnApprovedTemplate: form.returnApprovedTemplate.trim() || null,
          returnTransitTemplate: form.returnTransitTemplate.trim() || null,
          returnReceivedTemplate: form.returnReceivedTemplate.trim() || null,
          policyHighlights: form.policyHighlights
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)
            .slice(0, 4),
        },
      })
      .eq("id", store.id);

    if (error) {
      addToast({
        type: "error",
        title: "Unable to update store",
        description: error.message,
      });
      setIsSaving(false);
      return;
    }

    await refreshProfile();
    addToast({
      type: "success",
      title: "Store settings saved",
      description: "Your storefront identity and customer communication details have been updated.",
    });
    setIsSaving(false);
  }

  if (authLoading) {
    return (
      <PageTransition>
        <Card className="space-y-4">
          <SkeletonBlock lines={4} />
        </Card>
        <Card className="space-y-4">
          <SkeletonBlock lines={8} />
        </Card>
      </PageTransition>
    );
  }

  async function handleStripeConnect() {
    setIsConnectingStripe(true);

    try {
      const response = await fetch("/api/stripe/connect", { method: "POST" });
      const payload = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !payload.url) {
        throw new Error(payload.error ?? "Unable to start Stripe onboarding.");
      }

      window.location.href = payload.url;
    } catch (error) {
      addToast({
        type: "error",
        title: "Unable to start Stripe setup",
        description: error instanceof Error ? error.message : "Please try again.",
      });
      setIsConnectingStripe(false);
    }
  }

  async function handleOpenStripeDashboard() {
    setIsOpeningStripeDashboard(true);

    try {
      const response = await fetch("/api/stripe/dashboard");
      const payload = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !payload.url) {
        throw new Error(payload.error ?? "Unable to open Stripe dashboard.");
      }

      window.open(payload.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      addToast({
        type: "error",
        title: "Unable to open Stripe dashboard",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsOpeningStripeDashboard(false);
    }
  }

  if (!store) {
    return (
      <StatePanel
        title="Store profile unavailable"
        description="Finish loading the vendor workspace or create a store record before editing settings."
        tone="warning"
        icon={Store}
      />
    );
  }

  return (
    <PageTransition className="mx-auto max-w-6xl space-y-6">
      <div className="max-w-3xl">
        <PageIntro
          eyebrow="Vendor operations"
          title="Store settings and payouts"
          description="Shape how your storefront feels, how customers contact you, and how Stripe Connect powers marketplace payouts."
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <form onSubmit={handleSave} className="space-y-6">
          <Card>
            <CardTitle>Brand identity</CardTitle>
            <CardDescription>Control the editorial storefront details that buyers see first.</CardDescription>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Input label="Store name" value={form.name} onChange={(event) => updateField("name", event.target.value)} />
              <Input label="Store slug" value={form.slug} onChange={(event) => updateField("slug", event.target.value)} />
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium uppercase tracking-widest text-stone-500 dark:text-stone-400">Description</label>
                <textarea rows={5} value={form.description} onChange={(event) => updateField("description", event.target.value)} className="mt-1.5 w-full border-b border-stone-200 bg-transparent py-2 text-sm placeholder:text-stone-400 focus:border-stone-900 focus:outline-none dark:border-stone-700" placeholder="Tell buyers what your store is known for, what craftsmanship or curation standard sets it apart, and why it belongs in NexCart." />
              </div>
              <Input label="Story headline" value={form.storyHeadline} onChange={(event) => updateField("storyHeadline", event.target.value)} hint="Short editorial line shown on vendor trust surfaces." />
              <Input label="Processing promise" value={form.processingTime} onChange={(event) => updateField("processingTime", event.target.value)} hint="Example: Ships in 2-3 business days" />
              <Input label="Logo URL" value={form.logoUrl} onChange={(event) => updateField("logoUrl", event.target.value)} />
              <Input label="Banner URL" value={form.bannerUrl} onChange={(event) => updateField("bannerUrl", event.target.value)} />
            </div>
          </Card>

          <Card>
            <CardTitle>Customer communication</CardTitle>
            <CardDescription>Clarify who buyers should hear from after purchase and what service promise you operate.</CardDescription>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Input label="Support email" type="email" value={form.supportEmail} onChange={(event) => updateField("supportEmail", event.target.value)} />
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium uppercase tracking-widest text-stone-500 dark:text-stone-400">Shipping and fulfillment note</label>
                <textarea rows={4} value={form.shippingNote} onChange={(event) => updateField("shippingNote", event.target.value)} className="mt-1.5 w-full border-b border-stone-200 bg-transparent py-2 text-sm placeholder:text-stone-400 focus:border-stone-900 focus:outline-none dark:border-stone-700" placeholder="Share lead times, packaging details, or special fulfillment expectations for buyers." />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium uppercase tracking-widest text-stone-500 dark:text-stone-400">Returns policy</label>
                <textarea rows={4} value={form.returnsPolicy} onChange={(event) => updateField("returnsPolicy", event.target.value)} className="mt-1.5 w-full border-b border-stone-200 bg-transparent py-2 text-sm placeholder:text-stone-400 focus:border-stone-900 focus:outline-none dark:border-stone-700" placeholder="Explain return windows, exchange expectations, and any made-to-order exceptions." />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium uppercase tracking-widest text-stone-500 dark:text-stone-400">Craftsmanship note</label>
                <textarea rows={4} value={form.craftsmanshipNote} onChange={(event) => updateField("craftsmanshipNote", event.target.value)} className="mt-1.5 w-full border-b border-stone-200 bg-transparent py-2 text-sm placeholder:text-stone-400 focus:border-stone-900 focus:outline-none dark:border-stone-700" placeholder="Share sourcing details, handmade process, materials, or service standards that build buyer confidence." />
              </div>
              <Input label="Policy highlights" value={form.policyHighlights} onChange={(event) => updateField("policyHighlights", event.target.value)} hint="Comma separated points like Free returns, Gift-ready packaging, Small-batch production." />
            </div>

            <div className="mt-6 flex justify-end">
              <Button type="submit" isLoading={isSaving}>Save store settings</Button>
            </div>
          </Card>

          <Card>
            <CardTitle>Recovery communication templates</CardTitle>
            <CardDescription>
              Create reusable buyer-facing messages for reshipments and return stages. Tokens like {"{orderNumber}"}, {"{trackingNumber}"}, and {"{supportEmail}"} are supported.
            </CardDescription>
            <div className="mt-6 grid gap-5">
              <TemplateField
                label="Reship update"
                value={form.reshipTemplate}
                onChange={(value) => updateField("reshipTemplate", value)}
                helper="Used when a delivery fails and your team starts a retry shipment."
                placeholder="We are arranging a replacement shipment for order {orderNumber}. Fresh tracking will follow shortly. Contact {supportEmail} if you need anything in the meantime."
              />
              <TemplateField
                label="Return started"
                value={form.returnInitiatedTemplate}
                onChange={(value) => updateField("returnInitiatedTemplate", value)}
                helper="Used when the buyer return flow first opens."
                placeholder="We have started the return review for order {orderNumber}. Please keep the item ready while we confirm the next handoff details."
              />
              <TemplateField
                label="Return approved"
                value={form.returnApprovedTemplate}
                onChange={(value) => updateField("returnApprovedTemplate", value)}
                helper="Used after the return is approved and you want to explain next steps clearly."
                placeholder="Your return for order {orderNumber} has been approved. Please follow the next return step from {storeName} or contact {supportEmail} for help."
              />
              <TemplateField
                label="Return in transit"
                value={form.returnTransitTemplate}
                onChange={(value) => updateField("returnTransitTemplate", value)}
                helper="Used while the return package is on the way back to your team."
                placeholder="The return for order {orderNumber} is now in transit back to {storeName}. We will update this page as soon as the parcel is received."
              />
              <TemplateField
                label="Return received"
                value={form.returnReceivedTemplate}
                onChange={(value) => updateField("returnReceivedTemplate", value)}
                helper="Used once the returned item reaches your team and the final resolution is underway."
                placeholder="We have received the returned parcel for order {orderNumber} and are now completing the final resolution."
              />
            </div>
          </Card>
        </form>

        <div className="space-y-6">
          <Card>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-stone-400">Payout readiness</p>
                <h2 className="mt-2 font-serif text-2xl text-stone-900 dark:text-white">{payoutState.label}</h2>
                <p className="mt-2 text-sm text-stone-500">{payoutState.description}</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                <CreditCard className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-6 space-y-3 border-t border-stone-100 pt-5 dark:border-stone-800">
              <div className="flex items-center justify-between text-sm">
                <span className="text-stone-500">Marketplace status</span>
                <span className="font-medium capitalize text-stone-900 dark:text-white">{store.status}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-stone-500">Stripe account</span>
                <span className="font-medium text-stone-900 dark:text-white">{store.stripe_account_id ? "Connected" : "Not connected"}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-stone-500">Commission rate</span>
                <span className="font-medium text-stone-900 dark:text-white">{store.commission_rate}%</span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <Button type="button" className="w-full" isLoading={isConnectingStripe} leftIcon={<ShieldCheck className="h-4 w-4" />} onClick={() => void handleStripeConnect()}>
                {store.stripe_account_id ? "Refresh Stripe onboarding" : "Connect Stripe payouts"}
              </Button>
              {store.stripe_account_id && (
                <Button type="button" variant="outline" className="w-full" isLoading={isOpeningStripeDashboard} leftIcon={<ArrowUpRight className="h-4 w-4" />} onClick={() => void handleOpenStripeDashboard()}>
                  Open Stripe dashboard
                </Button>
              )}
            </div>
          </Card>

          {payoutEscalation ? (
            <StatePanel
              title={payoutEscalation.title}
              description={payoutEscalation.description}
              tone={payoutEscalation.tone}
            />
          ) : null}

          <Card>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-stone-400">Finance snapshot</p>
                <h2 className="mt-2 font-serif text-2xl text-stone-900 dark:text-white">Marketplace payout visibility</h2>
                <p className="mt-2 text-sm text-stone-500">Track what the marketplace has generated, what platform fees retained, and what should settle to Stripe.</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                <Wallet className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="border border-stone-200 p-4 dark:border-stone-800">
                <p className="text-xs uppercase tracking-widest text-stone-400">Gross sales</p>
                <p className="mt-2 text-xl font-medium text-stone-900 dark:text-white">{formatPrice(financeSnapshot?.grossSales ?? 0)}</p>
              </div>
              <div className="border border-stone-200 p-4 dark:border-stone-800">
                <p className="text-xs uppercase tracking-widest text-stone-400">Estimated payouts</p>
                <p className="mt-2 text-xl font-medium text-emerald-600">{formatPrice(financeSnapshot?.estimatedPayouts ?? 0)}</p>
              </div>
              <div className="border border-stone-200 p-4 dark:border-stone-800">
                <p className="text-xs uppercase tracking-widest text-stone-400">Platform fees</p>
                <p className="mt-2 text-xl font-medium text-stone-900 dark:text-white">{formatPrice(financeSnapshot?.platformFees ?? 0)}</p>
              </div>
              <div className="border border-stone-200 p-4 dark:border-stone-800">
                <p className="text-xs uppercase tracking-widest text-stone-400">Open orders</p>
                <p className="mt-2 text-xl font-medium text-stone-900 dark:text-white">{financeSnapshot?.openOrders ?? 0}</p>
              </div>
            </div>

            <div className="mt-5 space-y-3 border-t border-stone-100 pt-5 text-sm dark:border-stone-800">
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Settled orders</span>
                <span className="font-medium text-stone-900 dark:text-white">{financeSnapshot?.settledOrders ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Latest order activity</span>
                <span className="font-medium text-stone-900 dark:text-white">{financeSnapshot?.latestOrderDate ? new Date(financeSnapshot.latestOrderDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "No orders yet"}</span>
              </div>
            </div>

            <div className="mt-5 border-t border-stone-100 pt-5 dark:border-stone-800">
              <p className="text-xs font-medium uppercase tracking-widest text-stone-400">Recent payout drill-down</p>
              {financeOrders.length === 0 ? (
                <p className="mt-3 text-sm text-stone-500">Orders will appear here with fulfillment-driven payout states once your store starts selling.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {financeOrders.map((order) => {
                    const payoutState = getPayoutState(order.status, order.stripe_transfer_id, order.stripe_transfer_status);
                    return (
                      <div key={order.id} className="border border-stone-200 p-3 text-sm dark:border-stone-800">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-stone-900 dark:text-white">{order.order_number}</p>
                            <p className="mt-1 text-xs text-stone-500">{new Date(order.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                          </div>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                              payoutState.tone === "success"
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
                                : payoutState.tone === "warning"
                                  ? "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
                                  : payoutState.tone === "muted"
                                    ? "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400"
                                    : "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                            }`}
                          >
                            {payoutState.label}
                          </span>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs text-stone-500">
                          <span>Status: {order.status.replaceAll("_", " ")}</span>
                          <span>Net: {formatPrice(Number(order.total) - Number(order.platform_fee))}</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs text-stone-500">
                          <span>Transfer state</span>
                          <span className="font-medium text-stone-900 dark:text-white">
                            {order.stripe_transfer_status ? order.stripe_transfer_status.replaceAll("_", " ") : "Awaiting Stripe update"}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-xs text-stone-500">
                          <span>Reconciled</span>
                          <span className="font-medium text-stone-900 dark:text-white">
                            {order.payout_reconciled_at
                              ? new Date(order.payout_reconciled_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                              : "Not yet"}
                          </span>
                        </div>
                        <p className="mt-2 text-xs leading-relaxed text-stone-500">{payoutState.description}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>

          <Card>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-stone-400">Finance controls</p>
                <h2 className="mt-2 font-serif text-2xl text-stone-900 dark:text-white">Payout audit history</h2>
                <p className="mt-2 text-sm text-stone-500">Review reconciliation timestamps, settlement gaps, and orders that still need finance attention.</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                <Wallet className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="border border-stone-200 p-4 dark:border-stone-800">
                <p className="text-xs uppercase tracking-widest text-stone-400">Reconciled orders</p>
                <p className="mt-2 text-xl font-medium text-stone-900 dark:text-white">{payoutAudit?.reconciledOrders ?? 0}</p>
              </div>
              <div className="border border-stone-200 p-4 dark:border-stone-800">
                <p className="text-xs uppercase tracking-widest text-stone-400">Outstanding settlement</p>
                <p className="mt-2 text-xl font-medium text-amber-700 dark:text-amber-300">{payoutAudit?.outstandingSettlements ?? 0}</p>
              </div>
              <div className="border border-stone-200 p-4 dark:border-stone-800">
                <p className="text-xs uppercase tracking-widest text-stone-400">Audit alerts</p>
                <p className="mt-2 text-xl font-medium text-rose-600 dark:text-rose-300">{payoutAudit?.anomalyCount ?? 0}</p>
              </div>
              <div className="border border-stone-200 p-4 dark:border-stone-800">
                <p className="text-xs uppercase tracking-widest text-stone-400">Avg. reconcile time</p>
                <p className="mt-2 text-xl font-medium text-stone-900 dark:text-white">
                  {payoutAudit?.averageReconcileDays ? `${payoutAudit.averageReconcileDays}d` : "N/A"}
                </p>
              </div>
            </div>

            <div className="mt-5 border-t border-stone-100 pt-5 dark:border-stone-800">
              <p className="text-xs font-medium uppercase tracking-widest text-stone-400">Recent audit trail</p>
              {financeOrders.length === 0 ? (
                <p className="mt-3 text-sm text-stone-500">Audit records will appear here once payouts and reconciliation events start flowing through the marketplace.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {financeOrders.map((order) => {
                    const payoutState = getPayoutState(order.status, order.stripe_transfer_id, order.stripe_transfer_status);
                    const anomaly = getPayoutAnomaly(
                      order.status,
                      order.stripe_transfer_id,
                      order.stripe_transfer_status,
                      order.payout_reconciled_at
                    );

                    return (
                      <div key={order.id} className="border border-stone-200 p-3 text-sm dark:border-stone-800">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-stone-900 dark:text-white">{order.order_number}</p>
                            <p className="mt-1 text-xs text-stone-500">
                              Logged {new Date(order.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </p>
                          </div>
                          <div className="text-right">
                            <span
                              className={`inline-flex px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                                anomaly
                                  ? anomaly.tone === "danger"
                                    ? "bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300"
                                    : anomaly.tone === "warning"
                                      ? "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
                                      : "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400"
                                  : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
                              }`}
                            >
                              {anomaly?.label ?? "Audit clear"}
                            </span>
                          </div>
                        </div>
                        <div className="mt-3 grid gap-2 text-xs text-stone-500 sm:grid-cols-2">
                          <div className="flex items-center justify-between gap-3">
                            <span>Payout state</span>
                            <span className="font-medium text-stone-900 dark:text-white">{payoutState.label}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span>Transfer state</span>
                            <span className="font-medium text-stone-900 dark:text-white">
                              {order.stripe_transfer_status ? order.stripe_transfer_status.replaceAll("_", " ") : "Awaiting Stripe update"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span>Net payout</span>
                            <span className="font-medium text-stone-900 dark:text-white">{formatPrice(Number(order.total) - Number(order.platform_fee))}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span>Reconciled</span>
                            <span className="font-medium text-stone-900 dark:text-white">
                              {order.payout_reconciled_at
                                ? new Date(order.payout_reconciled_at).toLocaleString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                    hour: "numeric",
                                    minute: "2-digit",
                                  })
                                : "Pending"}
                            </span>
                          </div>
                        </div>
                        {anomaly ? <p className="mt-2 text-xs leading-relaxed text-stone-500">{anomaly.description}</p> : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>

          <Card>
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-400" />
              <div>
                <h2 className="text-sm font-medium text-stone-900 dark:text-white">Store launch checklist</h2>
                <p className="mt-2 text-sm text-stone-500">
                  {checklistCompleteCount} of {launchChecklist.length} launch-critical areas are complete for this storefront.
                </p>
                <div className="mt-4 space-y-3">
                  {launchChecklist.map((item) => (
                    <div key={item.label} className="border border-stone-200 p-3 text-sm dark:border-stone-800">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-stone-900 dark:text-white">{item.label}</p>
                          <p className="mt-1 text-xs leading-relaxed text-stone-500">{item.detail}</p>
                        </div>
                        <span
                          className={`inline-flex px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                            item.complete
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
                              : "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
                          }`}
                        >
                          {item.complete ? "Ready" : "Needs work"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <LaunchReadinessPanel
            title="Operational platform readiness"
            description="Configuration health for payments, payouts, content, and privileged workflows that affect your store launch."
            audience="vendor"
            checks={readinessData?.checks ?? []}
            loading={readinessLoading}
            error={readinessError}
            onRetry={() => void refetchReadiness()}
          />

          <PlatformInboxPanel
            title="Operations inbox"
            description="Quiet event follow-up for order exceptions, dispute changes, moderation outcomes, and settlement updates."
            emptyTitle="Your operations inbox is clear"
            emptyDescription="As your store sees payout, dispute, or moderation activity, the next steps will appear here."
          />

          <DelayDigestPanel
            title="Operations delay digest"
            description="A concise operational summary for settlement lag, dispute pressure, and unread follow-up that can be emailed to your account inbox."
          />

          <EventScaffoldPanel
            title="Marketplace event coverage"
            description="These event flows now power the in-app inbox and share email-ready boundaries for future delivery automation."
            audience="vendor"
            events={readinessData?.events ?? []}
            loading={readinessLoading}
            error={readinessError}
            onRetry={() => void refetchReadiness()}
          />
        </div>
      </div>
    </PageTransition>
  );
}
