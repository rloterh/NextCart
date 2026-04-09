"use client";

import { useCallback, useEffect, useState } from "react";
import { Shield, ShoppingBag, Store, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageIntro, PageTransition } from "@/components/ui/page-shell";
import { ToneBadge } from "@/components/ui/status-badge";
import { SkeletonBlock, StatePanel } from "@/components/ui/state-panel";
import { useUIStore } from "@/stores/ui-store";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils/constants";
import type { Profile, UserRole } from "@/types";

const roleIcons: Record<UserRole, typeof Users> = { buyer: ShoppingBag, vendor: Store, admin: Shield };

export default function AdminUsersPage() {
  const addToast = useUIStore((state) => state.addToast);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [search, setSearch] = useState("");

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

  async function changeRole(userId: string, newRole: UserRole) {
    const supabase = getSupabaseBrowserClient();
    const { error: updateError } = await supabase.from("profiles").update({ role: newRole }).eq("id", userId);

    if (updateError) {
      addToast({ type: "error", title: "Role update failed", description: updateError.message });
      return;
    }

    addToast({ type: "success", title: `Role updated to ${newRole}` });
    setUsers((current) => current.map((user) => (user.id === userId ? { ...user, role: newRole } : user)));
  }

  return (
    <PageTransition>
      <PageIntro title="Users" description="Manage user accounts and role access across the marketplace." />

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
              users.map((user) => {
                const RoleIcon = roleIcons[user.role];
                const tone = user.role === "admin" ? "danger" : user.role === "vendor" ? "warning" : "info";

                return (
                  <tr key={user.id} className="border-b border-stone-50 hover:bg-stone-50/50 dark:border-stone-800/50 dark:hover:bg-stone-800/20">
                    <td className="px-4 py-3.5">
                      <p className="text-sm font-medium text-stone-900 dark:text-white">{user.full_name || "-"}</p>
                      <p className="text-[10px] text-stone-400">{user.email}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <ToneBadge tone={tone} className="gap-1.5">
                        <RoleIcon className="h-3 w-3" />
                        {user.role}
                      </ToneBadge>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-stone-500">{formatDate(user.created_at)}</td>
                    <td className="px-4 py-3.5 text-right">
                      <select
                        value={user.role}
                        onChange={(event) => void changeRole(user.id, event.target.value as UserRole)}
                        className="h-8 border-b border-stone-200 bg-transparent text-xs uppercase tracking-wider text-stone-600 focus:outline-none dark:border-stone-700 dark:text-stone-400"
                      >
                        <option value="buyer">Buyer</option>
                        <option value="vendor">Vendor</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Card>
    </PageTransition>
  );
}
