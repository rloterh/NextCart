"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, ShoppingBag, Heart, Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/hooks/use-auth";
import { useCartStore } from "@/stores/cart-store";
import { AccountMenu } from "@/components/layout/account-menu";

const navLinks = [
  { label: "Shop", href: "/shop" },
  { label: "Categories", href: "/categories" },
  { label: "New Arrivals", href: "/shop?sort=newest" },
  { label: "Vendors", href: "/vendors" },
];

export function StorefrontHeader() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const itemCount = useCartStore((s) => s.itemCount());
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      {/* Announcement bar */}
      <div className="bg-stone-900 py-1.5 text-center text-[11px] font-medium uppercase tracking-[0.2em] text-stone-300 dark:bg-stone-800">
        Free shipping on orders over $75
      </div>

      <header className="sticky top-0 z-50 border-b border-stone-200/60 bg-white/95 backdrop-blur-md dark:border-stone-800 dark:bg-stone-950/95">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          {/* Mobile menu */}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="p-1 lg:hidden">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="font-serif text-2xl tracking-tight text-stone-900 dark:text-white">
              Nex<span className="font-normal italic text-amber-700 dark:text-amber-500">Cart</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-8 lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-xs font-medium uppercase tracking-[0.15em] transition-colors",
                  pathname === link.href
                    ? "text-stone-900 dark:text-white"
                    : "text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="rounded-sm p-2 text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white"
            >
              <Search className="h-[18px] w-[18px]" />
            </button>

            {isAuthenticated && (
              <Link href="/account/wishlist" className="rounded-sm p-2 text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white">
                <Heart className="h-[18px] w-[18px]" />
              </Link>
            )}

            <Link href="/cart" className="relative rounded-sm p-2 text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white">
              <ShoppingBag className="h-[18px] w-[18px]" />
              {itemCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center bg-stone-900 text-[9px] font-bold text-white dark:bg-white dark:text-stone-900">
                  {itemCount}
                </span>
              )}
            </Link>

            {isAuthenticated ? (
              <div className="ml-2">
                <AccountMenu />
              </div>
            ) : (
              <Link href="/login" className="ml-3 text-xs font-medium uppercase tracking-wider text-stone-700 hover:text-stone-900 dark:text-stone-300">
                Sign in
              </Link>
            )}
          </div>
        </div>

        {/* Search bar (expandable) */}
        {searchOpen && (
          <div className="border-t border-stone-100 px-6 py-3 dark:border-stone-800">
            <div className="mx-auto max-w-2xl">
              <div className="relative">
                <Search className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search products, brands, categories..."
                  autoFocus
                  className="w-full border-b border-stone-200 bg-transparent py-2 pl-7 pr-4 text-sm placeholder:text-stone-400 focus:border-stone-900 focus:outline-none dark:border-stone-700 dark:focus:border-stone-400"
                />
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-white pt-28 dark:bg-stone-950 lg:hidden">
          <nav className="flex flex-col items-center gap-6 py-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="text-sm font-medium uppercase tracking-[0.2em] text-stone-700 dark:text-stone-300"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
