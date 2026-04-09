export type AccessBoundary = "admin" | "vendor";

export function sanitizeRedirectPath(value: string | null | undefined, fallback = "/") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}

export function buildRedirectTarget(pathname: string, search = "") {
  return `${pathname}${search}`;
}

export function getAccessBoundaryNotice(boundary: string | null | undefined, from?: string | null) {
  if (boundary !== "admin" && boundary !== "vendor") {
    return null;
  }

  const fromLabel = from ? ` (${from})` : "";

  if (boundary === "admin") {
    return {
      title: "Admin console access is restricted",
      description: `Your current account does not include admin governance access${fromLabel}. Continue in your account workspace or ask an existing admin to review your permissions.`,
    };
  }

  return {
    title: "Vendor workspace access is restricted",
    description: `Your current account does not include vendor workspace access${fromLabel}. Continue in your buyer account or apply for vendor approval before returning here.`,
  };
}
