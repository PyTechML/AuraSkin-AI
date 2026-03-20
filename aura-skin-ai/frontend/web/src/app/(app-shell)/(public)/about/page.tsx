"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  SectionReveal,
  HeadingReveal,
  StaggerChildren,
  StaggerItem,
} from "@/components/landing/ScrollReveal";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CTAWithGlow } from "@/components/landing/CTAWithGlow";
import { ClientAuthGate } from "@/components/ui/ClientAuthGate";
import { ScanLine, Map, Target, Sparkles, ShieldCheck, BookOpen, Lock } from "lucide-react";

const WHAT_WE_DO_CARDS = [
  {
    title: "AI Skin Profiling",
    description:
      "Our system builds a detailed profile from your skin type, sensitivity, and environmental factors. This foundation ensures every recommendation is grounded in your unique biology, not generic assumptions.",
    icon: ScanLine,
  },
  {
    title: "Lifestyle Mapping",
    description:
      "Sleep, stress, diet, and environment all affect your skin. We incorporate lifestyle context so your routine fits your real life—not an idealized one.",
    icon: Map,
  },
  {
    title: "Concern Detection",
    description:
      "We identify and prioritize your skin concerns using structured inputs and AI analysis. From there, recommendations are targeted, actionable, and aligned with dermatology best practices.",
    icon: Target,
  },
  {
    title: "Routine Optimization",
    description:
      "You receive a personalized routine that evolves with reassessments. Product choices, frequency, and steps are tuned to your goals and how your skin responds over time.",
    icon: Sparkles,
  },
] as const;

const TRUST_PILLARS = [
  { label: "Dermatology-informed", icon: BookOpen },
  { label: "Evidence-based", icon: ShieldCheck },
  { label: "Privacy-first", icon: Lock },
] as const;

export default function AboutPage() {
  return (
    <div className="bg-background text-foreground">
      {/* Section 1 — Hero */}
      <section className="relative min-h-[55vh] flex flex-col items-center justify-center px-4 py-28 overflow-hidden bg-glass-4">
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          aria-hidden
        >
          <div
            className="w-[380px] h-[280px] rounded-full blur-[90px] opacity-80"
            style={{
              background:
                "radial-gradient(ellipse, rgba(137,108,108,0.14) 0%, rgba(229,190,181,0.06) 50%, transparent 65%)",
            }}
          />
        </div>
        <div className="relative z-10 w-full max-w-3xl mx-auto text-center">
          <motion.span
            className="block text-xs font-label uppercase tracking-[0.2em] text-muted-foreground mb-4"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            Our story
          </motion.span>
          <motion.h1
            className="font-heading text-4xl md:text-5xl font-semibold tracking-tight text-foreground"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            About AuraSkin AI
          </motion.h1>
          <motion.p
            className="mt-5 text-muted-foreground font-body text-lg md:text-xl max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.7, ease: "easeOut" }}
          >
            Where clinical dermatology meets intelligent personalization.
          </motion.p>
        </div>
      </section>

      <div className="h-px bg-border/40" />

      {/* Section 2 — Who We Are */}
      <section className="py-24 px-4 bg-background">
        <SectionReveal variant="slideLeft" className="container max-w-3xl mx-auto">
          <span className="text-xs font-label uppercase tracking-[0.2em] text-muted-foreground mb-3 block">
            Who we are
          </span>
          <h2 className="font-heading text-3xl md:text-4xl font-semibold mb-6 text-foreground">
            Built To Understand Skin — Not Guess It
          </h2>
          <p className="text-muted-foreground font-body text-lg leading-relaxed mb-4">
            AuraSkin AI combines dermatology-backed logic with structured AI analysis to understand your skin in context — not in isolation.
          </p>
          <p className="text-muted-foreground font-body text-lg leading-relaxed mb-4">
            Instead of one-size-fits-all routines, the system evaluates skin type, lifestyle, and concerns to deliver recommendations that are practical, safe, and personalized.
          </p>
          <p className="text-muted-foreground font-body text-lg leading-relaxed">
            We built this platform for anyone who wants clarity instead of guesswork: evidence-based guidance that adapts to you, backed by clinical thinking and real-world data.
          </p>
        </SectionReveal>
      </section>

      <div className="h-px bg-border/40" />

      {/* Section 3 — What We Do */}
      <section className="py-24 px-4 bg-glass-3">
        <div className="container max-w-5xl mx-auto">
          <span className="text-xs font-label uppercase tracking-[0.2em] text-muted-foreground mb-3 block text-center">
            Our approach
          </span>
          <HeadingReveal
            as="h2"
            className="font-heading text-3xl md:text-4xl font-semibold text-center mb-6 text-foreground"
          >
            Intelligence That Adapts To You
          </HeadingReveal>
          <p className="text-muted-foreground font-body text-lg leading-relaxed text-center max-w-2xl mx-auto mb-14">
            Four pillars power your personalized experience — from profiling your skin to optimizing your routine over time.
          </p>
          <StaggerChildren
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
            stagger={0.12}
          >
            {WHAT_WE_DO_CARDS.map(({ title, description, icon: Icon }) => (
              <StaggerItem key={title}>
                <Card className="h-full flex flex-col">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/60">
                        <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
                      </div>
                      <CardTitle className="font-heading text-xl font-semibold !mt-0">
                        {title}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 flex-1">
                    <p className="text-sm text-muted-foreground font-body leading-relaxed">
                      {description}
                    </p>
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </div>
      </section>

      <div className="h-px bg-border/40" />

      {/* Section 4 — Why It Matters */}
      <section className="py-24 px-4 bg-background">
        <SectionReveal variant="fadeUp" className="container max-w-3xl mx-auto text-center">
          <span className="text-xs font-label uppercase tracking-[0.2em] text-muted-foreground mb-3 block">
            Why it matters
          </span>
          <h2 className="font-heading text-3xl md:text-4xl font-semibold mb-6 text-foreground">
            Because Skin Is Personal
          </h2>
          <p className="text-muted-foreground font-body text-lg leading-relaxed">
            Your skin changes with time, environment, and habits.
          </p>
          <p className="text-muted-foreground font-body text-lg leading-relaxed mt-4">
            AuraSkin AI continuously aligns recommendations with these changes — helping you build a routine that evolves with you.
          </p>
        </SectionReveal>
      </section>

      <div className="h-px bg-border/40" />

      {/* Section 5 — Trust */}
      <section className="py-24 px-4 bg-glass-3">
        <div className="container max-w-3xl mx-auto">
          <SectionReveal variant="slideRight">
            <span className="text-xs font-label uppercase tracking-[0.2em] text-muted-foreground mb-3 block">
              Trust &amp; safety
            </span>
            <h2 className="font-heading text-3xl md:text-4xl font-semibold mb-6 text-foreground">
              Guided By Clinical Thinking
            </h2>
            <p className="text-muted-foreground font-body text-lg leading-relaxed mb-8">
              Our framework aligns with dermatology-informed practices and integrates real-world lifestyle data to improve relevance and safety. We prioritize evidence over trends and keep your data private and secure.
            </p>
            <div className="flex flex-wrap gap-4">
              {TRUST_PILLARS.map(({ label, icon: Icon }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-4 py-2.5"
                >
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
                  <span className="text-sm font-label text-foreground">{label}</span>
                </div>
              ))}
            </div>
          </SectionReveal>
        </div>
      </section>

      <div className="h-px bg-border/40" />

      {/* Section 6 — Vision */}
      <section className="py-24 px-4 bg-background">
        <SectionReveal variant="fadeOnly" className="container max-w-3xl mx-auto text-center">
          <span className="text-xs font-label uppercase tracking-[0.2em] text-muted-foreground mb-3 block">
            Our vision
          </span>
          <h2 className="font-heading text-3xl md:text-4xl font-semibold mb-6 text-foreground">
            The Future Of Personalized Skin Care
          </h2>
          <p className="text-muted-foreground font-body text-lg leading-relaxed">
            AuraSkin AI aims to make intelligent skin guidance accessible — helping individuals move from guesswork to clarity.
          </p>
        </SectionReveal>
      </section>

      {/* Closing CTA */}
      <section className="relative py-28 px-4 bg-glass-4 overflow-hidden">
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          aria-hidden
        >
          <div
            className="w-[400px] h-[260px] rounded-full blur-[100px] opacity-70"
            style={{
              background:
                "radial-gradient(circle, rgba(229,190,181,0.12) 0%, transparent 65%)",
            }}
          />
        </div>
        <SectionReveal variant="fadeUp" className="relative z-10 text-center max-w-2xl mx-auto">
          <h2 className="font-heading text-2xl md:text-3xl font-semibold text-foreground mb-4">
            Ready to understand your skin?
          </h2>
          <p className="text-muted-foreground font-body text-lg mb-8">
            Get a clinical-grade assessment and a personalized routine built for you.
          </p>
          <CTAWithGlow>
            <ClientAuthGate
              authenticated={
                <Button size="lg" className="rounded-full" asChild>
                  <Link href="/start-assessment">Start your assessment</Link>
                </Button>
              }
              unauthenticated={
                <Button size="lg" className="rounded-full" asChild>
                  <Link href="/signup">Start your assessment</Link>
                </Button>
              }
              placeholder={
                <Button size="lg" className="rounded-full" asChild>
                  <Link href="/signup">Start your assessment</Link>
                </Button>
              }
            />
          </CTAWithGlow>
        </SectionReveal>
      </section>
    </div>
  );
}
