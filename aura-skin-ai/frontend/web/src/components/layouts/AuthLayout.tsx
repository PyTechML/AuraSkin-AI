import Link from "next/link";
import { AuthToastShell } from "./AuthToastShell";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <Link href="/" className="font-brand font-semibold text-xl mb-8 text-foreground">
        AuraSkin AI
      </Link>
      <div className="w-full max-w-md rounded-2xl border border-border/60 backdrop-blur-[20px] bg-white/30 p-6 shadow-xl">
        <AuthToastShell>{children}</AuthToastShell>
      </div>
    </div>
  );
}
