"use client";

import React from "react";
import { StaggerChildren, StaggerItem } from "../../../../components/landing/ScrollReveal";
import { SupportLayout } from "../../../../components/support/SupportLayout";
import { SupportHero } from "../../../../components/support/SupportHero";
import { SupportSection } from "../../../../components/support/SupportSection";
import { ArticleCard } from "../../../../components/support/ArticleCard";
import { Card, CardContent } from "../../../../components/ui/card";

const FEATURED_ARTICLES = [
  {
    title: "Understanding AI Skin Analysis",
    summary:
      "Learn how AuraSkin AI interprets patterns in your assessment inputs to understand skin type, sensitivity, and concerns with clinical-style structure.",
    category: "AI",
  },
  {
    title: "Routine Planning with Data",
    summary:
      "See why routines built from structured data outperform generic skincare advice, and how AuraSkin AI keeps recommendations grounded in your real-world context.",
    category: "Routine",
  },
  {
    title: "Lifestyle & Skin Health",
    summary:
      "Explore how sleep, diet, stress, and environment influence skin behavior—and how incorporating these factors leads to more stable, predictable results.",
    category: "Skin Science",
  },
] as const;

export default function BlogPage() {
  return (
    <SupportLayout>
      <SupportHero
        title="Insights & Intelligence"
        subtitle="Explore skincare science, AI-driven analysis, and routine strategies designed to improve long-term skin health."
      />

      <SupportSection
        title="Featured Articles"
        subtitle="Deep dives into how AuraSkin AI thinks about skin, routines, and long-term outcomes."
        background="glass3"
      >
        <StaggerChildren className="grid gap-6 md:grid-cols-3" stagger={0.14}>
          {FEATURED_ARTICLES.map((article) => (
            <StaggerItem key={article.title}>
              <ArticleCard
                title={article.title}
                summary={article.summary}
                category={article.category}
              />
            </StaggerItem>
          ))}
        </StaggerChildren>
      </SupportSection>

      <SupportSection
        title="Coming Insights"
        subtitle="We continuously publish educational resources to help you make informed, evidence-aligned skincare decisions."
        background="glass4"
        variant="fadeOnly"
      >
        <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)] items-stretch">
          <Card className="h-full">
            <CardContent className="pt-6 space-y-3">
              <p className="text-muted-foreground font-body text-base leading-relaxed">
                Expect guidance that explains the why behind each recommendation—from ingredient
                roles and interaction patterns to how lifestyle shifts can change your skin&apos;s
                response over time.
              </p>
              <p className="text-muted-foreground font-body text-base leading-relaxed">
                Articles are written to feel like a conversation with a clinically informed guide,
                not marketing copy—so you can translate insights into confident day-to-day choices.
              </p>
            </CardContent>
          </Card>
          <Card className="h-full">
            <CardContent className="pt-6 space-y-2">
              <p className="text-sm font-label uppercase tracking-[0.18em] text-muted-foreground">
                Upcoming themes
              </p>
              <ul className="mt-2 space-y-2 text-sm text-muted-foreground font-body leading-relaxed">
                <li>Ingredient spotlights grounded in dermatology logic.</li>
                <li>Case-style walkthroughs of evolving routines.</li>
                <li>Guides on reading and interpreting your own results.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </SupportSection>
    </SupportLayout>
  );
}
