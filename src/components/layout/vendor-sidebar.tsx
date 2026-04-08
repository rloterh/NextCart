"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, ShoppingCart, BarChart3, Settings, Store, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/hooks/use-auth";

const vendorNav = [
  { label: "Overview", href: "/vendor/dashboard", icon: LayoutDashboard },
  { label: "Products", href: "/vendor/products", icon: Package },
  { label: "Orders", href: "/vendor/orders", icon: ShoppingCart },
  { label: "Analytics", href: "/vendor/analytics", icon: BarChart3 },
  { label: "Store Settings", href: "/vendor/settings", icon: Settings },
];

export function VendorSidebar() {
  const pathname = usePathname();
  const { store } = useAuth();

  return (
    <aside className="flex h-screen w-[240px] flex-col border-r border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-950">
      <div className="flex h-14 items-center gap-2 border-b border-stone-200 px-5 dark:border-stone-800">
        <Store className="h-4 w-4 text-amber-600" />
        <span className="truncate text-sm font-medium text-stone-900 dark:text-white">
          {store?.name ?? "My Store"}
        </span>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {vendorNav.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm transition-colors",
                isActive
                  ? "bg-amber-50 font-medium text-amber-900 dark:bg-amber-900/10 dark:text-amber-300"
                  : "text-stone-500 hover:bg-stone-50 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-stone-200 p-3 dark:border-stone-800">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm text-stone-500 transition-colors hover:text-stone-900 dark:text-stone-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to store
        </Link>
      </div>
    </aside>
  );
}
