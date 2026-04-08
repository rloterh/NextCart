"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Shield, Store, ShoppingBag } from "lucide-react";
import { useUIStore } from "@/stores/ui-store";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils/constants";
import type { Profile, UserRole } from "@/types";

const roleIcons: Record<UserRole, typeof Users> = { buyer: ShoppingBag, vendor: Store, admin: Shield };
const roleColors: Record<UserRole, string> = {
  buyer: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  vendor: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
  admin: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",
};

export default function AdminUsersPage() {
  const addToast = useUIStore((s) => s.addToast);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      const sb = getSupabaseBrowserClient();
      let query = sb.from("profiles").select("*").order("created_at", { ascending: false });
      if (roleFilter !== "all") query = query.eq("role", roleFilter);
      if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
      const { data } = await query;
      setUsers((data ?? []) as Profile[]);
      setLoading(false);
    }
    fetch();
  }, [roleFilter, search]);

  async function changeRole(userId: string, newRole: UserRole) {
    const sb = getSupabaseBrowserClient();
    const { error } = await sb.from("profiles").update({ role: newRole }).eq("id", userId);
    if (error) { addToast({ type: "error", title: "Failed" }); return; }
    addToast({ type: "success", title: `Role updated to ${newRole}` });
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-stone-900 dark:text-white">Users</h1>
        <p className="mt-1 text-sm text-stone-500">Manage user accounts and roles.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1">
          {(["all", "buyer", "vendor", "admin"] as const).map((r) => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider ${roleFilter === r ? "bg-stone-900 text-white dark:bg-white dark:text-stone-900" : "text-stone-500 hover:text-stone-900"}`}>
              {r === "all" ? "All" : r}
            </button>
          ))}
        </div>
        <input type="text" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-64 border-b border-stone-200 bg-transparent text-sm placeholder:text-stone-400 focus:border-stone-900 focus:outline-none dark:border-stone-700" />
      </div>

      <div className="border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
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
            {loading ? Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}><td colSpan={4} className="px-4 py-3.5"><div className="h-4 animate-pulse bg-stone-100 dark:bg-stone-800" /></td></tr>
            )) : users.map((user) => {
              const RoleIcon = roleIcons[user.role];
              return (
                <tr key={user.id} className="border-b border-stone-50 hover:bg-stone-50/50 dark:border-stone-800/50 dark:hover:bg-stone-800/20">
                  <td className="px-4 py-3.5">
                    <p className="text-sm font-medium text-stone-900 dark:text-white">{user.full_name || "—"}</p>
                    <p className="text-[10px] text-stone-400">{user.email}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${roleColors[user.role]}`}>
                      <RoleIcon className="h-3 w-3" />{user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-stone-500">{formatDate(user.created_at)}</td>
                  <td className="px-4 py-3.5 text-right">
                    <select
                      value={user.role}
                      onChange={(e) => changeRole(user.id, e.target.value as UserRole)}
                      className="h-8 border-b border-stone-200 bg-transparent text-xs uppercase tracking-wider text-stone-600 focus:outline-none dark:border-stone-700 dark:text-stone-400"
                    >
                      <option value="buyer">Buyer</option>
                      <option value="vendor">Vendor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
