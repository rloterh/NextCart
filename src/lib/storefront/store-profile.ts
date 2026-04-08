import type { Store } from "@/types";

export interface StoreProfileContent {
  supportEmail: string | null;
  shippingNote: string | null;
  storyHeadline: string | null;
  craftsmanshipNote: string | null;
  returnsPolicy: string | null;
  processingTime: string | null;
  policyHighlights: string[];
  reshipTemplate: string | null;
  returnInitiatedTemplate: string | null;
  returnApprovedTemplate: string | null;
  returnTransitTemplate: string | null;
  returnReceivedTemplate: string | null;
}

export interface StoreTrustBadge {
  label: string;
  tone: "neutral" | "success" | "accent";
}

function readSetting(settings: Record<string, unknown>, key: string) {
  const value = settings[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function getStoreProfileContent(store: Pick<Store, "settings">): StoreProfileContent {
  const settings = typeof store.settings === "object" && store.settings ? store.settings : {};
  const rawHighlights = Array.isArray(settings.policyHighlights) ? settings.policyHighlights : [];

  return {
    supportEmail: readSetting(settings, "supportEmail"),
    shippingNote: readSetting(settings, "shippingNote"),
    storyHeadline: readSetting(settings, "storyHeadline"),
    craftsmanshipNote: readSetting(settings, "craftsmanshipNote"),
    returnsPolicy: readSetting(settings, "returnsPolicy"),
    processingTime: readSetting(settings, "processingTime"),
    policyHighlights: rawHighlights
      .filter((value): value is string => typeof value === "string" && Boolean(value.trim()))
      .map((value) => value.trim())
      .slice(0, 4),
    reshipTemplate: readSetting(settings, "reshipTemplate"),
    returnInitiatedTemplate: readSetting(settings, "returnInitiatedTemplate"),
    returnApprovedTemplate: readSetting(settings, "returnApprovedTemplate"),
    returnTransitTemplate: readSetting(settings, "returnTransitTemplate"),
    returnReceivedTemplate: readSetting(settings, "returnReceivedTemplate"),
  };
}

export function getStoreTrustBadges(store: Pick<Store, "status" | "rating_count" | "rating_avg" | "total_orders" | "settings">): StoreTrustBadge[] {
  const profile = getStoreProfileContent(store);
  const badges: StoreTrustBadge[] = [];

  if (store.status === "approved") {
    badges.push({ label: "Approved vendor", tone: "success" });
  }

  if ((store.rating_count ?? 0) >= 5 && Number(store.rating_avg ?? 0) >= 4.5) {
    badges.push({ label: "Top rated", tone: "accent" });
  }

  if ((store.total_orders ?? 0) >= 25) {
    badges.push({ label: "Trusted fulfillment", tone: "neutral" });
  }

  if (profile.processingTime) {
    badges.push({ label: profile.processingTime, tone: "neutral" });
  }

  return badges.slice(0, 4);
}
