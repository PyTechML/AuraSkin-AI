"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getReports } from "@/services/api";
import type { Report } from "@/types";
import { useAuthStore } from "@/store/authStore";
import { motion, animate } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Calendar,
  CircleDot,
  Download,
  Droplet,
  FileText,
  Share2,
  Sparkles,
  Tag,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription as DialogDesc,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDashboardJourney } from "@/hooks/useDashboardJourney";
import {
  buildAiInsightBullets,
  buildProgressSignals,
  getDominantConcern,
  getImprovementStatus,
  getImprovementStatusBetween,
  getLastSkinType,
  getReportStatusTag,
  manualTagToSource,
  nextStepRecommendation,
  parseConcernsFromNotes,
  sortReportsNewestFirst,
  type ManualEntryTag,
  type ReportSource,
  type TimelineReport,
} from "@/lib/reportInsights";
import {
  isDocumentVisible,
  PANEL_LIVE_POLL_INTERVAL_MS,
  takeFreshList,
} from "@/lib/panelPolling";

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [manualReports, setManualReports] = useState<TimelineReport[]>([]);

  const user = useAuthStore((s) => s.user);
  const journey = useDashboardJourney(reports, user ?? null);

  useEffect(() => {
    getReports().then((data) => {
      const list = Array.isArray(data) ? data : [];
      setReports(list);
    });
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (!isDocumentVisible()) return;
      getReports()
        .then((data) => {
          setReports((prev) => takeFreshList(prev, Array.isArray(data) ? data : []));
        })
        .catch(() => {});
    }, PANEL_LIVE_POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  const reportsList = Array.isArray(reports) ? reports : [];
  const timelineReports: TimelineReport[] = sortReportsNewestFirst([
    ...reportsList.map((r) => ({ ...r, source: "AI Generated" as const })),
    ...(Array.isArray(manualReports) ? manualReports : []),
  ]);

  const totalAssessments = timelineReports.length;
  const lastSkinType = getLastSkinType(timelineReports);
  const dominantConcern = getDominantConcern(timelineReports);
  const improvement = getImprovementStatus(timelineReports);
  const progressSignals = buildProgressSignals(timelineReports);
  const aiBullets = buildAiInsightBullets(timelineReports);
  const nextStep = nextStepRecommendation(timelineReports);

  const [metricConcern, setMetricConcern] = useState(0);
  const [metricTexture, setMetricTexture] = useState(0);
  const [metricHydration, setMetricHydration] = useState(0);
  const [metricSensitivity, setMetricSensitivity] = useState(0);

  useEffect(() => {
    const c = animate(0, progressSignals.concern.value, {
      duration: 0.6,
      ease: "easeOut",
      onUpdate: (v) => setMetricConcern(v),
    });
    const t = animate(0, progressSignals.texture.value, {
      duration: 0.6,
      ease: "easeOut",
      onUpdate: (v) => setMetricTexture(v),
    });
    const h = animate(0, progressSignals.hydration.value, {
      duration: 0.6,
      ease: "easeOut",
      onUpdate: (v) => setMetricHydration(v),
    });
    const s = animate(0, progressSignals.sensitivity.value, {
      duration: 0.6,
      ease: "easeOut",
      onUpdate: (v) => setMetricSensitivity(v),
    });
    return () => {
      c.stop();
      t.stop();
      h.stop();
      s.stop();
    };
  }, [
    progressSignals.concern.value,
    progressSignals.texture.value,
    progressSignals.hydration.value,
    progressSignals.sensitivity.value,
  ]);

  const statusBadgeVariant =
    improvement.status === "Improving"
      ? ("success" as const)
      : improvement.status === "Needs Attention"
        ? ("warning" as const)
        : ("secondary" as const);

  function badgeVariantForStatus(status: "Improving" | "Stable" | "Needs Attention") {
    if (status === "Improving") return "success" as const;
    if (status === "Needs Attention") return "warning" as const;
    return "secondary" as const;
  }

  function trendIcon(direction: "up" | "down" | "flat") {
    if (direction === "up") return <ArrowUp className="h-4 w-4 text-muted-foreground" aria-hidden />;
    if (direction === "down") return <ArrowDown className="h-4 w-4 text-muted-foreground" aria-hidden />;
    return <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />;
  }

  function concernIconFor(label: string) {
    const l = label.toLowerCase();
    if (l.includes("dry") || l.includes("hydr")) return Droplet;
    if (l.includes("texture") || l.includes("uneven")) return Sparkles;
    if (l.includes("sensi") || l.includes("irrit")) return AlertTriangle;
    if (l.includes("acne") || l.includes("breakout")) return CircleDot;
    if (l.includes("fine line") || l.includes("line") || l.includes("wrinkle")) return Activity;
    return FileText;
  }

  const [addOpen, setAddOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [actionTitle, setActionTitle] = useState<string>("");
  const [actionDescription, setActionDescription] = useState<string>("");

  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState<string>("");
  const [newNotes, setNewNotes] = useState("");
  const [newTag, setNewTag] = useState<ManualEntryTag>("Self Update");
  const [newDocumentName, setNewDocumentName] = useState<string>("");

  useEffect(() => {
    setNewDate(new Date().toISOString().slice(0, 10));
  }, []);

  function openComingSoon(kind: "Download PDF" | "Share with Dermatologist", r: TimelineReport) {
    setActionTitle(kind);
    setActionDescription(`"${r.title}" — ${kind} is UI-ready and will be connected once backend export/sharing is enabled.`);
    setActionOpen(true);
  }

  function addManualReport() {
    const notes = newNotes.trim();
    const title = newTitle.trim();
    const date = newDate;
    if (!title || !date) return;

    const concerns = notes ? parseConcernsFromNotes(notes) : [];
    const source: ReportSource = manualTagToSource(newTag);
    const summary = notes
      ? notes.length > 160
        ? `${notes.slice(0, 157)}…`
        : notes
      : `Manual update tagged as ${newTag}.`;

    const entry: TimelineReport = {
      id: `manual-${Date.now()}`,
      title,
      date,
      summary,
      concerns,
      source,
      manualTag: newTag,
      notes,
      documentName: newDocumentName || undefined,
      createdAt: Date.now(),
    };

    setManualReports((prev) => sortReportsNewestFirst([entry, ...prev]));
    setAddOpen(false);
    setNewTitle("");
    setNewNotes("");
    setNewTag("Self Update");
    setNewDocumentName("");
  }

  const latest = timelineReports[0];
  const previous = timelineReports[1];

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-semibold">Reports</h1>
      <p className="text-muted-foreground">
        Your Skin Intelligence Timeline, clinical progress archive, and AI insight dashboard.
      </p>

      {/* 1) Skin Journey Summary */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
      >
        <Card className="border-border">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="font-heading">Skin Journey Summary</CardTitle>
              <CardDescription>Your snapshot across assessments and progress signals.</CardDescription>
            </div>
            <Badge variant={statusBadgeVariant} className="w-fit">
              {improvement.status}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-xl border border-border/60 bg-muted/40 px-4 py-3">
                <p className="text-xs text-muted-foreground">Total Assessments</p>
                <p className="font-heading text-xl font-semibold">{totalAssessments}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/40 px-4 py-3">
                <p className="text-xs text-muted-foreground">Last Skin Type</p>
                <p className="font-heading text-xl font-semibold">{lastSkinType}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/40 px-4 py-3">
                <p className="text-xs text-muted-foreground">Dominant Concern</p>
                <p className="font-heading text-xl font-semibold">{dominantConcern}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/40 px-4 py-3">
                <p className="text-xs text-muted-foreground">Improvement Direction</p>
                <p className="font-heading text-xl font-semibold">{improvement.directionLabel}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/40 px-4 py-3">
                <p className="text-xs text-muted-foreground">Routine Adherence</p>
                <p className="font-heading text-xl font-semibold">{journey.routinePercent}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 2) Reports Timeline + 3) Add report + 6) Compare */}
      <Card className="border-border">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="font-heading text-lg">Reports Timeline</CardTitle>
            <CardDescription>Track assessments, follow-ups, and monitoring entries over time.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  Add New Report
                </Button>
              </DialogTrigger>
              <DialogContent className="border-border">
                <DialogHeader>
                  <DialogTitle>Add New Report</DialogTitle>
                  <DialogDesc>
                    Add an external or manual entry to your timeline (UI-only for now).
                  </DialogDesc>
                </DialogHeader>

                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="reportTitle">Report Title</Label>
                    <Input
                      id="reportTitle"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g., Dermatologist visit — follow-up"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="reportDate">Date</Label>
                    <Input
                      id="reportDate"
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="reportNotes">Concern Notes</Label>
                    <textarea
                      id="reportNotes"
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      placeholder="Notes (comma/newline separated concerns work best)"
                      className="min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="reportDoc">Upload Document</Label>
                    <Input
                      id="reportDoc"
                      type="file"
                      onChange={(e) => setNewDocumentName(e.target.files?.[0]?.name ?? "")}
                    />
                    {newDocumentName ? (
                      <p className="text-xs text-muted-foreground">Selected: {newDocumentName}</p>
                    ) : null}
                  </div>
                  <div className="grid gap-2">
                    <Label>Tag</Label>
                    <Select value={newTag} onValueChange={(v) => setNewTag(v as ManualEntryTag)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select tag" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Self Update">Self Update</SelectItem>
                        <SelectItem value="Dermatologist Visit">Dermatologist Visit</SelectItem>
                        <SelectItem value="Product Reaction">Product Reaction</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setAddOpen(false)}
                    type="button"
                  >
                    Cancel
                  </Button>
                  <Button onClick={addManualReport} type="button">
                    Add to timeline
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={!latest || !previous}>
                  Compare Progress
                </Button>
              </DialogTrigger>
              <DialogContent
                className="border-border left-auto right-0 top-0 h-[100dvh] w-full max-w-md translate-x-0 translate-y-0 rounded-none sm:rounded-none sm:max-w-md"
                showClose
              >
                <DialogHeader>
                  <DialogTitle>Before vs After</DialogTitle>
                  <DialogDesc>Compare your latest two timeline entries (UI-only).</DialogDesc>
                </DialogHeader>

                {latest && previous ? (
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" aria-hidden />
                        <span>Before: {previous.date}</span>
                      </div>
                      <p className="text-sm font-medium">{previous.title}</p>
                      <p className="text-sm text-muted-foreground">{previous.summary}</p>
                    </div>
                    <div className="grid gap-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" aria-hidden />
                        <span>After: {latest.date}</span>
                      </div>
                      <p className="text-sm font-medium">{latest.title}</p>
                      <p className="text-sm text-muted-foreground">{latest.summary}</p>
                    </div>

                    <div className="rounded-xl border border-border/60 bg-muted/40 px-4 py-3">
                      <p className="text-sm font-medium">Progress deltas</p>
                      <div className="mt-3 grid gap-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Concern change</span>
                          <span className="font-medium">
                            {(previous.concerns?.length ?? 0) - (latest.concerns?.length ?? 0) >= 0 ? "+" : ""}
                            {(previous.concerns?.length ?? 0) - (latest.concerns?.length ?? 0)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Texture change</span>
                          <span className="font-medium">
                            {progressSignals.texture.delta > 0 ? "+" : ""}
                            {progressSignals.texture.delta}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Sensitivity change</span>
                          <span className="font-medium">
                            {progressSignals.sensitivity.delta > 0 ? "+" : ""}
                            {progressSignals.sensitivity.delta}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Add at least two reports to compare.</p>
                )}

                <DialogFooter className="mt-2">
                  {latest ? (
                    <Button variant="outline" asChild>
                      <Link href={`/reports/${latest.id}`}>View latest report</Link>
                    </Button>
                  ) : null}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent>
          {timelineReports.length === 0 ? (
            <div className="rounded-xl border border-border/60 bg-muted/40 p-6">
              <p className="font-heading text-lg font-semibold">No assessment completed yet.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Start with a baseline assessment or add a manual entry to begin your clinical progress archive.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild>
                  <Link href="/start-assessment">Start assessment</Link>
                </Button>
                <Button variant="outline" onClick={() => setAddOpen(true)} type="button">
                  Add New Report
                </Button>
              </div>
            </div>
          ) : (
            <div className="relative pl-10">
              <motion.div
                aria-hidden
                className="absolute left-4 top-2 bottom-2 w-px bg-border/60 origin-top"
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />

              <div className="space-y-4">
                {timelineReports.map((report, idx) => {
                  if (!report) return null;
                  const statusTag = getReportStatusTag(idx, timelineReports.length);
                  const ConcernIcon = concernIconFor(report.concerns?.[0] ?? "");
                  const source = report.source ?? "AI Generated";
                  const prevForThis = timelineReports[idx + 1] ?? null;
                  const perReportImprovement = getImprovementStatusBetween(report, prevForThis);
                  return (
                    <div key={report.id} className="relative">
                      <div
                        aria-hidden
                        className="absolute left-[11px] top-8 h-3 w-3 rounded-full border border-border bg-background"
                      />
                      <Card
                        className="border-border hover:shadow-[0_0_24px_rgba(229,190,181,0.22)]"
                      >
                        <CardHeader className="gap-2">
                          <div className="flex flex-row items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <ConcernIcon className="h-4 w-4 text-accent shrink-0" aria-hidden />
                                <span className="font-heading font-medium truncate">
                                  {report.userFullName?.trim() || report.title}
                                </span>
                              </div>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <Badge variant="outline">{statusTag}</Badge>
                                <Badge variant="secondary">{source}</Badge>
                                {report.manualTag ? (
                                  <Badge variant="outline" className="flex items-center gap-1">
                                    <Tag className="h-3.5 w-3.5" aria-hidden />
                                    {report.manualTag}
                                  </Badge>
                                ) : null}
                                <Badge variant={badgeVariantForStatus(perReportImprovement.status)}>
                                  {perReportImprovement.status}
                                </Badge>
                              </div>
                            </div>
                            <span className="text-sm text-muted-foreground shrink-0 flex items-center gap-2">
                              <Calendar className="h-4 w-4" aria-hidden />
                              {report.assessmentTimestamp
                                ? new Date(report.assessmentTimestamp).toLocaleDateString()
                                : report.date}
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {(report as Report).skinScore != null && (
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium text-foreground">Skin score:</span> {(report as Report).skinScore} / 100
                            </p>
                          )}
                          {(report as Report).skinType && (
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium text-foreground">Skin type:</span> {(report as Report).skinType}
                            </p>
                          )}
                          {(report as Report).confidenceScore != null && (
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium text-foreground">Confidence score:</span>{" "}
                              {Math.round(Number((report as Report).confidenceScore))}%
                            </p>
                          )}
                          {(((report as Report).sleepHours != null) || (report as Report).sunExposure) && (
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium text-foreground">Lifestyle:</span>{" "}
                              {(report as Report).sleepHours != null
                                ? `${(report as Report).sleepHours}h sleep`
                                : "Sleep —"}
                              {(report as Report).sunExposure ? `, ${(report as Report).sunExposure} sun exposure` : ""}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground">{report.summary}</p>

                          {report.concerns && report.concerns.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-2">
                              {report.concerns.slice(0, 6).map((c) => {
                                const Icon = concernIconFor(c);
                                return (
                                  <span
                                    key={c}
                                    className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground"
                                  >
                                    <Icon className="h-3.5 w-3.5 text-accent" aria-hidden />
                                    <span className="truncate max-w-[16rem]">{c}</span>
                                  </span>
                                );
                              })}
                            </div>
                          ) : null}

                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/reports/${report.id}`}>View report</Link>
                            </Button>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                type="button"
                                aria-label="Download PDF"
                                onClick={() => openComingSoon("Download PDF", report)}
                              >
                                <Download className="h-4 w-4" aria-hidden />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                type="button"
                                aria-label="Share with Dermatologist"
                                onClick={() => openComingSoon("Share with Dermatologist", report)}
                              >
                                <Share2 className="h-4 w-4" aria-hidden />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4) Progress Intelligence Layer */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="font-heading text-lg">Progress Intelligence</CardTitle>
          <CardDescription>Auto-analyzed movement across your recent reports.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border/60 bg-muted/40 px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Concern Trend</p>
                {trendIcon(progressSignals.concern.direction)}
              </div>
              <p className="font-heading text-xl font-semibold">{Math.round(metricConcern)}</p>
              <p className="text-xs text-muted-foreground mt-1">Index (lower is better)</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/40 px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Texture Trend</p>
                {trendIcon(progressSignals.texture.direction)}
              </div>
              <p className="font-heading text-xl font-semibold">{Math.round(metricTexture)}</p>
              <p className="text-xs text-muted-foreground mt-1">Texture index</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/40 px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Hydration Movement</p>
                {trendIcon(progressSignals.hydration.direction)}
              </div>
              <p className="font-heading text-xl font-semibold">{Math.round(metricHydration)}</p>
              <p className="text-xs text-muted-foreground mt-1">Hydration index</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/40 px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Sensitivity Pattern</p>
                {trendIcon(progressSignals.sensitivity.direction)}
              </div>
              <p className="font-heading text-xl font-semibold">{Math.round(metricSensitivity)}</p>
              <p className="text-xs text-muted-foreground mt-1">Stability index</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5) AI Trend Insight Panel */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-heading text-lg">AI Trend Insights</CardTitle>
            <CardDescription>High-signal takeaways from your timeline patterns.</CardDescription>
          </CardHeader>
          <CardContent>
            {aiBullets.length > 0 ? (
              <ul className="space-y-2">
                {aiBullets.map((b) => (
                  <li key={b} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-accent shrink-0" aria-hidden />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Add a follow-up report to unlock deeper AI trend insights.
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* 8) Next Step Recommendation Engine */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="font-heading text-lg">{nextStep.title}</CardTitle>
          <CardDescription>{nextStep.description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          {nextStep.ctaHref === "/reports" ? (
            <Button type="button" onClick={() => setAddOpen(true)}>
              {nextStep.ctaLabel}
            </Button>
          ) : (
            <Button asChild>
              <Link href={nextStep.ctaHref}>{nextStep.ctaLabel}</Link>
            </Button>
          )}
          {timelineReports.length > 0 ? (
            <Button variant="outline" onClick={() => setCompareOpen(true)} disabled={!latest || !previous} type="button">
              Compare Progress
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {/* 7) Download & Share: Coming soon dialog */}
      <Dialog open={actionOpen} onOpenChange={setActionOpen}>
        <DialogContent className="border-border">
          <DialogHeader>
            <DialogTitle>{actionTitle || "Coming soon"}</DialogTitle>
            <DialogDesc>{actionDescription || "This feature is UI-ready and will be connected soon."}</DialogDesc>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionOpen(false)} type="button">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
