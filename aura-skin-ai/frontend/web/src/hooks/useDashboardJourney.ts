"use client";

import { useMemo } from "react";
import type { Report } from "@/types";
import type { UserRoutineCurrent, UserDashboardMetrics } from "@/services/api";
import type { User } from "@/types";

export type TimeOfDay = "morning" | "afternoon" | "evening";
export type JourneyStep = "assessment" | "routine" | "progress" | "optimization";

export interface DashboardJourneyData {
  timeOfDay: TimeOfDay;
  greetingSubtext: string;
  healthScore: number;
  healthScoreDelta: number;
  aiInsight: string;
  routineStreak: number;
  routinePercent: number;
  nextActionLabel: string;
  nextActionCountdownDays: number;
  journeyStep: JourneyStep;
  ctaLabel: string;
  ctaHref: string;
}

const GREETING_SUBTEXTS: string[] = [
  "Your skin consistency improved this week.",
  "Your hydration score is trending upward.",
  "Stick with your routine — it's working.",
  "One more assessment will refine your insights.",
];

const AI_INSIGHTS: string[] = [
  "Your skin responds better to hydration routines than exfoliation.",
  "Consistent SPF use is strengthening your barrier over time.",
  "Evening routine adherence correlates with morning radiance.",
];

const CTA_OPTIONS: { label: string; href: string }[] = [
  { label: "Reassess Skin", href: "/start-assessment" },
  { label: "Log Progress Today", href: "/tracking" },
  { label: "Update Night Routine", href: "/reports" },
];

function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  return "evening";
}

function getGreetingPrefix(timeOfDay: TimeOfDay): string {
  switch (timeOfDay) {
    case "morning":
      return "Good Morning";
    case "afternoon":
      return "Good Afternoon";
    case "evening":
      return "Good Evening";
    default:
      return "Welcome back";
  }
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
}

function deriveJourneyStep(reports: Report[], routinePercent: number): JourneyStep {
  if (!reports.length) return "assessment";
  if (routinePercent < 30) return "routine";
  if (routinePercent < 70) return "progress";
  return "optimization";
}

/** Stable choice from list based on report count + date for deterministic UI. */
function pickFromList<T>(list: T[], seed: number): T {
  return list[seed % list.length];
}

export function useDashboardJourney(
  reports: Report[],
  user: User | null,
  routineSummary?: UserRoutineCurrent | null,
  metrics?: UserDashboardMetrics | null
): DashboardJourneyData & { greetingPrefix: string } {
  return useMemo(() => {
    const timeOfDay = getTimeOfDay();
    const greetingPrefix = getGreetingPrefix(timeOfDay);
    const latestReport = reports[0];
    const reportCount = reports.length;
    const seed = reportCount * 7 + (latestReport ? new Date(latestReport.date).getDate() : 0);

    const lastAssessmentDate = latestReport?.date;
    const nextAssessmentDays = lastAssessmentDate
      ? daysUntil(new Date(new Date(lastAssessmentDate).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
      : 7;

    const routinePercent =
      routineSummary?.adherence.percentLast7Days != null
        ? routineSummary.adherence.percentLast7Days
        : 0;
    const routineStreak =
      routineSummary?.adherence.currentStreakDays != null
        ? routineSummary.adherence.currentStreakDays
        : 0;
    const journeyStep = deriveJourneyStep(reports, routinePercent);

    const greetingSubtext =
      reportCount > 0
        ? pickFromList(GREETING_SUBTEXTS, seed)
        : "Complete your first assessment to get personalized insights.";

    const nextActionLabel =
      nextAssessmentDays > 0
        ? `Re-run assessment in ${nextAssessmentDays} day${nextAssessmentDays === 1 ? "" : "s"} to refine texture analysis.`
        : "Re-run your assessment today to track changes.";

    const ctaOption = pickFromList(CTA_OPTIONS, seed);

    const latestScoreFromReport =
      latestReport && typeof (latestReport as any).skinScore === "number"
        ? (latestReport as any).skinScore
        : 0;
    const healthScore = metrics?.skinHealthIndex ?? latestScoreFromReport ?? 0;
    const healthScoreDelta = metrics?.weeklyProgress ?? 0;

    return {
      timeOfDay,
      greetingPrefix,
      greetingSubtext,
      healthScore,
      healthScoreDelta,
      aiInsight: pickFromList(AI_INSIGHTS, seed + 1),
      routineStreak,
      routinePercent,
      nextActionLabel,
      nextActionCountdownDays: nextAssessmentDays,
      journeyStep,
      ctaLabel: ctaOption.label,
      ctaHref: ctaOption.href,
    };
  }, [reports, user?.id, routineSummary, metrics]);
}
