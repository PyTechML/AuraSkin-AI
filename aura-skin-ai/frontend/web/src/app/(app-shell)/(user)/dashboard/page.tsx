"use client";

import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { getReports, getUserDashboardMetrics } from "@/services/api";
import { useCallback, useEffect, useState } from "react";
import { isDocumentVisible, PANEL_LIVE_POLL_INTERVAL_MS } from "@/lib/panelPolling";
import type { Report } from "@/types";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboardJourney } from "@/hooks/useDashboardJourney";
import { useRouteScrollMemory } from "@/hooks/useRouteScrollMemory";

const CIRCLE_SIZE = 88;
const STROKE = 8;
const R = (CIRCLE_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [reports, setReports] = useState<Report[]>([]);
  const [metrics, setMetrics] = useState<Awaited<ReturnType<typeof getUserDashboardMetrics>>>(null);

  useRouteScrollMemory("dashboard");

  const refetchDashboard = useCallback(() => {
    getReports().then((data) => setReports(Array.isArray(data) ? data : []));
    getUserDashboardMetrics().then(setMetrics);
  }, []);

  useEffect(() => {
    refetchDashboard();
  }, []);

  useEffect(() => {
    const onFocus = () => refetchDashboard();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refetchDashboard]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isDocumentVisible()) {
        refetchDashboard();
      }
    }, PANEL_LIVE_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refetchDashboard]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        refetchDashboard();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [refetchDashboard]);

  const journey = useDashboardJourney(reports, user ?? null, undefined, metrics ?? undefined);
  const latestReport = reports[0] ?? null;
  const hasReport = reports.length > 0;

  const ringOffset = CIRCUMFERENCE * (1 - journey.healthScore / 100);

  return (
    <div className="space-y-8">
      {/* Greeting Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <h1 className="font-heading text-2xl font-semibold">
          {journey.greetingPrefix}, {user?.email ?? user?.name ?? "there"}
        </h1>
        <p className="text-muted-foreground mt-1">{journey.greetingSubtext}</p>
      </motion.div>

      {/* AI Insight */}
      <motion.div
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="rounded-xl border border-border/60 bg-accent/10 px-4 py-3"
      >
        <p className="text-sm text-foreground/90">
          <span className="font-medium">AI Insight:</span> {journey.aiInsight}
        </p>
      </motion.div>

      {/* Skin Health Index */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="border-border relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" aria-hidden>
            <div className="absolute top-1/2 left-1/2 w-40 h-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent animate-pulse" />
          </div>
          <CardHeader>
            <CardTitle className="font-heading">Skin Health Index</CardTitle>
            <CardDescription>
              {!hasReport
                ? "No assessment yet — start your first skin check."
                : "Your overall skin wellness score."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative flex-shrink-0">
              <svg
                width={CIRCLE_SIZE}
                height={CIRCLE_SIZE}
                className="rotate-[-90deg]"
                aria-hidden
              >
                <circle
                  cx={CIRCLE_SIZE / 2}
                  cy={CIRCLE_SIZE / 2}
                  r={R}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={STROKE}
                  className="text-muted/40"
                />
                <motion.circle
                  cx={CIRCLE_SIZE / 2}
                  cy={CIRCLE_SIZE / 2}
                  r={R}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={STROKE}
                  strokeLinecap="round"
                  className="text-accent"
                  strokeDasharray={CIRCUMFERENCE}
                  initial={{ strokeDashoffset: CIRCUMFERENCE }}
                  animate={{ strokeDashoffset: ringOffset }}
                  transition={{ duration: 0.75, ease: "easeOut" }}
                />
              </svg>
            </div>
            <div className="flex-1 text-center sm:text-left space-y-2">
              <p className="font-heading text-2xl font-semibold">
                {!hasReport ? "—" : `${journey.healthScore} / 100`}
              </p>
              {hasReport && latestReport?.skinType && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Skin Type:</span> {latestReport.skinType}
                </p>
              )}
              {hasReport && latestReport?.concerns && latestReport.concerns.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Concerns:</span> {latestReport.concerns.join(", ")}
                </p>
              )}
              {!hasReport && (
                <p className="text-sm text-muted-foreground">Complete an assessment to see your score.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Latest Report Summary */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-heading">Latest Report Summary</CardTitle>
            <CardDescription>Your most recent skin assessment summary.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {latestReport ? (
              <>
                <p className="text-sm font-medium">{latestReport.title}</p>
                <p className="text-sm text-muted-foreground">{latestReport.summary}</p>
                {latestReport.skinType && (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Skin type:</span> {latestReport.skinType}
                  </p>
                )}
                {latestReport.concerns && latestReport.concerns.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Main concerns:</span> {latestReport.concerns.join(", ")}
                  </p>
                )}
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/reports/${latestReport.id}`}>View full report</Link>
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No assessment completed yet. Complete an assessment to see your first report here.
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Start Assessment — when no report */}
      {!hasReport && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="border-accent/30 bg-accent/5">
            <CardContent className="pt-6">
              <h2 className="font-heading font-semibold text-lg mb-2">Start your skin assessment</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Get a personalized skin analysis and routine based on your photos and questionnaire.
              </p>
              <Button asChild>
                <Link href="/start-assessment">Start assessment</Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
