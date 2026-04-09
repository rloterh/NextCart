import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { ORDER_STATUS_CONFIG } from "@/types/orders";
import type { DisputePriority, OrderStatus, ProductStatus, VendorStatus } from "@/types";

type BadgeTone = "default" | "info" | "success" | "warning" | "danger" | "muted";

const badgeToneClasses: Record<BadgeTone, string> = {
  default: "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
  info: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300",
  success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300",
  warning: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300",
  danger: "bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300",
  muted: "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400",
};

const disputePriorityTone: Record<DisputePriority, BadgeTone> = {
  low: "muted",
  medium: "info",
  high: "warning",
  critical: "danger",
};

const vendorStatusTone: Record<VendorStatus, BadgeTone> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
  suspended: "danger",
};

const productStatusTone: Record<ProductStatus, BadgeTone> = {
  draft: "muted",
  active: "success",
  paused: "warning",
  archived: "muted",
};

interface StatusBadgeProps {
  children: ReactNode;
  className?: string;
  dotClassName?: string;
  showDot?: boolean;
  tone?: BadgeTone;
}

export function StatusBadge({ children, className, dotClassName, showDot = false, tone = "default" }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em]",
        badgeToneClasses[tone],
        className
      )}
    >
      {showDot ? <span className={cn("h-1.5 w-1.5 rounded-full bg-current", dotClassName)} /> : null}
      {children}
    </span>
  );
}

export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em]",
        ORDER_STATUS_CONFIG[status].color,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", ORDER_STATUS_CONFIG[status].dot)} />
      {ORDER_STATUS_CONFIG[status].label}
    </span>
  );
}

export function PriorityBadge({ priority, className }: { priority: DisputePriority; className?: string }) {
  return (
    <StatusBadge tone={disputePriorityTone[priority]} className={className}>
      {priority}
    </StatusBadge>
  );
}

export function VendorStatusBadge({ status, className }: { status: VendorStatus; className?: string }) {
  return (
    <StatusBadge tone={vendorStatusTone[status]} className={className}>
      {status.replaceAll("_", " ")}
    </StatusBadge>
  );
}

export function ProductStatusBadge({ status, className }: { status: ProductStatus; className?: string }) {
  return (
    <StatusBadge tone={productStatusTone[status]} className={className}>
      {status.replaceAll("_", " ")}
    </StatusBadge>
  );
}

export function ToneBadge({
  tone,
  children,
  className,
}: {
  tone: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <StatusBadge tone={tone} className={className}>
      {children}
    </StatusBadge>
  );
}
