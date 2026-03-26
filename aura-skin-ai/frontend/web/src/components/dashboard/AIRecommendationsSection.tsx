"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface RecommendedProductItem {
  id: string;
  name: string;
  benefit?: string;
  concernMatched?: string;
  confidence?: number;
}

export interface RecommendedDermatologistItem {
  id: string;
  name?: string;
  clinic_name?: string;
  routine?: string;
  advice?: string;
}

interface AIRecommendationsSectionProps {
  hasCompletedAssessment: boolean;
  isLoadingRecommendations?: boolean;
  hasRecommendationsData?: boolean;
  recommendedProducts?: RecommendedProductItem[];
  recommendedDermatologists?: RecommendedDermatologistItem[];
}

export function AIRecommendationsSection({
  hasCompletedAssessment,
  isLoadingRecommendations = false,
  hasRecommendationsData,
  recommendedProducts = [],
  recommendedDermatologists = [],
}: AIRecommendationsSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  if (!hasCompletedAssessment) {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-heading">Complete Assessment to Unlock Recommendations</CardTitle>
            <CardDescription>
              AI will suggest products and dermatologist insights after analyzing your skin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/start-assessment">Start Assessment</Link>
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  const hasProducts = recommendedProducts.length > 0;
  const hasDerms = recommendedDermatologists.length > 0;
  const effectiveHasRecommendations =
    typeof hasRecommendationsData === "boolean"
      ? hasRecommendationsData
      : hasProducts || hasDerms;

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      aria-label="AI Recommendations"
      className="space-y-6"
    >
      {isLoadingRecommendations && !effectiveHasRecommendations ? (
        <Card className="border-border">
          <CardContent className="py-8 text-center space-y-2">
            <p className="text-muted-foreground">Preparing your AI recommendations…</p>
            <p className="text-xs text-muted-foreground/80">
              This usually takes just a moment.
            </p>
          </CardContent>
        </Card>
      ) : !effectiveHasRecommendations ? (
        <Card className="border-border">
          <CardContent className="py-8 text-center space-y-2">
            <p className="text-muted-foreground">No recommendations available yet.</p>
            <p className="text-xs text-muted-foreground/80">
              Once your assessment has enough signal, AI recommendations will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-heading text-lg font-semibold">AI Recommended For You</h2>
            <span className="inline-flex items-center rounded-full border border-border/60 bg-muted/60 px-2.5 py-0.5 text-xs text-muted-foreground">
              AI Guided
            </span>
          </div>
          <p className="text-sm text-muted-foreground">Based on your latest skin assessment</p>

          <motion.div
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
          >
            {recommendedProducts.map((item) => (
              <motion.div
                key={item.id}
                variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
              >
                <Card className="overflow-hidden border-border flex flex-col h-full">
                  <div
                    className="relative w-full aspect-[4/3] flex-shrink-0 bg-muted/80 overflow-hidden"
                    aria-hidden
                  >
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
                      <ImageIcon className="h-10 w-10 text-muted-foreground/60" aria-hidden />
                    </div>
                  </div>
                  <CardHeader className="font-heading pb-1">
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    {item.benefit && <p className="text-sm text-muted-foreground">{item.benefit}</p>}
                    {item.concernMatched && (
                      <p className="text-xs text-muted-foreground">
                        Matched to:{" "}
                        <span className="font-medium text-foreground/90">{item.concernMatched}</span>
                      </p>
                    )}
                    {item.confidence != null && (
                      <p className="text-xs font-medium text-accent">AI Match: {item.confidence}%</p>
                    )}
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/shop/${item.id}`}>View product</Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          <div className="space-y-3">
            <h3 className="font-heading text-base font-semibold">Dermatologist Recommended Approach</h3>
            <motion.div
              className="grid gap-4 sm:grid-cols-2"
              variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
              initial="hidden"
              animate={inView ? "visible" : "hidden"}
            >
              {recommendedDermatologists.map((derm, i) => (
                <motion.div
                  key={derm.id || i}
                  variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                >
                  <Card className="border-border">
                    <CardContent className="pt-4 space-y-3">
                      {(derm.routine || derm.advice) && (
                        <p className="text-sm text-muted-foreground">
                          {derm.routine && <span className="font-medium text-foreground">{derm.routine}</span>}
                          {derm.routine && derm.advice && " "}
                          {derm.advice && <span className="text-foreground/90">{derm.advice}</span>}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {derm.name || derm.clinic_name || "Dermatologist"}
                      </p>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dermatologists/${derm.id}`}>View Profile</Link>
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </>
      )}
    </motion.section>
  );
}

