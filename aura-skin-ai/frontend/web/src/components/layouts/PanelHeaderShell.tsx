"use client";

import type { ReactNode } from "react";
import { Breadcrumb } from "./Breadcrumb";

interface PanelHeaderShellProps {
  nav: ReactNode;
}

export function PanelHeaderShell({ nav }: PanelHeaderShellProps) {
  return (
    <header className="sticky top-0 z-40 w-full pt-3 pb-2 px-4 bg-transparent">
      <div className="mx-auto w-full max-w-5xl rounded-full border shadow-md transition-shadow backdrop-blur-[20px] bg-white/30 border border-border/60">
        {nav}
      </div>
      <div className="mx-auto w-full max-w-5xl mt-3 px-1">
        <Breadcrumb />
      </div>
    </header>
  );
}

