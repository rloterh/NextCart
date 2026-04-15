import { describe, expect, it } from "vitest";
import { deriveCheckoutSuccessState, normalizeCheckoutPaymentState } from "@/lib/stripe/checkout-payment";

describe("checkout payment helpers", () => {
  it("keeps pending orders in a payment-required state until Stripe advances them", () => {
    expect(
      normalizeCheckoutPaymentState({
        orderStatus: "pending",
        stripeStatus: "requires_action",
      })
    ).toBe("requires_payment");
  });

  it("treats confirmed fulfillment statuses as paid even if the intent status is stale", () => {
    expect(
      normalizeCheckoutPaymentState({
        orderStatus: "confirmed",
        stripeStatus: "requires_payment_method",
      })
    ).toBe("succeeded");
  });

  it("derives the final confirmation state from the set of payment outcomes", () => {
    expect(deriveCheckoutSuccessState(["succeeded", "succeeded"])).toBe("confirmed");
    expect(deriveCheckoutSuccessState(["succeeded", "processing"])).toBe("processing");
    expect(deriveCheckoutSuccessState(["succeeded", "requires_payment"])).toBe("pending");
  });
});
