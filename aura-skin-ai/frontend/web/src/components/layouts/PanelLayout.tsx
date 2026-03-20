"use client";

import type { ReactNode } from "react";
import { PanelHeaderShell } from "./PanelHeaderShell";
import { PanelRouteTransition } from "./PanelRouteTransition";
import { PanelNav } from "./PanelNav";
import { PanelToastProvider } from "@/components/panel/PanelToast";
import type { PanelRole } from "./panelNavConfig";

interface PanelLayoutProps {
  role: PanelRole;
  children: ReactNode;
}

export function PanelLayout({ role, children }: PanelLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <PanelHeaderShell nav={<PanelNav role={role} className="justify-between" />} />
      <div className="container px-4 pb-12 pt-2 md:px-8">
        <PanelRouteTransition>
          <PanelToastProvider>
            <div className="mx-auto max-w-[1280px] mt-2 min-h-[70vh]">{children}</div>
          </PanelToastProvider>
        </PanelRouteTransition>
      </div>
    </div>
  );
}

