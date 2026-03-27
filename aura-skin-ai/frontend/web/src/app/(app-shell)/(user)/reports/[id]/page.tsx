"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getReportWithRecommendations, getReports } from "@/services/api";
import type { Report, Product } from "@/types";
import { UserProductCard } from "@/components/products/UserProductCard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CardSkeleton } from "@/components/ui/skeleton-primitives";
import { AssessmentResultPanel } from "@/components/assessment/AssessmentResultPanel";
import { ReportActionsSection } from "@/components/reports/ReportActionsSection";
import { sortReportsNewestFirst } from "@/lib/reportInsights";
import { isDocumentVisible, PANEL_LIVE_POLL_INTERVAL_MS } from "@/lib/panelPolling";
import { setReportBreadcrumbLabel } from "@/lib/reportBreadcrumbLabelStore";

export default function ReportDetailPage() {
  const params = useParams();
  const reportIdRaw = params?.id;
  const reportId = Array.isArray(reportIdRaw) ? reportIdRaw[0] : reportIdRaw;
  const [report, setReport] = useState<Report | null>(null);
  const [recommendations, setRecommendations] = useState<Product[]>([]);
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
        const result = await getReportWithRecommendations(reportId);
        if (!alive) return;
        if (result) {
          setReport(result.report);
          // Map recommended products to Product UI shape
          const products = result.recommendedProducts
            .map((item) => {
              const p = item.product;
              if (!p) return null;
              return {
                id: p.id,
                name: p.name ?? "Unknown Product",
                description: p.description ?? "",
                category: "Skincare", // Default or extract if available
                imageUrl: (p as any).image_url ?? (p as any).imageUrl,
                price: (p as any).price,
                brand: (p as any).brand,
              } as Product;
            })
            .filter((p): p is Product => p !== null);
          setRecommendations(products);
        }

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

  useEffect(() => {
    if (!reportId || typeof reportId !== "string") return;
    const id = window.setInterval(() => {
      if (!isDocumentVisible()) return;
      getReportWithRecommendations(reportId)
        .then((result) => {
          if (!result) return;
          setReport(result.report);
          const products = result.recommendedProducts
            .map((item) => {
              const p = item.product;
              if (!p) return null;
              return {
                id: p.id,
                name: p.name ?? "Unknown Product",
                description: p.description ?? "",
                category: "Skincare",
                imageUrl: (p as any).image_url ?? (p as any).imageUrl,
                price: (p as any).price,
                brand: (p as any).brand,
              } as Product;
            })
            .filter((p): p is Product => p !== null);
          setRecommendations(products);
        })
        .catch(() => {});
    }, PANEL_LIVE_POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [reportId]);

  useEffect(() => {
    if (!reportId || typeof reportId !== "string") return;
    const label = report?.userFullName?.trim();
    if (!label) return;
    setReportBreadcrumbLabel(reportId, label);
  }, [reportId, report?.userFullName]);

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
          <h1 className="font-heading text-2xl font-semibold">{report.userFullName?.trim() || "Assessment Report"}</h1>
          <p className="text-sm text-muted-foreground">
            {report.assessmentTimestamp
              ? new Date(report.assessmentTimestamp).toLocaleString()
              : report.date}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 rounded-xl border border-border/60 bg-muted/30 p-3 sm:grid-cols-2">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Skin type:</span> {report.skinType ?? "—"}
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Confidence score:</span>{" "}
              {typeof report.confidenceScore === "number" ? `${Math.round(report.confidenceScore)}%` : "—"}
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Hydration level:</span>{" "}
              {typeof report.hydrationLevel === "number" ? report.hydrationLevel : "—"}
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Age:</span>{" "}
              {typeof report.userAge === "number" ? report.userAge : "—"}
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Sleep hours:</span>{" "}
              {typeof report.sleepHours === "number" ? report.sleepHours : "—"}
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Sun exposure:</span> {report.sunExposure ?? "—"}
            </p>
          </div>
          {report.lifestyleInputs ? (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Lifestyle inputs:</span> {report.lifestyleInputs}
            </p>
          ) : null}
          <p className="text-sm text-foreground">
            {report.summary?.trim() ? report.summary : "—"}
          </p>
          <AssessmentResultPanel report={report} />
        </CardContent>
      </Card>

      {recommendations.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-heading text-xl font-semibold">Recommended for You</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recommendations.map((p) => (
              <UserProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      <ReportActionsSection report={report} previousReport={previousReport} />
    </div>
  );
}
