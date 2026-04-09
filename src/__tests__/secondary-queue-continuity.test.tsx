import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import AdminAccessPage from "@/app/(admin)/admin/access/page";
import AdminUsersPage from "@/app/(admin)/admin/users/page";

const toast = vi.fn();
const mockUsePlatformAccess = vi.fn();

function createProfilesQueryBuilder(data: unknown[] = []) {
  return {
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    then: (resolve: (value: { data: unknown[]; error: null }) => void) => resolve({ data, error: null }),
  };
}

vi.mock("@/stores/ui-store", () => ({
  useUIStore: (selector: (state: { addToast: typeof toast }) => unknown) => selector({ addToast: toast }),
}));

vi.mock("@/hooks/use-platform-access", () => ({
  usePlatformAccess: () => mockUsePlatformAccess(),
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: () => ({
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: () =>
            createProfilesQueryBuilder([
              {
                id: "admin-1",
                full_name: "Alex Rivera",
                email: "alex@example.com",
                role: "admin",
                created_at: "2026-01-01T00:00:00.000Z",
              },
            ]),
        };
      }

      return {
        select: () => createProfilesQueryBuilder(),
      };
    },
  }),
}));

describe("secondary operational continuity", () => {
  beforeEach(() => {
    toast.mockReset();
    mockUsePlatformAccess.mockReset();
    mockUsePlatformAccess.mockReturnValue({
      loading: false,
      error: null,
      refetch: vi.fn(),
      data: {
        requestId: "req-access",
        summary: { admins: 2, vendors: 5, buyers: 12, privilegedChanges7d: 3 },
        evidence: {
          reasonCoverage: 1,
          traceCoverage: 1,
          highSensitivityCount: 1,
          adminTransitionCount: 1,
          flaggedCount: 0,
        },
        roles: [],
        guardrails: [],
        actions: [],
        recentActions: [
          {
            id: "evt-1",
            action: "role_change",
            actorLabel: "Alex Rivera",
            targetLabel: "Sam Buyer",
            createdAt: "2026-04-08T10:00:00.000Z",
            sensitivity: "high",
            reasonProvided: true,
            requestId: "trace-1",
            fromRole: "buyer",
            toRole: "admin",
            route: "/admin/users",
            queueHref: "/admin/users",
            capability: "users_manage_access",
            requiresEscalation: true,
          },
        ],
      },
    });
  });

  it("restores admin user review filters and search text", async () => {
    window.localStorage.setItem("nexcart.admin.users.role", "admin");
    window.localStorage.setItem("nexcart.admin.users.search", "alex");

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("alex")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "admin" })).toHaveClass("bg-stone-900");
    });
  });

  it("restores the admin access review preset", async () => {
    window.localStorage.setItem("nexcart.admin.access.reviewPreset", "escalation");

    render(<AdminAccessPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Escalation markers" })).toHaveClass("bg-stone-900");
      expect(screen.getByText("1 event(s) in the current review preset")).toBeInTheDocument();
    });
  });
});
