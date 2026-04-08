"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Archive, ArchiveRestore, Edit, Eye, MoreHorizontal, PauseCircle, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Product, ProductStatus } from "@/types";

interface ProductRowActionsProps {
  product: Product;
  onStatusChange: (productId: string, nextStatus: ProductStatus) => Promise<void>;
}

export function ProductRowActions({ product, onStatusChange }: ProductRowActionsProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const actions: Array<{
    label: string;
    icon: typeof Eye;
    href?: string;
    status?: ProductStatus;
    tone?: "default" | "warning";
  }> = [
    { label: "Preview live page", icon: Eye, href: `/products/${product.store_id}/${product.slug}` },
    { label: "Edit details", icon: Edit, href: `/vendor/products/${product.id}` },
    product.status === "active"
      ? { label: "Pause listing", icon: PauseCircle, status: "paused" }
      : { label: "Publish listing", icon: PlayCircle, status: "active" },
    product.status === "archived"
      ? { label: "Restore listing", icon: ArchiveRestore, status: "draft" }
      : { label: "Archive listing", icon: Archive, status: "archived", tone: "warning" },
  ];

  async function handleAction(status?: ProductStatus) {
    if (!status) return;
    await onStatusChange(product.id, status);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button type="button" onClick={() => setOpen((current) => !current)} className="rounded-sm p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-white" aria-expanded={open} aria-label={`Open actions for ${product.name}`}>
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-56 border border-stone-200 bg-white p-1.5 shadow-xl dark:border-stone-800 dark:bg-stone-900">
          {actions.map((action) =>
            action.href ? (
              <Link
                key={action.label}
                href={action.href}
                target={action.href.startsWith("/products/") ? "_blank" : undefined}
                rel={action.href.startsWith("/products/") ? "noreferrer" : undefined}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm text-stone-600 transition-colors hover:bg-stone-50 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-white"
              >
                <action.icon className="h-4 w-4" />
                {action.label}
              </Link>
            ) : (
              <button
                key={action.label}
                type="button"
                onClick={() => void handleAction(action.status)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left text-sm transition-colors",
                  action.tone === "warning"
                    ? "text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/30"
                    : "text-stone-600 hover:bg-stone-50 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-white"
                )}
              >
                <action.icon className="h-4 w-4" />
                {action.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
