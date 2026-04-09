import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { VendorSettingsPageClient } from "@/app/(vendor)/vendor/settings/vendor-settings-page-client";

const toast = vi.fn();
const refreshProfile = vi.fn();
const mockUseAuth = vi.fn();
const mockUsePlatformReadiness = vi.fn();

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/hooks/use-platform-readiness", () => ({
  usePlatformReadiness: () => mockUsePlatformReadiness(),
}));

vi.mock("@/stores/ui-store", () => ({
  useUIStore: (selector: (state: { addToast: typeof toast }) => unknown) => selector({ addToast: toast }),
}));

vi.mock("@/components/platform/event-scaffold-panel", () => ({
  EventScaffoldPanel: () => <div data-testid="event-scaffold-panel" />,
}));

vi.mock("@/components/platform/launch-readiness-panel", () => ({
  LaunchReadinessPanel: () => <div data-testid="launch-readiness-panel" />,
}));

vi.mock("@/components/platform/delay-digest-panel", () => ({
  DelayDigestPanel: () => <div data-testid="delay-digest-panel" />,
}));

vi.mock("@/components/platform/platform-inbox-panel", () => ({
  PlatformInboxPanel: () => <div data-testid="platform-inbox-panel" />,
}));

vi.mock("@/components/platform/automation-ops-panel", () => ({
  AutomationOpsPanel: () => <div data-testid="automation-ops-panel" />,
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: () => ({
    from: (table: string) => {
      if (table === "orders") {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: [], error: null }),
          }),
        };
      }

      return {
        update: () => ({
          eq: () => Promise.resolve({ error: null }),
        }),
      };
    },
  }),
}));

describe("VendorSettingsPageClient", () => {
  beforeEach(() => {
    toast.mockReset();
    refreshProfile.mockReset();
    mockUseAuth.mockReset();
    mockUsePlatformReadiness.mockReset();

    mockUseAuth.mockReturnValue({
      store: {
        id: "store-1",
        name: "North Atelier",
        slug: "north-atelier",
        description: "Crafted essentials.",
        logo_url: null,
        banner_url: null,
        status: "approved",
        stripe_account_id: "acct_123",
        commission_rate: 12,
        settings: {},
      },
      user: { email: "owner@example.com" },
      refreshProfile,
      isLoading: false,
    });
    mockUsePlatformReadiness.mockReturnValue({
      data: { checks: [] },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it("shows the vendor payout permission boundary guidance", async () => {
    render(<VendorSettingsPageClient />);

    await waitFor(() => {
      expect(screen.getByText("Vendor payout and storefront boundary")).toBeInTheDocument();
      expect(screen.getByText(/Store settings, support contacts, and payout setup/)).toBeInTheDocument();
    });
  });
});
