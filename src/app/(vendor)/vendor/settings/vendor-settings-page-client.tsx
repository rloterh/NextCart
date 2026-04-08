"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, ArrowUpRight, CreditCard, RefreshCcw, ShieldCheck, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useUIStore } from "@/stores/ui-store";

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
}

export function VendorSettingsPageClient({ stripeState }: VendorSettingsPageClientProps) {
  const { store, user, refreshProfile } = useAuth();
  const addToast = useUIStore((state) => state.addToast);
  const [form, setForm] = useState<StoreSettingsFormState>({
    name: "",
    slug: "",
    description: "",
    logoUrl: "",
    bannerUrl: "",
    supportEmail: "",
    shippingNote: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isConnectingStripe, setIsConnectingStripe] = useState(false);
  const [isOpeningStripeDashboard, setIsOpeningStripeDashboard] = useState(false);

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

  function updateField<Key extends keyof StoreSettingsFormState>(key: Key, value: StoreSettingsFormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();

    if (!store) return;

    setIsSaving(true);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase
      .from("stores")
      .update({
        name: form.name,
        slug: form.slug,
        description: form.description || null,
        logo_url: form.logoUrl || null,
        banner_url: form.bannerUrl || null,
        settings: {
          ...(store.settings ?? {}),
          supportEmail: form.supportEmail || null,
          shippingNote: form.shippingNote || null,
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
      <div className="border border-dashed border-stone-200 bg-white p-10 text-center dark:border-stone-800 dark:bg-stone-900">
        <Store className="mx-auto h-8 w-8 text-stone-300 dark:text-stone-700" />
        <h1 className="mt-4 font-serif text-2xl text-stone-900 dark:text-white">Store profile unavailable</h1>
        <p className="mt-2 text-sm text-stone-500">
          Finish loading the vendor workspace or create a store record before editing settings.
        </p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-6xl space-y-6">
      <div className="max-w-3xl">
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-amber-700 dark:text-amber-500">Vendor operations</p>
        <h1 className="mt-3 font-serif text-3xl text-stone-900 dark:text-white">Store settings and payouts</h1>
        <p className="mt-3 text-sm leading-relaxed text-stone-500">
          Shape how your storefront feels, how customers contact you, and how Stripe Connect powers marketplace payouts.
        </p>
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
            </div>

            <div className="mt-6 flex justify-end">
              <Button type="submit" isLoading={isSaving}>Save store settings</Button>
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

          <Card>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                <RefreshCcw className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-medium text-stone-900 dark:text-white">Operational notes</h2>
                <ul className="mt-3 space-y-2 text-sm text-stone-500">
                  <li>Keep support details current so order issues route to the right inbox quickly.</li>
                  <li>Use the Stripe dashboard to verify payouts, review onboarding requirements, and inspect payment events.</li>
                  <li>When your store status is pending, admins can still review the profile and payout readiness before approval.</li>
                </ul>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-400" />
              <div>
                <h2 className="text-sm font-medium text-stone-900 dark:text-white">Publishing reminder</h2>
                <p className="mt-2 text-sm text-stone-500">Buyers see stronger conversion when your store description, hero media, shipping note, and payout onboarding are all complete before launch.</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
