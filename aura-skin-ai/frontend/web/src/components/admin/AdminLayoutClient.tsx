"use client";

import { Breadcrumb } from "@/components/layouts/Breadcrumb";
import { AdminPageShell } from "./AdminPageShell";

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 min-h-0">
      <div className="flex-1 overflow-auto min-w-0 w-full">
        <AdminPageShell>
          <div className="opacity-0 animate-in fade-in slide-in-from-top-2 duration-150 fill-mode-forwards">
            <Breadcrumb />
          </div>
          {children}
        </AdminPageShell>
      </div>
    </div>
  );
}
