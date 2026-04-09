import { buildRedirectTarget, getAccessBoundaryNotice, sanitizeRedirectPath } from "@/lib/auth/navigation";

describe("auth navigation helpers", () => {
  it("keeps safe relative redirects", () => {
    expect(sanitizeRedirectPath("/vendor/orders?view=exceptions")).toBe("/vendor/orders?view=exceptions");
  });

  it("rejects external or malformed redirects", () => {
    expect(sanitizeRedirectPath("https://example.com", "/account")).toBe("/account");
    expect(sanitizeRedirectPath("//evil.test", "/account")).toBe("/account");
    expect(sanitizeRedirectPath(undefined, "/account")).toBe("/account");
  });

  it("builds redirect targets including search params", () => {
    expect(buildRedirectTarget("/admin/orders", "?view=payout_alerts")).toBe("/admin/orders?view=payout_alerts");
  });

  it("describes admin and vendor access boundaries", () => {
    expect(getAccessBoundaryNotice("admin", "/admin/orders")?.title).toContain("Admin");
    expect(getAccessBoundaryNotice("vendor", "/vendor/products")?.title).toContain("Vendor");
    expect(getAccessBoundaryNotice("buyer", "/account")).toBeNull();
  });
});
