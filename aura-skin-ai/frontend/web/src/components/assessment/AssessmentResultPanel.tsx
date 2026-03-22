"use client";

import type { ReactNode } from "react";
import type { Report } from "@/types";
import type { SeverityBucket } from "@/types/assessment";
import { reportToAssessmentResult } from "@/types/assessment";

const EMPTY_COPY = "No recommendation available";

function severityTitle(bucket: SeverityBucket): string {
  if (bucket === "low") return "Low";
  if (bucket === "high") return "High";
  return "Moderate";
}

function Section({
  title,
  children,
  hasContent,
}: {
  title: string;
  children: ReactNode;
  hasContent: boolean;
}) {
  return (
    <div className="space-y-2">
      <h3 className="font-label text-sm text-muted-foreground">{title}</h3>
      {hasContent ? children : <p className="text-sm text-muted-foreground">{EMPTY_COPY}</p>}
    </div>
  );
}

export function AssessmentResultPanel({ report }: { report: Report }) {
  const ar = reportToAssessmentResult({
    skinType: report.skinType,
    concerns: report.concerns,
    routineSteps: report.routineSteps,
    recommendedIngredients: report.recommendedIngredients,
    avoidIngredients: report.avoidIngredients,
    sensitivityLevel: report.sensitivityLevel,
    skinScore: report.skinScore,
    confidenceScore: report.confidenceScore,
    summary: report.summary,
  });

  const skinTypeDisplay = ar.skinType && ar.skinType !== "—" ? ar.skinType : "";
  const concernsOk = Array.isArray(ar.concerns) && ar.concerns.length > 0;
  const routineOk = Array.isArray(ar.routineSteps) && ar.routineSteps.length > 0;
  const suggestedOk = Array.isArray(ar.recommendedIngredients) && ar.recommendedIngredients.length > 0;
  const avoidOk = Array.isArray(ar.avoidIngredients) && ar.avoidIngredients.length > 0;
  const sensitivityOk = ar.sensitivityLevel && ar.sensitivityLevel !== "—";
  const score =
    report.confidenceScore != null && Number.isFinite(report.confidenceScore)
      ? report.confidenceScore
      : report.skinScore != null && Number.isFinite(report.skinScore)
        ? report.skinScore
        : ar.confidenceScore != null && Number.isFinite(ar.confidenceScore)
          ? ar.confidenceScore
          : null;

  const skinBlockHasContent =
    Boolean(skinTypeDisplay) ||
    Boolean(sensitivityOk) ||
    Boolean(report.inflammationLevelNormalized) ||
    score != null;

  return (
    <div className="space-y-4">
      <Section title="Skin Type detected" hasContent={skinBlockHasContent}>
        <div className="space-y-1 text-sm">
          {skinTypeDisplay ? <p>{skinTypeDisplay}</p> : null}
          {sensitivityOk ? <p className="text-muted-foreground">Sensitivity: {ar.sensitivityLevel}</p> : null}
          {report.inflammationLevelNormalized ? (
            <p className="text-muted-foreground">
              Inflammation: {severityTitle(report.inflammationLevelNormalized)}
            </p>
          ) : null}
          {score != null ? (
            <p className="text-muted-foreground">Confidence score: {Math.round(score)}</p>
          ) : null}
        </div>
      </Section>

      <Section title="Primary concerns" hasContent={concernsOk}>
        <ul className="list-disc pl-5 text-sm space-y-1">
          {ar.concerns.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </Section>

      <Section title="Recommended routine" hasContent={routineOk}>
        <ul className="list-disc pl-5 text-sm space-y-1">
          {ar.routineSteps.map((step, i) => (
            <li key={`${i}-${step.slice(0, 24)}`}>{step}</li>
          ))}
        </ul>
      </Section>

      <Section title="Suggested ingredients" hasContent={suggestedOk}>
        <ul className="list-disc pl-5 text-sm space-y-1">
          {ar.recommendedIngredients.map((ing) => (
            <li key={ing}>{ing}</li>
          ))}
        </ul>
      </Section>

      <Section title="Avoid ingredients" hasContent={avoidOk}>
        <ul className="list-disc pl-5 text-sm space-y-1">
          {ar.avoidIngredients.map((ing) => (
            <li key={ing}>{ing}</li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
