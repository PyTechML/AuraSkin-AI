import type React from "react";

export function SupportLayout({ children }: { children: React.ReactNode }) {
  return <div className="bg-background text-foreground">{children}</div>;
}

