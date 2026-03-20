"use client";

import { motion } from "framer-motion";
import {
  SectionReveal,
  StaggerChildren,
  StaggerItem,
} from "@/components/landing/ScrollReveal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const platformFaqs = [
  {
    q: "What is AI Assessment?",
    a: "AuraSkin AI evaluates your skin, lifestyle, and concerns to generate personalized recommendations.",
  },
  {
    q: "Is my data secure?",
    a: "User information is encrypted and used only for analysis improvement.",
  },
  {
    q: "Can I redo the assessment?",
    a: "Users can retake assessments anytime from dashboard.",
  },
];

const usageFaqs = [
  {
    q: "How long does it take?",
    a: "Assessment completes in minutes.",
  },
  {
    q: "Do I need prior skincare knowledge?",
    a: "No prior expertise required.",
  },
];

const accordionCardClass =
  "rounded-2xl border border-border/60 bg-card/90 backdrop-blur-[20px] shadow-md px-6";

export default function FAQPage() {
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
            Questions Answered
          </motion.h1>
          <motion.p
            className="mt-5 text-muted-foreground font-body text-lg md:text-xl max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.7, ease: "easeOut" }}
          >
            Understand how AuraSkin AI works and how your data is handled.
          </motion.p>
        </div>
      </section>

      <div className="h-px bg-border/40" />

      {/* Section 2 — Platform FAQs */}
      <section className="py-24 px-4 bg-background">
        <div className="container max-w-3xl mx-auto">
          <h2 className="font-heading text-2xl md:text-3xl font-semibold mb-8 text-foreground">
            Platform FAQs
          </h2>
          <StaggerChildren className="space-y-4" stagger={0.12}>
            {platformFaqs.map((faq) => (
              <StaggerItem key={faq.q}>
                <Accordion type="single" collapsible>
                  <AccordionItem
                    value={faq.q}
                    className={`border-none ${accordionCardClass}`}
                  >
                    <AccordionTrigger className="font-label font-medium text-base hover:no-underline py-6">
                      {faq.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground font-body">
                      {faq.a}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </div>
      </section>

      <div className="h-px bg-border/40" />

      {/* Section 3 — Usage FAQs */}
      <section className="py-24 px-4 bg-glass-3">
        <SectionReveal
          variant="slideUp"
          className="container max-w-3xl mx-auto"
        >
          <h2 className="font-heading text-2xl md:text-3xl font-semibold mb-8 text-foreground">
            Usage FAQs
          </h2>
          <Accordion type="single" collapsible className="space-y-4">
            {usageFaqs.map((faq) => (
              <AccordionItem
                key={faq.q}
                value={faq.q}
                className={`border-none ${accordionCardClass}`}
              >
                <AccordionTrigger className="font-label font-medium text-base hover:no-underline py-6">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground font-body">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </SectionReveal>
      </section>

      <div className="h-px bg-border/40" />

      {/* Section 4 — Trust */}
      <section className="py-24 px-4 bg-background">
        <SectionReveal
          variant="fadeOnly"
          className="container max-w-3xl mx-auto text-center"
        >
          <h2 className="font-heading text-3xl md:text-4xl font-semibold mb-6 text-foreground">
            Built With Care
          </h2>
          <p className="text-muted-foreground font-body text-lg leading-relaxed">
            AuraSkin AI aligns recommendations with clinical insights and user
            safety.
          </p>
        </SectionReveal>
      </section>
    </div>
  );
}
