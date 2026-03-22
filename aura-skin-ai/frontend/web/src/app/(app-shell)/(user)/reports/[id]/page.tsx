"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getReportById, getReports } from "@/services/api";
import type { Report } from "@/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CardSkeleton } from "@/components/ui/skeleton-primitives";
import { AssessmentResultPanel } from "@/components/assessment/AssessmentResultPanel";
import { ReportActionsSection } from "@/components/reports/ReportActionsSection";
import { sortReportsNewestFirst } from "@/lib/reportInsights";

export default function ReportDetailPage() {
  const params = useParams();
  const reportIdRaw = params?.id;
  const reportId = Array.isArray(reportIdRaw) ? reportIdRaw[0] : reportIdRaw;
  const [report, setReport] = useState<Report | null>(null);
  const [previousReport, setPreviousReport] = useState<Report | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!reportId || typeof reportId !== "string") {
      setLoaded(true);
      setLoadError("Invalid report id");
      return;
    }
    let alive = true;
    setLoaded(false);
    setLoadError(null);

    const load = async () => {
      try {
        const current = await getReportById(reportId);
        if (!alive) return;
        setReport(current);

        const all = await getReports();
        if (!alive) return;
        const list = Array.isArray(all) ? all : [];
        const sorted = sortReportsNewestFirst(list);
        const idx = sorted.findIndex((r) => r.id === reportId);
        const prev = idx >= 0 ? sorted[idx + 1] ?? null : null;
        setPreviousReport(prev);
        setLoaded(true);
      } catch (e) {
        if (!alive) return;
        setLoaded(true);
        setLoadError("Failed to load data");
      }
    };

    void load();

    return () => {
      alive = false;
    };
  }, [reportId]);

  if (!loaded) {
    return (
      <div className="space-y-6">
        <div className="h-9 w-28 rounded-md border border-border/60 bg-muted/40 animate-pulse" aria-hidden />
        <CardSkeleton height="h-40" />
        <CardSkeleton height="h-56" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/reports">Back to reports</Link>
        </Button>
        <p className="text-muted-foreground">Failed to load data</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/reports">Back to reports</Link>
        </Button>
        <p className="text-muted-foreground">Report not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" asChild>
        <Link href="/reports">Back to reports</Link>
      </Button>
      <Card className="border-border">
        <CardHeader>
          <h1 className="font-heading text-2xl font-semibold">{report.title}</h1>
          <p className="text-sm text-muted-foreground">{report.date}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-foreground">
            {report.summary?.trim() ? report.summary : "—"}
          </p>
          <AssessmentResultPanel report={report} />
        </CardContent>
      </Card>

      <ReportActionsSection report={report} previousReport={previousReport} />
    </div>
  );
}
