import type { ReactNode } from "react";
import { VendorSidebar } from "@/components/layout/vendor-sidebar";
export default function VendorLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-stone-50 dark:bg-stone-950">
      <VendorSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
