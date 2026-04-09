"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Shield, ShieldAlert, ShoppingBag, Store, UserCog, Users } from "lucide-react";
import { ROLE_METADATA } from "@/config/roles";
import { SensitiveActionReview } from "@/components/platform/sensitive-action-review";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageIntro, PageTransition } from "@/components/ui/page-shell";
import { SkeletonBlock, StatePanel } from "@/components/ui/state-panel";
import { ToneBadge } from "@/components/ui/status-badge";
import { getSensitiveWorkflowReview } from "@/lib/platform/access-review";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils/constants";
import { useUIStore } from "@/stores/ui-store";
import type { Profile, UserRole } from "@/types";

const roleIcons: Record<UserRole, typeof Users> = { buyer: ShoppingBag, vendor: Store, admin: Shield };
const roleTones: Record<UserRole, "info" | "warning" | "danger"> = { buyer: "info", vendor: "warning", admin: "danger" };

type AccessChangeResponse = {
  error?: string;
  requestId?: string;
  user?: Pick<Profile, "id" | "role" | "full_name" | "email">;
};

export default function AdminUsersPage() {
  const addToast = useUIStore((state) => state.addToast);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [search, setSearch] = useState("");
  const [reviewingUserId, setReviewingUserId] = useState<string | null>(null);
  const [pendingRole, setPendingRole] = useState<UserRole>("buyer");
  const [changeReason, setChangeReason] = useState("");
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();
    let query = supabase.from("profiles").select("*").order("created_at", { ascending: false });

    if (roleFilter !== "all") {
      query = query.eq("role", roleFilter);
    }

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error: queryError } = await query;

    if (queryError) {
      setUsers([]);
      setError(queryError.message);
    } else {
      setUsers((data ?? []) as Profile[]);
    }

    setLoading(false);
  }, [roleFilter, search]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (reviewingUserId && !users.some((user) => user.id === reviewingUserId)) {
      setReviewingUserId(null);
      setChangeReason("");
      setReviewConfirmed(false);
    }
  }, [reviewingUserId, users]);

  const stats = useMemo(
    () => ({
      total: users.length,
      admins: users.filter((user) => user.role === "admin").length,
      vendors: users.filter((user) => user.role === "vendor").length,
      buyers: users.filter((user) => user.role === "buyer").length,
    }),
    [users]
  );

  function startAccessReview(user: Profile) {
    setReviewingUserId(user.id);
    setPendingRole(user.role);
    setChangeReason("");
    setReviewConfirmed(false);
  }

  async function submitAccessChange(user: Profile) {
    if (pendingRole === user.role) {
      addToast({ type: "error", title: "Choose a different role", description: "Select a new role before applying an access change." });
      return;
    }

    if (changeReason.trim().length < 12) {
      addToast({
        type: "error",
        title: "Reason required",
        description: "Add a clear reason with at least 12 characters so the access review is auditable.",
      });
      return;
    }

    if (!reviewConfirmed) {
      addToast({
        type: "error",
        title: "Review checkpoint required",
        description: "Confirm the access review checklist before applying this role change.",
      });
      return;
    }

    setSavingUserId(user.id);

    try {
      const response = await fetch("/api/admin/users/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          nextRole: pendingRole,
          reason: changeReason.trim(),
        }),
      });

      const payload = (await response.json()) as AccessChangeResponse;

      if (!response.ok) {
        throw new Error(
          `${payload.error ?? "Unable to update marketplace access."}${
            payload.requestId ? ` Request trace: ${payload.requestId}.` : ""
          }`
        );
      }

      setUsers((current) =>
        current.map((entry) =>
          entry.id === user.id ? { ...entry, role: payload.user?.role ?? pendingRole } : entry
        )
      );
      addToast({
        type: "success",
        title: "Access updated",
        description: `${user.full_name || user.email} is now a ${pendingRole}.`,
      });
      setReviewingUserId(null);
      setChangeReason("");
      setReviewConfirmed(false);
    } catch (updateError) {
      addToast({
        type: "error",
        title: "Role update failed",
        description: updateError instanceof Error ? updateError.message : "Please try again.",
      });
    } finally {
      setSavingUserId(null);
    }
  }

  return (
    <PageTransition>
      <PageIntro
        title="Users"
        description="Manage user accounts and role access across the marketplace without losing auditability or privileged-change guardrails."
        actions={
          <Link
            href="/admin/access"
            className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-stone-500 transition-colors hover:text-stone-900 dark:hover:text-white"
          >
            Open access console
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Users in view", value: stats.total, icon: Users },
          { label: "Admins", value: stats.admins, icon: ShieldAlert },
          { label: "Vendors", value: stats.vendors, icon: Store },
          { label: "Buyers", value: stats.buyers, icon: ShoppingBag },
        ].map((card) => (
          <Card key={card.label} className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-widest text-stone-400">{card.label}</p>
              <div className="rounded-full bg-stone-100 p-2 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                <card.icon className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-medium text-stone-900 dark:text-white">{card.value}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1">
          {(["all", "buyer", "vendor", "admin"] as const).map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => setRoleFilter(role)}
              className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider ${
                roleFilter === role ? "bg-stone-900 text-white dark:bg-white dark:text-stone-900" : "text-stone-500 hover:text-stone-900"
              }`}
            >
              {role === "all" ? "All" : role}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="h-9 w-64 border-b border-stone-200 bg-transparent text-sm placeholder:text-stone-400 focus:border-stone-900 focus:outline-none dark:border-stone-700"
        />
      </div>

      <Card className="overflow-hidden p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b border-stone-100 dark:border-stone-800">
              <th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-widest text-stone-400">User</th>
              <th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-widest text-stone-400">Role</th>
              <th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-widest text-stone-400">Joined</th>
              <th className="px-4 py-3 text-right text-[10px] font-medium uppercase tracking-widest text-stone-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={index}>
                  <td colSpan={4} className="px-4 py-3.5">
                    <SkeletonBlock lines={2} />
                  </td>
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={4} className="px-4 py-8">
                  <StatePanel
                    tone="danger"
                    title="We could not load users"
                    description={error}
                    actionLabel="Try again"
                    onAction={() => void fetchUsers()}
                  />
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8">
                  <StatePanel
                    title="No users match this view"
                    description="Try another role filter or search for a different name or email."
                    icon={Users}
                  />
                </td>
              </tr>
            ) : (
              users.flatMap((user) => {
                const RoleIcon = roleIcons[user.role];
                const isReviewing = reviewingUserId === user.id;
                const review = getSensitiveWorkflowReview({
                  key: "role_change",
                  context: {
                    fromRole: user.role,
                    toRole: pendingRole,
                    touchesAdmin: user.role === "admin" || pendingRole === "admin",
                  },
                });

                return [
                  <tr
                    key={user.id}
                    className="border-b border-stone-50 hover:bg-stone-50/50 dark:border-stone-800/50 dark:hover:bg-stone-800/20"
                  >
                    <td className="px-4 py-3.5">
                      <p className="text-sm font-medium text-stone-900 dark:text-white">{user.full_name || "-"}</p>
                      <p className="text-[10px] text-stone-400">{user.email}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col items-start gap-2">
                        <ToneBadge tone={roleTones[user.role]} className="gap-1.5">
                          <RoleIcon className="h-3 w-3" />
                          {user.role}
                        </ToneBadge>
                        <p className="max-w-[240px] text-xs leading-relaxed text-stone-500">{ROLE_METADATA[user.role].description}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-stone-500">{formatDate(user.created_at)}</td>
                    <td className="px-4 py-3.5 text-right">
                      <Button variant="outline" size="sm" leftIcon={<UserCog className="h-3.5 w-3.5" />} onClick={() => startAccessReview(user)}>
                        {isReviewing ? "Editing access" : "Review access"}
                      </Button>
                    </td>
                  </tr>,
                  ...(isReviewing
                    ? [
                        <tr key={`${user.id}-review`} className="border-b border-stone-100 bg-stone-50/60 dark:border-stone-800 dark:bg-stone-900/40">
                          <td colSpan={4} className="px-4 py-4">
                            <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)_auto] xl:items-end">
                              <label className="space-y-2">
                                <span className="text-[10px] font-medium uppercase tracking-widest text-stone-400">New role</span>
                                <select
                                  value={pendingRole}
                                  onChange={(event) => {
                                    setPendingRole(event.target.value as UserRole);
                                    setReviewConfirmed(false);
                                  }}
                                  className="h-10 w-full border border-stone-200 bg-white px-3 text-sm text-stone-700 focus:border-stone-900 focus:outline-none dark:border-stone-700 dark:bg-stone-950 dark:text-stone-200"
                                >
                                  <option value="buyer">Buyer</option>
                                  <option value="vendor">Vendor</option>
                                  <option value="admin">Admin</option>
                                </select>
                              </label>

                              <label className="space-y-2">
                                <span className="text-[10px] font-medium uppercase tracking-widest text-stone-400">Reason for change</span>
                                <textarea
                                  value={changeReason}
                                  onChange={(event) => setChangeReason(event.target.value)}
                                  rows={3}
                                  placeholder="Document why this access change is necessary and who approved it."
                                  className="w-full border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 placeholder:text-stone-400 focus:border-stone-900 focus:outline-none dark:border-stone-700 dark:bg-stone-950 dark:text-stone-200"
                                />
                              </label>

                              <div className="flex items-center gap-2 xl:justify-end">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setReviewingUserId(null);
                                    setReviewConfirmed(false);
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  isLoading={savingUserId === user.id}
                                  onClick={() => void submitAccessChange(user)}
                                >
                                  Apply access change
                                </Button>
                              </div>
                            </div>

                            <div className="mt-4">
                              <SensitiveActionReview
                                review={review}
                                checked={reviewConfirmed}
                                onCheckedChange={setReviewConfirmed}
                              />
                            </div>

                            <div className="mt-3 flex flex-wrap items-start gap-2 text-xs text-stone-500">
                              {user.role === "admin" && pendingRole !== "admin" ? (
                                <ToneBadge tone="danger">Admin demotion guardrails apply</ToneBadge>
                              ) : null}
                              {pendingRole === "admin" ? <ToneBadge tone="warning">Promoting to admin grants platform-wide control</ToneBadge> : null}
                              <p className="max-w-3xl leading-relaxed">
                                Access changes are now routed through the audited workflow, so each role transition records rationale, sensitivity, and a request trace in the governance log.
                              </p>
                            </div>
                          </td>
                        </tr>,
                      ]
                    : []),
                ];
              })
            )}
          </tbody>
        </table>
      </Card>
    </PageTransition>
  );
}
