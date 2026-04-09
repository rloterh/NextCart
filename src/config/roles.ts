import type { UserRole } from "@/types";

export type Permission =
  | "products:create" | "products:read" | "products:update" | "products:delete"
  | "orders:read" | "orders:update" | "orders:manage-all"
  | "store:manage" | "store:payout"
  | "reviews:write" | "reviews:moderate"
  | "users:manage" | "vendors:approve"
  | "categories:manage" | "platform:settings";

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  buyer: ["products:read", "orders:read", "reviews:write"],
  vendor: [
    "products:create", "products:read", "products:update", "products:delete",
    "orders:read", "orders:update",
    "store:manage", "store:payout",
    "reviews:write",
  ],
  admin: [
    "products:create", "products:read", "products:update", "products:delete",
    "orders:read", "orders:update", "orders:manage-all",
    "store:manage", "store:payout",
    "reviews:write", "reviews:moderate",
    "users:manage", "vendors:approve",
    "categories:manage", "platform:settings",
  ],
};

export const ROLE_METADATA: Record<UserRole, { label: string; description: string }> = {
  buyer: {
    label: "Buyer",
    description: "Shops the marketplace, places orders, and manages saved commerce flows.",
  },
  vendor: {
    label: "Vendor",
    description: "Operates a storefront, manages products, and handles fulfillment and payouts.",
  },
  admin: {
    label: "Admin",
    description: "Oversees governance, moderation, disputes, finance operations, and platform controls.",
  },
};

export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  "products:create": "Create new catalog listings",
  "products:read": "View product and catalog records",
  "products:update": "Edit existing product listings",
  "products:delete": "Delete or archive catalog listings",
  "orders:read": "View order records",
  "orders:update": "Update owned or assigned order workflows",
  "orders:manage-all": "Manage marketplace-wide orders and escalations",
  "store:manage": "Update storefront settings and operational details",
  "store:payout": "Review payout and settlement information",
  "reviews:write": "Leave buyer reviews",
  "reviews:moderate": "Moderate review visibility and trust signals",
  "users:manage": "Change marketplace user roles and access",
  "vendors:approve": "Approve, suspend, or reinstate vendor storefronts",
  "categories:manage": "Manage category structure and merchandising taxonomy",
  "platform:settings": "Access privileged platform settings and automation controls",
};

const ROLE_HIERARCHY: UserRole[] = ["buyer", "vendor", "admin"];

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function hasMinRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY.indexOf(userRole) >= ROLE_HIERARCHY.indexOf(requiredRole);
}
