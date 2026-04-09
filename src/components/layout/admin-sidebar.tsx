"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Store, Users, Package, Shield, ArrowLeft, ClipboardList, Scale, ScrollText, Activity, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const adminNav = [
  { label: "Overview", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Moderation", href: "/admin/moderation", icon: Shield },
  { label: "Disputes", href: "/admin/disputes", icon: Scale },
  { label: "Vendors", href: "/admin/vendors", icon: Store },
  { label: "Orders", href: "/admin/orders", icon: ClipboardList },
  { label: "Audit", href: "/admin/audit", icon: ScrollText },
  { label: "System", href: "/admin/system", icon: Activity },
  { label: "Access", href: "/admin/access", icon: KeyRound },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Products", href: "/admin/products", icon: Package },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-[240px] flex-col border-r border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-950">
      <div className="flex h-14 items-center gap-2 border-b border-stone-200 px-5 dark:border-stone-800">
        <Shield className="h-4 w-4 text-red-500" />
        <span className="text-sm font-medium text-stone-900 dark:text-white">Admin panel</span>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {adminNav.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm transition-colors",
                isActive
                  ? "bg-red-50 font-medium text-red-900 dark:bg-red-900/10 dark:text-red-300"
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
        <Link href="/" className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white">
          <ArrowLeft className="h-4 w-4" />Back to store
        </Link>
      </div>
    </aside>
  );
}
