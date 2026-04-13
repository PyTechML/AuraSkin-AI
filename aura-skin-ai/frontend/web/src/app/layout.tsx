import type { Metadata } from "next";
import {
  Playfair_Display,
  Inter,
  Space_Grotesk,
  Kaushan_Script,
} from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RuntimeRecovery } from "@/components/RuntimeRecovery";
import "@/styles/globals.css";
import { criticalFallbackCss } from "@/styles/criticalFallbackCss";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

/** Bundled via next/font — avoids top-level CSS @import that can block Tailwind on hard refresh. */
const kaushanScript = Kaushan_Script({
  subsets: ["latin"],
  variable: "--font-kaushan",
  display: "swap",
  weight: "400",
});

export const metadata: Metadata = {
  title: "AuraSkin AI — AI-Powered Skincare Assessment",
  description: "Personalized skin analysis and routine recommendations powered by AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${inter.variable} ${spaceGrotesk.variable} ${kaushanScript.variable}`}
      suppressHydrationWarning
    >
      <head>
        <style
          id="auraskin-critical-fallback"
          dangerouslySetInnerHTML={{ __html: criticalFallbackCss }}
        />
      </head>
      <body
        className="min-h-screen font-body bg-background text-foreground"
        style={{ backgroundColor: "hsl(75, 56%, 95%)" }}
      >
        <RuntimeRecovery />
        <ErrorBoundary>{children}</ErrorBoundary>
        <Analytics />
      </body>
    </html>
  );
}
