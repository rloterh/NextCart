import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Inbox, RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";

type StateTone = "default" | "warning" | "danger";

const toneClasses: Record<StateTone, string> = {
  default: "border-stone-200 bg-stone-50/80 text-stone-600 dark:border-stone-800 dark:bg-stone-900/40 dark:text-stone-300",
  warning: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200",
  danger: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300",
};

interface StatePanelProps {
  title: string;
  description?: string;
  tone?: StateTone;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: LucideIcon;
  className?: string;
}

export function StatePanel({
  title,
  description,
  tone = "default",
  icon: Icon = tone === "danger" ? AlertTriangle : Inbox,
  actionLabel,
  onAction,
  actionIcon: ActionIcon = RefreshCcw,
  className,
}: StatePanelProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center border px-6 py-10 text-center", toneClasses[tone], className)}>
      <div className="rounded-full bg-white/80 p-3 shadow-sm dark:bg-stone-950/60">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 font-serif text-lg text-stone-900 dark:text-white">{title}</p>
      {description ? <p className="mt-2 max-w-md text-sm">{description}</p> : null}
      {actionLabel && onAction ? (
        <Button size="sm" variant={tone === "danger" ? "outline" : "ghost"} className="mt-5" onClick={onAction} leftIcon={<ActionIcon className="h-3.5 w-3.5" />}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

export function SkeletonBlock({
  className,
  lines = 1,
}: {
  className?: string;
  lines?: number;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <div key={index} className="h-4 animate-pulse rounded-sm bg-stone-100 dark:bg-stone-800" />
      ))}
    </div>
  );
}
