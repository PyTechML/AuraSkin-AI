import type { Report } from "@/types";

export type ImprovementStatus = "Improving" | "Stable" | "Needs Attention";
export type TrendDirection = "up" | "down" | "flat";
export type ReportStatusTag = "Initial" | "Follow-up" | "Monitoring";
export type ReportSource = "AI Generated" | "Dermatologist Reviewed" | "Manual Follow-up";
export type ManualEntryTag = "Self Update" | "Dermatologist Visit" | "Product Reaction";

export type TimelineReport = Report & {
  source?: ReportSource;
  manualTag?: ManualEntryTag;
  notes?: string;
  documentName?: string;
  createdAt?: number;
};

const POSITIVE = [
  "improved",
  "improving",
  "better",
  "stabilized",
  "stable",
  "balanced",
  "increased",
  "consistent",
];
const NEGATIVE = ["worse", "worsened", "flare", "irritated", "irritation", "breakout", "inflamed", "sensitive"];

function safeDateMs(dateStr?: string): number {
  if (!dateStr) return 0;
  const ms = new Date(dateStr).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

export function sortReportsNewestFirst<T extends { date: string }>(reports: T[]): T[] {
  return [...reports].sort((a, b) => safeDateMs(b.date) - safeDateMs(a.date));
}

export function getLastSkinType(reports: Report[]): string {
  const sorted = sortReportsNewestFirst(reports);
  const found = sorted.find((r) => r.skinType)?.skinType;
  return found ?? "—";
}

export function getDominantConcern(reports: Report[]): string {
  const counts = new Map<string, number>();
  for (const r of reports) {
    for (const c of r.concerns ?? []) {
      const key = c.trim();
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  let best: { key: string; n: number } | null = null;
  for (const [key, n] of Array.from(counts.entries())) {
    if (!best || n > best.n) best = { key, n };
  }
  return best?.key ?? "—";
}

export function getReportStatusTag(indexNewestFirst: number, total: number): ReportStatusTag {
  // `reports` are newest-first in the UI.
  if (total <= 1) return "Initial";
  const isOldest = indexNewestFirst === total - 1;
  const isSecondOldest = indexNewestFirst === total - 2;
  if (isOldest) return "Initial";
  if (isSecondOldest) return "Follow-up";
  return "Monitoring";
}

function textBlob(r?: Pick<Report, "summary" | "title" | "concerns"> | null): string {
  if (!r) return "";
  const concerns = (r.concerns ?? []).join(" ");
  return `${r.title} ${r.summary} ${concerns}`.toLowerCase();
}

function keywordScore(text: string, words: string[]): number {
  let score = 0;
  for (const w of words) {
    if (!w) continue;
    if (text.includes(w)) score += 1;
  }
  return score;
}

export function getImprovementStatus(reports: Report[]): {
  status: ImprovementStatus;
  directionLabel: string;
} {
  const sorted = sortReportsNewestFirst(reports);
  const latest = sorted[0];
  const prev = sorted[1];
  return getImprovementStatusBetween(latest ?? null, prev ?? null);
}

export function getImprovementStatusBetween(
  latest: Pick<Report, "title" | "summary" | "concerns"> | null,
  prev: Pick<Report, "title" | "summary" | "concerns"> | null
): { status: ImprovementStatus; directionLabel: string } {
  if (!latest || !prev) return { status: "Stable", directionLabel: "Not enough history" };

  const latestConcerns = latest.concerns?.length ?? 0;
  const prevConcerns = prev.concerns?.length ?? 0;
  const concernDelta = prevConcerns - latestConcerns; // positive means fewer concerns now

  const latestText = textBlob(latest);
  const prevText = textBlob(prev);
  const posDelta = keywordScore(latestText, POSITIVE) - keywordScore(prevText, POSITIVE);
  const negDelta = keywordScore(latestText, NEGATIVE) - keywordScore(prevText, NEGATIVE);

  const signal = concernDelta * 1.2 + posDelta * 0.7 - negDelta * 0.9;

  if (signal >= 1.25) return { status: "Improving", directionLabel: "Trending better" };
  if (signal <= -1.25) return { status: "Needs Attention", directionLabel: "Trending worse" };
  return { status: "Stable", directionLabel: "Holding steady" };
}

export function getTrendDirection(delta: number): TrendDirection {
  if (delta > 0) return "up";
  if (delta < 0) return "down";
  return "flat";
}

export function getDaysSince(dateStr?: string): number | null {
  if (!dateStr) return null;
  const ms = safeDateMs(dateStr);
  if (!ms) return null;
  const now = new Date();
  const d = new Date(ms);
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((now.getTime() - d.getTime()) / (24 * 60 * 60 * 1000)));
}

export function buildProgressSignals(reports: Report[]): {
  concern: { value: number; delta: number; direction: TrendDirection };
  texture: { value: number; delta: number; direction: TrendDirection };
  hydration: { value: number; delta: number; direction: TrendDirection };
  sensitivity: { value: number; delta: number; direction: TrendDirection };
} {
  const sorted = sortReportsNewestFirst(reports);
  const latest = sorted[0];
  const prev = sorted[1];

  const latestText = textBlob(latest);
  const prevText = textBlob(prev);

  const concernValue = (latest?.concerns?.length ?? 0) * 10;
  const prevConcernValue = (prev?.concerns?.length ?? 0) * 10;

  const textureValue = 50 + (latestText.includes("texture") ? 10 : 0) + (latestText.includes("smooth") ? 10 : 0) - (latestText.includes("uneven") ? 10 : 0);
  const prevTextureValue = 50 + (prevText.includes("texture") ? 10 : 0) + (prevText.includes("smooth") ? 10 : 0) - (prevText.includes("uneven") ? 10 : 0);

  const hydrationValue =
    50 +
    (latestText.includes("hydration") ? 12 : 0) +
    (latestText.includes("dry") ? -12 : 0) +
    (latestText.includes("dehydr") ? -12 : 0) +
    (latestText.includes("plump") ? 8 : 0);
  const prevHydrationValue =
    50 +
    (prevText.includes("hydration") ? 12 : 0) +
    (prevText.includes("dry") ? -12 : 0) +
    (prevText.includes("dehydr") ? -12 : 0) +
    (prevText.includes("plump") ? 8 : 0);

  const sensitivityValue =
    50 +
    (latestText.includes("sensitive") ? -10 : 0) +
    (latestText.includes("irritat") ? -12 : 0) +
    (latestText.includes("calm") ? 10 : 0) +
    (latestText.includes("barrier") ? 8 : 0);
  const prevSensitivityValue =
    50 +
    (prevText.includes("sensitive") ? -10 : 0) +
    (prevText.includes("irritat") ? -12 : 0) +
    (prevText.includes("calm") ? 10 : 0) +
    (prevText.includes("barrier") ? 8 : 0);

  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

  const concern = {
    value: clamp(concernValue),
    delta: clamp(concernValue) - clamp(prevConcernValue), // positive = more concerns (worse)
    direction: getTrendDirection(clamp(concernValue) - clamp(prevConcernValue)),
  };
  const texture = {
    value: clamp(textureValue),
    delta: clamp(textureValue) - clamp(prevTextureValue),
    direction: getTrendDirection(clamp(textureValue) - clamp(prevTextureValue)),
  };
  const hydration = {
    value: clamp(hydrationValue),
    delta: clamp(hydrationValue) - clamp(prevHydrationValue),
    direction: getTrendDirection(clamp(hydrationValue) - clamp(prevHydrationValue)),
  };
  const sensitivity = {
    value: clamp(sensitivityValue),
    delta: clamp(sensitivityValue) - clamp(prevSensitivityValue),
    direction: getTrendDirection(clamp(sensitivityValue) - clamp(prevSensitivityValue)),
  };

  return { concern, texture, hydration, sensitivity };
}

export function buildAiInsightBullets(reports: Report[]): string[] {
  const sorted = sortReportsNewestFirst(reports);
  const latest = sorted[0];
  const prev = sorted[1];
  if (!latest) return [];

  const signals = buildProgressSignals(reports);
  const bullets: string[] = [];

  if (signals.hydration.delta > 0) bullets.push("Hydration movement improved across recent entries.");
  if (signals.texture.delta > 0) bullets.push("Texture trend is moving in a smoother direction.");
  if (signals.sensitivity.delta > 0) bullets.push("Sensitivity signals look calmer and more stable.");
  if (signals.concern.delta > 0) bullets.push("Overall concern load is decreasing compared to the previous report.");

  const latestText = textBlob(latest);
  if (latestText.includes("routine adherence improved")) {
    bullets.push("Routine adherence is increasing — keep your routine consistent for compounding gains.");
  }

  if (!prev && bullets.length === 0) bullets.push("Add at least one follow-up report to unlock trend insights.");
  return bullets.slice(0, 4);
}

export function manualTagToSource(tag: ManualEntryTag): ReportSource {
  if (tag === "Dermatologist Visit") return "Dermatologist Reviewed";
  return "Manual Follow-up";
}

export function parseConcernsFromNotes(notes: string): string[] {
  const parts = notes
    .split(/[,;\n]/g)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.slice(0, 6);
}

export function nextStepRecommendation(reports: Report[]): {
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
} {
  const sorted = sortReportsNewestFirst(reports);
  const latest = sorted[0];
  if (!latest) {
    return {
      title: "Start your skin journey",
      description: "Complete your first assessment to generate a baseline report and begin tracking your progress over time.",
      ctaLabel: "Start assessment",
      ctaHref: "/start-assessment",
    };
  }

  const days = getDaysSince(latest.date);
  if (days != null && days > 30) {
    return {
      title: "Time for reassessment",
      description: "It’s been a while since your last report. A fresh assessment will update your timeline and unlock more accurate trend insights.",
      ctaLabel: "Reassess skin",
      ctaHref: "/start-assessment",
    };
  }

  const dominant = getDominantConcern(reports).toLowerCase();
  if (dominant.includes("dry") || dominant.includes("hydr")) {
    return {
      title: "Routine tweak suggestion",
      description: "Prioritize barrier support: add a hydrating serum step and avoid over-exfoliation for the next 10–14 days.",
      ctaLabel: "View latest report",
      ctaHref: `/reports/${latest.id}`,
    };
  }
  if (dominant.includes("texture") || dominant.includes("fine line")) {
    return {
      title: "Routine tweak suggestion",
      description: "Consider a gentle, gradual active schedule (2–3 nights/week) and track sensitivity in your next follow-up entry.",
      ctaLabel: "View latest report",
      ctaHref: `/reports/${latest.id}`,
    };
  }
  if (dominant.includes("sensitive") || dominant.includes("irrit")) {
    return {
      title: "Routine tweak suggestion",
      description: "Keep the routine minimal for a week (cleanser + moisturizer + SPF) and log any triggers in a manual report entry.",
      ctaLabel: "Add new report",
      ctaHref: "/reports",
    };
  }

  return {
    title: "Next step",
    description: "Log a follow-up report after a few consistent days to strengthen your progress intelligence and trend accuracy.",
    ctaLabel: "Add new report",
    ctaHref: "/reports",
  };
}

