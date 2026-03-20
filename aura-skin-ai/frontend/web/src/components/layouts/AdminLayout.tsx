"use client";

import { useState } from "react";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import { Breadcrumb } from "./Breadcrumb";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar
        title="AuraSkin AI — Admin"
        showSidebarToggle
        onMenuClick={() => setSidebarOpen((o) => !o)}
      />
      <div className="flex flex-1">
        <Sidebar
          variant="admin"
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="flex-1 overflow-auto">
          <div className="container px-4 py-4">
            <div className="mb-4">
              <Breadcrumb />
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
