import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import AdminProductsPage from "@/app/(admin)/admin/products/page";
import VendorOrdersPage from "@/app/(vendor)/vendor/orders/page";

const toast = vi.fn();
const mockUseAuth = vi.fn();

function createQueryBuilder(data: unknown[] = []) {
  return {
    eq: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    then: (resolve: (value: { data: unknown[]; error: null }) => void) => resolve({ data, error: null }),
  };
}

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/admin/orders",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/stores/ui-store", () => ({
  useUIStore: (selector: (state: { addToast: typeof toast }) => unknown) => selector({ addToast: toast }),
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: () => ({
    from: (table: string) => {
      if (table === "products") {
        return {
          select: () => createQueryBuilder(),
        };
      }

      if (table === "orders") {
        return {
          select: () => createQueryBuilder(),
        };
      }

      return {
        select: () => createQueryBuilder(),
      };
    },
  }),
}));

describe("operational queue continuity", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    toast.mockReset();
  });

  it("restores admin product moderation search and filter preferences", async () => {
    window.localStorage.setItem("nexcart.admin.products.filter", "paused");
    window.localStorage.setItem("nexcart.admin.products.search", "linen");

    render(<AdminProductsPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("linen")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Paused" })).toHaveClass("bg-stone-900");
    });
  });

  it("restores vendor order saved view, status, and search preferences", async () => {
    mockUseAuth.mockReturnValue({
      store: { id: "store-1" },
      isLoading: false,
    });
    window.localStorage.setItem("nexcart.vendor.orders.view", "exceptions");
    window.localStorage.setItem("nexcart.vendor.orders.status", "delivery_failed");
    window.localStorage.setItem("nexcart.vendor.orders.search", "Olivia");

    render(<VendorOrdersPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Olivia")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Exceptions" })).toHaveClass("bg-stone-900");
      expect(screen.getByRole("button", { name: "delivery failed" })).toHaveClass("bg-stone-900");
    });
  });
});
