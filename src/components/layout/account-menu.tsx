"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Heart, LayoutDashboard, LogOut, Settings, ShoppingBag, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useUIStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils/cn";

export function AccountMenu() {
  const router = useRouter();
  const addToast = useUIStore((s) => s.addToast);
  const { profile, isVendor, isAdmin, signOut, isLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    addToast({ type: "success", title: "Signed out successfully" });
    setOpen(false);
    router.push("/");
    router.refresh();
    setSigningOut(false);
  }

  const firstName = profile?.full_name?.split(" ")[0] ?? "Account";

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex items-center gap-2 rounded-sm border border-transparent px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] transition-colors",
          open
            ? "border-stone-200 bg-stone-50 text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-white"
            : "text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-white"
        )}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <User className="h-[18px] w-[18px]" />
        <span className="hidden sm:inline">{firstName}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 top-full z-50 mt-2 w-72 border border-stone-200 bg-white shadow-xl shadow-stone-900/10 dark:border-stone-800 dark:bg-stone-950"
            role="menu"
          >
            <div className="border-b border-stone-100 px-4 py-4 dark:border-stone-800">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-stone-400">Signed in as</p>
              <p className="mt-2 text-sm font-medium text-stone-900 dark:text-white">{profile?.full_name || "NexCart member"}</p>
              <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{profile?.email}</p>
            </div>

            <div className="p-2">
              <Link href="/account" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm text-stone-600 transition-colors hover:bg-stone-50 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-900 dark:hover:text-white">
                <LayoutDashboard className="h-4 w-4" />
                Account overview
              </Link>
              <Link href="/account/orders" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm text-stone-600 transition-colors hover:bg-stone-50 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-900 dark:hover:text-white">
                <ShoppingBag className="h-4 w-4" />
                Orders
              </Link>
              <Link href="/account/wishlist" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm text-stone-600 transition-colors hover:bg-stone-50 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-900 dark:hover:text-white">
                <Heart className="h-4 w-4" />
                Wishlist
              </Link>
              {isVendor && (
                <Link href="/vendor/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm text-amber-700 transition-colors hover:bg-amber-50 hover:text-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/30">
                  <StorefrontIcon />
                  Vendor dashboard
                </Link>
              )}
              {isAdmin && (
                <Link href="/admin/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm text-red-700 transition-colors hover:bg-red-50 hover:text-red-800 dark:text-red-400 dark:hover:bg-red-950/30">
                  <Settings className="h-4 w-4" />
                  Admin console
                </Link>
              )}
            </div>

            <div className="border-t border-stone-100 p-2 dark:border-stone-800">
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut || isLoading}
                className="flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left text-sm text-stone-600 transition-colors hover:bg-stone-50 hover:text-stone-900 disabled:opacity-50 dark:text-stone-400 dark:hover:bg-stone-900 dark:hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                {signingOut ? "Signing out..." : "Sign out"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StorefrontIcon() {
  return (
    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-600/15 text-[10px] font-bold text-amber-700 dark:text-amber-400">
      V
    </span>
  );
}
