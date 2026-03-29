"use client";

import { motion } from "framer-motion";
import {
  SectionReveal,
  HeadingReveal,
  StaggerChildren,
  StaggerItem,
} from "@/components/landing/ScrollReveal";
import { scrollReveal } from "@/components/landing/ScrollReveal";
import { ServiceCard } from "@/components/landing/ServiceCard";
import { ClipboardList, Cpu, FileCheck } from "lucide-react";

const { slideUp } = scrollReveal;

const CORE_SERVICES = [
  {
    title: "AI Skin Assessment",
    description:
      "Understand your skin type, concerns, and lifestyle influences through structured AI analysis.",
    imageSrc: "/services/ai-skin-assessment.jpg",
    alt: "Person receiving a gentle facial skincare treatment",
  },
  {
    title: "Personalized Routine Builder",
    description:
      "Receive tailored morning and night routines aligned with your goals.",
    imageSrc: "/services/routine-builder.jpg",
    alt: "Skincare products arranged for a daily routine",
  },
  {
    title: "Progress Tracking",
    description:
      "Monitor skin changes and refine routines over time.",
    imageSrc: "/services/progress-tracking.jpg",
    alt: "Analytics charts representing progress over time",
  },
] as const;

const HOW_IT_WORKS_STEPS = [
  {
    step: 1,
    title: "Assessment Input",
    icon: ClipboardList,
  },
  {
    step: 2,
    title: "AI Mapping",
    icon: Cpu,
  },
  {
    step: 3,
    title: "Routine Creation",
    icon: FileCheck,
  },
] as const;

const EXTENDED_SUPPORT = [
  {
    title: "Dermatologist Referral",
    description:
      "When needed, the system can guide you toward professional consultation for persistent or complex concerns.",
    imageSrc: "/services/dermatologist-referral.jpg",
    alt: "Healthcare professional in a clinical setting",
  },
  {
    title: "Ingredient Safety Mapping",
    description:
      "Ingredients are checked against safety and compatibility data so your routine stays informed and low-risk.",
    imageSrc: "/services/ingredient-safety.jpg",
    alt: "Cosmetic jars and skincare ingredients",
  },
  {
    title: "Lifestyle Adjustment Logic",
    description:
      "Recommendations adapt to sleep, stress, environment, and habits so your routine fits your real life.",
    imageSrc: "/services/lifestyle-adjustment.jpg",
    alt: "Wellness and balanced lifestyle",
  },
] as const;

export default function ServicesPage() {
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
          <motion.h1
            className="font-heading text-4xl md:text-5xl font-semibold tracking-tight text-foreground"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            Intelligence That Powers Your Skin Journey
          </motion.h1>
          <motion.p
            className="mt-5 text-muted-foreground font-body text-lg md:text-xl max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.7, ease: "easeOut" }}
          >
            AuraSkin AI delivers clinically-informed analysis and personalized routines
            designed around your lifestyle and skin behavior.
          </motion.p>
        </div>
      </section>

      <div className="h-px bg-border/40" />

      {/* Section 2 — Core Capabilities */}
      <section className="py-24 px-4 bg-background">
        <div className="container max-w-5xl mx-auto">
          <HeadingReveal
            as="h2"
            className="font-heading text-3xl md:text-4xl font-semibold text-center mb-14 text-foreground"
          >
            Core Capabilities
          </HeadingReveal>
          <StaggerChildren
            className="grid md:grid-cols-3 gap-6"
            stagger={0.12}
          >
            {CORE_SERVICES.map((item) => (
              <StaggerItem key={item.title}>
                <ServiceCard
                  title={item.title}
                  description={item.description}
                  imageSrc={item.imageSrc}
                  alt={item.alt}
                />
              </StaggerItem>
            ))}
          </StaggerChildren>
        </div>
      </section>

      <div className="h-px bg-border/40" />

      {/* Section 3 — How It Works */}
      <section className="py-24 px-4 bg-glass-3">
        <div className="container max-w-5xl mx-auto">
          <motion.h2
            className="font-heading text-3xl md:text-4xl font-semibold text-center mb-16 text-foreground"
            {...slideUp}
          >
            From Insight To Action
          </motion.h2>
          <motion.div
            className="grid md:grid-cols-3 gap-8 relative"
            {...slideUp}
          >
            <div className="hidden md:block absolute top-16 left-[16.666%] right-[16.666%] h-0.5 bg-foreground/10 -translate-y-1/2" />
            {HOW_IT_WORKS_STEPS.map((item) => (
              <div
                key={item.step}
                className="relative flex flex-col items-center text-center"
              >
                <div className="w-12 h-12 rounded-full bg-muted border border-border/60 flex items-center justify-center font-label font-semibold text-lg mb-4 relative z-10">
                  {item.step}
                </div>
                <div className="rounded-2xl border border-border/50 backdrop-blur-[20px] bg-card/80 p-6 flex flex-col items-center shadow-md w-full">
                  <item.icon className="h-10 w-10 text-muted-foreground mb-3" aria-hidden />
                  <h3 className="font-heading font-semibold text-lg text-foreground">
                    {item.title}
                  </h3>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <div className="h-px bg-border/40" />

      {/* Section 4 — Supporting Intelligence (Extended Support) */}
      <section className="py-24 px-4 bg-background">
        <div className="container max-w-5xl mx-auto">
          <SectionReveal variant="fadeOnly">
            <h2 className="font-heading text-3xl md:text-4xl font-semibold text-center mb-14 text-foreground">
              Supporting Intelligence
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {EXTENDED_SUPPORT.map((item) => (
                <ServiceCard
                  key={item.title}
                  title={item.title}
                  description={item.description}
                  imageSrc={item.imageSrc}
                  alt={item.alt}
                />
              ))}
            </div>
          </SectionReveal>
        </div>
      </section>

      <div className="h-px bg-border/40" />

      {/* Section 5 — Outcome */}
      <section className="py-24 px-4 bg-glass-3">
        <SectionReveal variant="fadeOnly" className="container max-w-3xl mx-auto text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-semibold mb-6 text-foreground">
            Built For Real-World Results
          </h2>
          <p className="text-muted-foreground font-body text-lg leading-relaxed">
            AuraSkin AI aligns clinical insights with lifestyle inputs to deliver actionable
            skincare strategies that evolve over time.
          </p>
        </SectionReveal>
      </section>
    </div>
  );
}
