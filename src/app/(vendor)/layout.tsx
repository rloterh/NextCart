import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { VendorSidebar } from "@/components/layout/vendor-sidebar";
import { getSupabaseServerClient, getServerUser } from "@/lib/supabase/server";

export default async function VendorLayout({ children }: { children: ReactNode }) {
  const user = await getServerUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = await getSupabaseServerClient();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  if (profile?.role !== "vendor") {
    redirect("/account");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-stone-50 dark:bg-stone-950">
      <VendorSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
