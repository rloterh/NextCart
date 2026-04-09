import { getPublicAppName, getPublicAppUrl } from "@/lib/platform/readiness.public";

export const APP_NAME = getPublicAppName();
export const APP_URL = getPublicAppUrl();

export const PROTECTED_ROUTES = ["/vendor", "/admin", "/account"];
export const VENDOR_ROUTES = ["/vendor"];
export const ADMIN_ROUTES = ["/admin"];

export function formatPrice(price: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(price);
}

export function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
