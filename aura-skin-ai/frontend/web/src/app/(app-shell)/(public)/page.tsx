"use client";

import Link from "next/link";

import { useRef, useState, useCallback } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ClientAuthGate } from "@/components/ui/ClientAuthGate";
import { FloatingInsightCards } from "@/components/landing/FloatingInsightCards";
import type { MouseState } from "@/components/landing/FloatingInsightCards";
import { BackgroundMotion } from "@/components/landing/BackgroundMotion";
import {
  StaggerChildren,
  StaggerItem,
  SectionReveal,
  scrollReveal,
  HeadingReveal,
  SubtextReveal,
} from "@/components/landing/ScrollReveal";
import { CTAWithGlow } from "@/components/landing/CTAWithGlow";
import { HeroShapes, CTAShapes, SectionDividerShapes } from "@/components/landing/AbstractShapes";
import {
  ClipboardList,
  Cpu,
  FileCheck,
  UserCheck,
  ShieldCheck,
  BookOpen,
  TrendingUp,
} from "lucide-react";

const { fadeUp, fadeOnly, slideUp } = scrollReveal;

export default function LandingPage() {
  const trustRef = useRef<HTMLElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const [heroMouse, setHeroMouse] = useState<MouseState>(null);
  const { scrollY } = useScroll();
  const heroBgY = useTransform(scrollY, [0, 600], [0, 120]);
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0.3]);
  const { scrollYProgress: trustScrollProgress } = useScroll({
    target: trustRef,
    offset: ["start end", "end start"],
  });
  const trustBgY = useTransform(trustScrollProgress, [0, 0.5], [40, -40]);
  const trustBgOpacity = useTransform(trustScrollProgress, [0.2, 0.5], [0, 0.06]);

  const onHeroMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    setHeroMouse({ x: e.clientX, y: e.clientY });
  }, []);
  const onHeroMouseLeave = useCallback(() => setHeroMouse(null), []);

  return (
    <div className="bg-background text-foreground">
      {/* Hero */}
      <section
        ref={heroRef}
        className="relative min-h-[85vh] flex flex-col items-center justify-center px-4 py-20 overflow-hidden bg-glass-4"
        onMouseMove={onHeroMouseMove}
        onMouseLeave={onHeroMouseLeave}
      >
        <FloatingInsightCards mouse={heroMouse} containerRef={heroRef} />
        <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ y: heroBgY, opacity: heroOpacity }}
          aria-hidden
        >
          <div
            className="w-[400px] h-[320px] rounded-full blur-[100px]"
            style={{
              background:
                "radial-gradient(ellipse, rgba(137,108,108,0.12) 0%, rgba(229,190,181,0.06) 50%, transparent 65%)",
              transform: "translateX(-10%)",
            }}
          />
        </motion.div>
        <HeroShapes style={{ y: heroBgY, opacity: heroOpacity }} />

        <div className="relative z-20 w-full max-w-3xl mx-auto px-4 text-center">
          <motion.h1
            className="font-brand text-6xl md:text-8xl font-bold tracking-tight text-foreground"
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            AuraSkin AI
          </motion.h1>
          <motion.p
            className="mt-5 text-muted-foreground text-xl md:text-2xl font-body max-w-xl mx-auto"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.6, ease: "easeOut" }}
          >
            Clinical AI Skin Intelligence Built For You
          </motion.p>
          <motion.div
            className="mt-10"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <CTAWithGlow>
              <ClientAuthGate
                authenticated={
                  <Button size="lg" className="rounded-full" asChild>
                    <Link href="/start-assessment">Start Skin Assessment</Link>
                  </Button>
                }
                unauthenticated={
                  <Button size="lg" className="rounded-full" asChild>
                    <Link href="/signup">Start Skin Assessment</Link>
                  </Button>
                }
                placeholder={
                  <Button size="lg" className="rounded-full" asChild>
                    <Link href="/signup">Start Skin Assessment</Link>
                  </Button>
                }
              />
            </CTAWithGlow>
          </motion.div>
        </div>
      </section>

      <div className="relative">
        <SectionDividerShapes />
        <div className="h-px bg-border/40" />
        <div className="h-8 bg-gradient-to-b from-glass-4 to-glass-3 opacity-60" />
      </div>

      {/* Trust */}
      <section
        ref={trustRef}
        className="relative py-24 px-4 bg-glass-3 text-foreground overflow-hidden"
      >
        <BackgroundMotion intensity="subtle" variant="withRing" />
        <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ y: trustBgY, opacity: trustBgOpacity }}
          aria-hidden
        >
          <div
            className="w-[500px] h-[400px] rounded-full blur-[100px]"
            style={{
              background:
                "radial-gradient(circle, rgba(229,190,181,0.2) 0%, transparent 65%)",
            }}
          />
        </motion.div>
        <SectionReveal variant="fadeUp" className="container max-w-3xl mx-auto text-center relative z-10">
          <HeadingReveal as="h2" className="font-heading text-3xl md:text-4xl font-semibold">
            Trusted by Science, Not Trends
          </HeadingReveal>
          <SubtextReveal
            delay={0.2}
            className="mt-6 text-muted-foreground font-body text-lg leading-relaxed"
          >
            AuraSkin AI analyzes your skin using structured data, not influencer advice or guesswork.
          </SubtextReveal>
        </SectionReveal>
      </section>

      <div className="h-px bg-border/30" />

      {/* Capabilities */}
      <section className="py-24 px-4 bg-glass-4">
        <div className="container max-w-6xl mx-auto">
          <HeadingReveal
            as="h2"
            className="font-heading text-3xl font-semibold text-center mb-14 text-foreground"
          >
            Capabilities
          </HeadingReveal>
          <StaggerChildren className="grid md:grid-cols-3 gap-8" stagger={0.12}>
            {[
              {
                title: "Detects Skin Type",
                text: "AuraSkin AI evaluates your skin type, tone, and sensitivity to establish a precise starting point.",
                image: "/capabilities/skin-type.svg",
              },
              {
                title: "Identifies Skin Concerns",
                text: "The system maps visible and underlying concerns to guide targeted care.",
                image: "/capabilities/skin-concerns.svg",
              },
              {
                title: "Builds Personalized Routine",
                text: "You receive a customized routine aligned with your lifestyle and skin needs.",
                image: "/capabilities/personalized-routine.svg",
              },
            ].map((card) => (
              <StaggerItem key={card.title}>
                <motion.div
                  className="min-h-[320px] rounded-3xl shadow-lg transition-shadow hover:shadow-xl p-6 flex flex-col text-glass-4"
                  style={{ background: "#896C6C" }}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                >
                  <div
                    className="relative w-full aspect-[4/3] rounded-xl border-2 border-white/20 overflow-hidden mb-4 flex-shrink-0 bg-[#896C6C]"
                  >
                    <img
                      src={card.image}
                      alt={card.title}
                      className="absolute inset-0 w-full h-full object-cover object-center rounded-xl"
                    />
                  </div>
                  <h3 className="font-heading text-xl font-semibold mb-3">{card.title}</h3>
                  <p className="text-sm font-body text-glass-4/90 leading-relaxed">{card.text}</p>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </div>
      </section>

      <div className="h-px bg-glass-4/20" />
      <div className="h-12 bg-gradient-to-b from-glass-4 to-glass-3 opacity-40" />

      {/* How It Works */}
      <section className="py-24 px-4 bg-glass-3 text-foreground">
        <div className="container max-w-5xl mx-auto">
          <motion.h2
            className="font-heading text-3xl font-semibold text-center mb-16"
            {...slideUp}
            initial={false}
          >
            How It Works
          </motion.h2>
          <StaggerChildren className="grid md:grid-cols-3 gap-8 relative" stagger={0.15}>
            <div className="hidden md:block absolute top-16 left-[16.666%] right-[16.666%] h-0.5 bg-foreground/10 -translate-y-1/2" />
            {[
              {
                step: 1,
                title: "Answer Skin Questions",
                description: "Complete a short guided assessment about your skin and lifestyle.",
                icon: ClipboardList,
              },
              {
                step: 2,
                title: "AI Analyzes Profile",
                description: "Our model processes your inputs to build a precise skin profile.",
                icon: Cpu,
              },
              {
                step: 3,
                title: "Get Clinical Routine",
                description: "Receive a personalized routine with clear, actionable steps.",
                icon: FileCheck,
              },
            ].map((item) => (
              <StaggerItem key={item.step} className="relative flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-glass-1 text-glass-4 flex items-center justify-center font-label font-semibold text-lg mb-4 relative z-10">
                  {item.step}
                </div>
                <motion.div
                  className="rounded-2xl border border-border/50 backdrop-blur-[20px] bg-white/40 p-6 flex flex-col items-center shadow-lg w-full hover:shadow-xl transition-shadow"
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                >
                  <item.icon className="h-10 w-10 text-glass-1 mb-3" />
                  <h3 className="font-heading font-semibold text-lg">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground font-body">{item.description}</p>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </div>
      </section>

      <div className="h-px bg-border/30" />

      {/* Science — dark block, centered text */}
      <section
        className="py-24 px-4 text-glass-4"
        style={{ background: "#896C6C" }}
      >
        <SectionReveal variant="fadeOnly" className="container max-w-3xl mx-auto text-center">
          <HeadingReveal
            as="h2"
            className="font-heading text-3xl md:text-4xl font-semibold"
          >
            Dermatology Meets AI
          </HeadingReveal>
          <SubtextReveal
            delay={0.25}
            className="mt-6 text-glass-4/90 font-body text-lg leading-relaxed"
          >
            AuraSkin AI combines clinical dermatology principles with structured AI analysis so your recommendations are evidence-based and personalized—not one-size-fits-all.
          </SubtextReveal>
        </SectionReveal>
      </section>

      <div className="relative">
        <SectionDividerShapes />
        <div className="h-px bg-glass-4/20" />
        <div className="h-8 bg-gradient-to-b from-glass-1 to-glass-3 opacity-40" />
      </div>

      {/* Benefits — 4 icon items, soft hover */}
      <section className="py-24 px-4 bg-glass-3 text-foreground">
        <div className="container max-w-5xl mx-auto">
          <HeadingReveal
            as="h2"
            className="font-heading text-3xl font-semibold text-center mb-14"
          >
            Benefits
          </HeadingReveal>
          <StaggerChildren
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
            stagger={0.1}
          >
            {[
              { label: "Personalized", icon: UserCheck },
              { label: "Safe Ingredients", icon: ShieldCheck },
              { label: "Routine Guidance", icon: BookOpen },
              { label: "Long-term Tracking", icon: TrendingUp },
            ].map((item) => (
              <StaggerItem key={item.label} className="flex flex-col items-center text-center">
                <motion.div
                  className="flex flex-col items-center"
                  whileHover={{ scale: 1.05, y: -2 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  <item.icon className="h-10 w-10 text-glass-1 mb-3" />
                  <span className="font-label text-sm text-foreground">{item.label}</span>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-28 px-4 bg-glass-4 overflow-hidden">
        <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          initial={false}
          whileInView={{ opacity: [0.4, 0.7] }}
          viewport={{ once: true }}
          transition={{ duration: 1.2 }}
          aria-hidden
        >
          <div
            className="w-[480px] h-[320px] rounded-full blur-[100px]"
            style={{
              background:
                "radial-gradient(circle, rgba(229,190,181,0.15) 0%, transparent 65%)",
            }}
          />
        </motion.div>
        <CTAShapes />
        <SectionReveal variant="fadeUp" className="relative z-10 text-center max-w-2xl mx-auto">
          <HeadingReveal
            as="h2"
            className="font-heading text-3xl md:text-4xl font-semibold text-foreground"
          >
            Start Understanding Your Skin
          </HeadingReveal>
          <SubtextReveal
            delay={0.15}
            className="mt-4 text-muted-foreground font-body"
          >
            Get a clinical-grade assessment and a routine built for you.
          </SubtextReveal>
          <div className="mt-10">
            <CTAWithGlow>
              <ClientAuthGate
                authenticated={
                  <Button size="lg" className="rounded-full" asChild>
                    <Link href="/start-assessment">Begin Assessment</Link>
                  </Button>
                }
                unauthenticated={
                  <Button size="lg" className="rounded-full" asChild>
                    <Link href="/signup">Begin Assessment</Link>
                  </Button>
                }
                placeholder={
                  <Button size="lg" className="rounded-full" asChild>
                    <Link href="/signup">Begin Assessment</Link>
                  </Button>
                }
              />
            </CTAWithGlow>
          </div>
        </SectionReveal>
      </section>
    </div>
  );
}
