import React from "react";
import { render, screen } from "@testing-library/react";
import { CheckoutSuccessPageClient } from "@/app/(storefront)/checkout/success/checkout-success-page-client";

const mockUseSearchParams = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockUseSearchParams(),
}));

describe("CheckoutSuccessPageClient", () => {
  beforeEach(() => {
    mockUseSearchParams.mockReset();
  });

  it("shows multiple vendor orders as pending confirmation", () => {
    mockUseSearchParams.mockReturnValue({
      getAll: (key: string) => (key === "order" ? ["NC-100001", "NC-100002"] : []),
      get: (key: string) => (key === "count" ? "2" : null),
    });

    render(<CheckoutSuccessPageClient />);

    expect(screen.getByText("Orders created")).toBeInTheDocument();
    expect(screen.getByText(/split into multiple vendor orders/i)).toBeInTheDocument();
    expect(screen.getByText("Order NC-100001")).toBeInTheDocument();
    expect(screen.getByText("Order NC-100002")).toBeInTheDocument();
    expect(screen.getByText(/pending until Stripe confirms/i)).toBeInTheDocument();
  });

  it("shows confirmed payment copy when Stripe confirmation is complete", () => {
    mockUseSearchParams.mockReturnValue({
      getAll: (key: string) => (key === "order" ? ["NC-200001"] : []),
      get: (key: string) => {
        if (key === "count") return "1";
        if (key === "state") return "confirmed";
        return null;
      },
    });

    render(<CheckoutSuccessPageClient />);

    expect(screen.getAllByText("Payment confirmed")).toHaveLength(2);
    expect(screen.getByText(/Stripe confirmed payment for your order/i)).toBeInTheDocument();
    expect(screen.getByText("Order NC-200001")).toBeInTheDocument();
  });
});
