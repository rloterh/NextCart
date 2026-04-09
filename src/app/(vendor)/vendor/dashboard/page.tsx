"use client";

import { Package, ShoppingCart, DollarSign, Eye } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PageIntro, PageTransition } from "@/components/ui/page-shell";
import { StatePanel } from "@/components/ui/state-panel";
import { useAuth } from "@/hooks/use-auth";

const quickActions = [
  { label: "Products", href: "/vendor/products", icon: Package, description: "Manage catalog listings, inventory, and bulk actions." },
  { label: "Orders", href: "/vendor/orders", icon: ShoppingCart, description: "Handle fulfillment, exceptions, and buyer updates." },
  { label: "Analytics", href: "/vendor/analytics", icon: Eye, description: "Track sales, exception-rate, and settlement health." },
  { label: "Finance and settings", href: "/vendor/settings", icon: DollarSign, description: "Review payout readiness, policies, and trust content." },
];

export default function VendorDashboard() {
  const router = useRouter();
  const { store } = useAuth();

  return (
    <PageTransition>
      <PageIntro
        eyebrow="Vendor"
        title={`Welcome${store?.name ? `, ${store.name}` : ""}`}
        description="Use this workspace to move between catalog operations, fulfillment, analytics, and payout readiness without losing context."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {quickActions.map((action) => (
          <Link key={action.href} href={action.href} className="group">
            <Card className="h-full transition-colors hover:bg-stone-50 dark:hover:bg-stone-900/80">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{action.label}</CardTitle>
                <div className="rounded-full bg-stone-100 p-2 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                  <action.icon className="h-4 w-4" />
                </div>
              </div>
              <CardDescription className="mt-3">{action.description}</CardDescription>
            </Card>
          </Link>
        ))}
      </div>

      <StatePanel
        title="Workspace status"
        description="Catalog operations, order fulfillment, analytics, and finance controls are all now active in this vendor workspace. Use the links above to jump straight into the area you need."
        actionLabel="Open products"
        onAction={() => router.push("/vendor/products")}
      />
    </PageTransition>
  );
}
