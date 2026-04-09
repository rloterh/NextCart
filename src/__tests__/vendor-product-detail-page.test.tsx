import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import VendorProductDetailPage from "@/app/(vendor)/vendor/products/[id]/page";

const mockUseAuth = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "product-1" }),
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: { message: "Product lookup failed." } }),
          }),
        }),
      }),
    }),
  }),
}));

describe("VendorProductDetailPage", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    mockUseAuth.mockReturnValue({
      store: { id: "store-1" },
      isLoading: false,
    });
  });

  it("shows a retryable editor failure state when the product cannot be loaded", async () => {
    render(<VendorProductDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("We could not load this product editor")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Retry editor" })).toBeInTheDocument();
    });
  });
});
