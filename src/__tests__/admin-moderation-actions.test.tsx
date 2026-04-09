import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AdminModerationPage from "@/app/(admin)/admin/moderation/page";

const toast = vi.fn();

function createLimitedQuery(data: unknown[]) {
  return {
    limit: () => Promise.resolve({ data, error: null }),
  };
}

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/admin/moderation",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/stores/ui-store", () => ({
  useUIStore: (selector: (state: { addToast: typeof toast }) => unknown) => selector({ addToast: toast }),
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: () => ({
    from: (table: string) => {
      if (table === "products") {
        return {
          select: () => ({
            order: () => createLimitedQuery([]),
          }),
        };
      }

      if (table === "stores") {
        return {
          select: () => ({
            order: () =>
              createLimitedQuery([
                {
                  id: "vendor-1",
                  owner_id: "owner-1",
                  name: "North Atelier",
                  slug: "north-atelier",
                  status: "pending",
                  rating_avg: 4.7,
                  rating_count: 12,
                  total_orders: 24,
                  total_revenue: 4200,
                  created_at: "2026-04-01T00:00:00.000Z",
                  owner: { id: "owner-1", full_name: "Avery Stone", email: "avery@example.com" },
                },
              ]),
          }),
        };
      }

      if (table === "reviews" || table === "orders") {
        return {
          select: () => ({
            order: () => createLimitedQuery([]),
          }),
        };
      }

      if (table === "admin_actions") {
        return {
          select: () => ({
            in: () => ({
              order: () => createLimitedQuery([]),
            }),
          }),
        };
      }

      return {
        select: () => ({
          order: () => createLimitedQuery([]),
        }),
      };
    },
  }),
}));

describe("AdminModerationPage actions", () => {
  beforeEach(() => {
    toast.mockReset();
  });

  it("requires a policy reason before approving a vendor", async () => {
    render(<AdminModerationPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Approve" }));

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "error",
          title: "Policy reason required",
        })
      );
    });
  });
});
