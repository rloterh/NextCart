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

const ROLE_HIERARCHY: UserRole[] = ["buyer", "vendor", "admin"];

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function hasMinRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY.indexOf(userRole) >= ROLE_HIERARCHY.indexOf(requiredRole);
}
