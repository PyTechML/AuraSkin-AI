"use client";

import type React from "react";
import { SectionReveal } from "@/components/landing/ScrollReveal";
import { cn } from "@/lib/utils";

type SupportSectionProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  variant?: "fadeUp" | "fadeOnly" | "slideUp" | "slideLeft" | "slideRight";
  background?: "default" | "glass3" | "glass4";
  className?: string;
};

const backgroundClassNames: Record<NonNullable<SupportSectionProps["background"]>, string> = {
  default: "bg-background",
  glass3: "bg-glass-3",
  glass4: "bg-glass-4",
};

export function SupportSection({
  title,
  subtitle,
  children,
  variant = "fadeUp",
  background = "default",
  className,
}: SupportSectionProps) {
  return (
    <section className={cn("py-20 px-4", backgroundClassNames[background])}>
      <SectionReveal
        variant={variant}
        className={cn("container max-w-4xl mx-auto", className)}
      >
        <header className="mb-8 text-left">
          <h2 className="font-heading text-2xl md:text-3xl font-semibold text-foreground">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-3 text-muted-foreground font-body text-base md:text-lg leading-relaxed">
              {subtitle}
            </p>
          ) : null}
        </header>
        <div className="space-y-4">{children}</div>
      </SectionReveal>
    </section>
  );
}

