import type { DisputePriority, DisputeStatus } from "@/types";

const SLA_HOURS: Record<DisputePriority, number> = {
  critical: 4,
  high: 12,
  medium: 24,
  low: 48,
};

type SlaTone = "muted" | "default" | "warning" | "danger";

export interface DisputeSlaState {
  dueAt: string;
  dueInHours: number;
  label: string;
  tone: SlaTone;
}

export function isActiveDispute(status: DisputeStatus) {
  return !["resolved", "dismissed"].includes(status);
}

export function getDisputeSlaState(createdAt: string, priority: DisputePriority, status: DisputeStatus): DisputeSlaState {
  const created = new Date(createdAt).getTime();
  const dueAtTime = created + SLA_HOURS[priority] * 60 * 60 * 1000;
  const dueInHours = Math.round((dueAtTime - Date.now()) / (60 * 60 * 1000));
  const dueAt = new Date(dueAtTime).toISOString();

  if (!isActiveDispute(status)) {
    return {
      dueAt,
      dueInHours,
      label: "Closed",
      tone: "muted",
    };
  }

  if (dueInHours < 0) {
    return {
      dueAt,
      dueInHours,
      label: `${Math.abs(dueInHours)}h overdue`,
      tone: "danger",
    };
  }

  if (dueInHours <= 6) {
    return {
      dueAt,
      dueInHours,
      label: `${dueInHours}h remaining`,
      tone: "warning",
    };
  }

  return {
    dueAt,
    dueInHours,
    label: `${dueInHours}h remaining`,
    tone: "default",
  };
}

export function getSlaToneClasses(tone: SlaTone) {
  switch (tone) {
    case "danger":
      return "bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300";
    case "warning":
      return "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300";
    case "default":
      return "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300";
    default:
      return "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300";
  }
}
