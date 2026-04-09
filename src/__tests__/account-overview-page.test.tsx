import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import AccountOverviewPage from "@/app/(storefront)/account/page";

const push = vi.fn();
const mockUseAuth = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => Promise.resolve({ count: 0 }),
      }),
    }),
  }),
}));

describe("AccountOverviewPage", () => {
  beforeEach(() => {
    push.mockReset();
    mockUseAuth.mockReset();
    window.history.replaceState({}, "", "/account");
  });

  it("shows a sign-in recovery panel when the session is missing", async () => {
    mockUseAuth.mockReturnValue({
      profile: null,
      user: null,
      isVendor: false,
      isAdmin: false,
      isLoading: false,
    });

    render(<AccountOverviewPage />);

    await waitFor(() => {
      expect(screen.getByText("Sign in to access your account workspace")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Go to login" })).toBeInTheDocument();
    });
  });

  it("shows a boundary notice when admin access is blocked", async () => {
    window.history.replaceState({}, "", "/account?boundary=admin&from=%2Fadmin%2Forders");
    mockUseAuth.mockReturnValue({
      profile: { full_name: "Casey Morgan", email: "casey@example.com", role: "buyer" },
      user: { id: "buyer-1" },
      isVendor: false,
      isAdmin: false,
      isLoading: false,
    });

    render(<AccountOverviewPage />);

    await waitFor(() => {
      expect(screen.getByText("Admin console access is restricted")).toBeInTheDocument();
      expect(screen.getByText(/\/admin\/orders/)).toBeInTheDocument();
    });
  });
});
