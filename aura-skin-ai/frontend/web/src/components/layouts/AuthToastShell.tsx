 "use client";

import type { ReactNode } from "react";
import { PanelToastProvider } from "@/components/panel/PanelToast";

interface AuthToastShellProps {
  children: ReactNode;
}

export function AuthToastShell({ children }: AuthToastShellProps) {
  return <PanelToastProvider>{children}</PanelToastProvider>;
}

