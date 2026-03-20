"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, animate, motion } from "framer-motion";
import { Calendar, Check, Download, Pencil, Share2 } from "lucide-react";
import type { Report } from "@/types";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription as DialogDesc,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  type ReportActionsStateV1,
  type SymptomTag,
  defaultReportActionsState,
  loadReportActionsState,
  saveReportActionsState,
} from "@/lib/reportActionsStorage";
import { buildProgressSignals } from "@/lib/reportInsights";

const SYMPTOM_TAGS: SymptomTag[] = ["Dryness", "Breakouts", "Redness", "Oiliness", "Sensitivity"];

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function addDaysISO(dateStr: string, days: number): string | null {
  const d = new Date(dateStr);
  if (!Number.isFinite(d.getTime())) return null;
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function last7DaysISO(): string[] {
  const out: string[] = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function ChipButton({
  selected,
  children,
  className,
  ...props
}: React.ComponentProps<typeof Button> & { selected?: boolean }) {
  return (
    <Button
      variant="outline"
      size="sm"
      className={cn(
        "h-9 px-4",
        selected ? "border-accent bg-accent/10 text-accent shadow-[0_0_12px_hsl(var(--accent)/0.2)]" : "",
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
}

function statusFromAdherence(percent: number): "Improving" | "Stable" | "Needs Attention" {
  if (percent >= 75) return "Improving";
  if (percent >= 40) return "Stable";
  return "Needs Attention";
}

function badgeVariantForStatus(status: "Improving" | "Stable" | "Needs Attention") {
  if (status === "Improving") return "success" as const;
  if (status === "Needs Attention") return "warning" as const;
  return "secondary" as const;
}

export function ReportActionsSection({
  report,
  previousReport,
}: {
  report: Report;
  previousReport: Report | null;
}) {
  const userId = useAuthStore((s) => s.user?.id) ?? "anon";

  const [state, setState] = useState<ReportActionsStateV1>(() => defaultReportActionsState());
  const [notesEditing, setNotesEditing] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [justSavedNote, setJustSavedNote] = useState(false);

  const [symptomSelection, setSymptomSelection] = useState<SymptomTag[]>([]);

  const [actionOpen, setActionOpen] = useState(false);
  const [actionTitle, setActionTitle] = useState<string>("");
  const [actionDescription, setActionDescription] = useState<string>("");

  const storageKey = `${userId}:${report.id}`;

  useEffect(() => {
    const loaded = loadReportActionsState(userId, report.id);
    setState(loaded);
    setNotesEditing(false);
    setNoteDraft(loaded.personalNote);
    setSymptomSelection([]);
    setJustSavedNote(false);
  }, [storageKey, userId, report.id]);

  const todayKey = todayISO();
  const todayRoutine = state.routineByDate[todayKey] ?? { morning: false, evening: false, skipped: false };

  const weeklyPercent = useMemo(() => {
    const days = last7DaysISO();
    let completed = 0;
    for (const day of days) {
      const entry = state.routineByDate[day];
      if (!entry) continue;
      if (entry.skipped) continue;
      if (entry.morning) completed += 1;
      if (entry.evening) completed += 1;
    }
    return Math.round((completed / 14) * 100);
  }, [state.routineByDate]);

  const [weeklyMeterValue, setWeeklyMeterValue] = useState(0);
  useEffect(() => {
    const controls = animate(weeklyMeterValue, weeklyPercent, {
      duration: 0.6,
      ease: "easeOut",
      onUpdate: (v) => setWeeklyMeterValue(v),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weeklyPercent]);

  const progressStatus = statusFromAdherence(weeklyPercent);
  const progressBadgeVariant = badgeVariantForStatus(progressStatus);

  const recommended = addDaysISO(report.date, 7);
  const recommendedLabel = recommended ? formatDateShort(recommended) : "—";

  const historySignals = useMemo(() => {
    if (!previousReport) return null;
    return buildProgressSignals([report, previousReport]);
  }, [report, previousReport]);

  function persist(next: ReportActionsStateV1) {
    setState(next);
    saveReportActionsState(userId, report.id, next);
  }

  function openComingSoon(kind: "Download PDF" | "Share with Dermatologist") {
    setActionTitle(kind);
    setActionDescription(`“${report.title}” — ${kind} is UI-ready and will be connected once backend export/sharing is enabled.`);
    setActionOpen(true);
  }

  function toggleRoutine(kind: "morning" | "evening" | "skipped") {
    const current = state.routineByDate[todayKey] ?? { morning: false, evening: false, skipped: false };
    const next =
      kind === "skipped"
        ? { morning: false, evening: false, skipped: !current.skipped }
        : {
            ...current,
            skipped: false,
            [kind]: !current[kind],
          };
    persist({
      ...state,
      routineByDate: {
        ...state.routineByDate,
        [todayKey]: next,
      },
    });
  }

  function toggleSymptom(tag: SymptomTag) {
    setSymptomSelection((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function addSymptomEntry() {
    const tags = symptomSelection.slice().sort();
    if (tags.length === 0) return;
    const entry = { id: `sym-${Date.now()}`, at: Date.now(), tags };
    persist({
      ...state,
      symptomTimeline: [entry, ...state.symptomTimeline],
    });
    setSymptomSelection([]);
  }

  function startEditingNotes() {
    setNotesEditing(true);
    setNoteDraft(state.personalNote);
  }

  function cancelEditingNotes() {
    setNotesEditing(false);
    setNoteDraft(state.personalNote);
  }

  function saveNotes() {
    const nextText = noteDraft.trim();
    const next = { ...state, personalNote: nextText };
    persist(next);
    setNotesEditing(false);
    setJustSavedNote(true);
    window.setTimeout(() => setJustSavedNote(false), 1200);
  }

  return (
    <motion.section
      aria-label="Report actions"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
      className="space-y-4"
    >
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-semibold">Report Actions</h2>
          <p className="text-sm text-muted-foreground">
            Personalize your report with safe tracking — notes, adherence, and observations.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 1) Personal notes */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut", delay: 0.05 }}
        >
          <Card className="border-border hover:shadow-[0_0_24px_rgba(229,190,181,0.22)]">
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="font-heading text-lg">My Observations</CardTitle>
                <CardDescription>Keep personal notes about your skin progress.</CardDescription>
              </div>
              {!notesEditing ? (
                <Button variant="ghost" size="icon" type="button" aria-label="Edit note" onClick={startEditingNotes}>
                  <Pencil className="h-4 w-4" aria-hidden />
                </Button>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-3">
              <AnimatePresence mode="wait">
                {notesEditing ? (
                  <motion.div
                    key="notes-edit"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="space-y-3"
                  >
                    <textarea
                      value={noteDraft}
                      onChange={(e) => setNoteDraft(e.target.value)}
                      placeholder="Track how your skin felt after following this routine..."
                      className="min-h-[112px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="button" onClick={saveNotes}>
                        Save Note
                      </Button>
                      <Button variant="outline" type="button" onClick={cancelEditingNotes}>
                        Cancel
                      </Button>
                      <AnimatePresence>
                        {justSavedNote ? (
                          <motion.span
                            key="saved-tick"
                            initial={{ opacity: 0, y: 2 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -2 }}
                            transition={{ duration: 0.22, ease: "easeOut" }}
                            className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground"
                          >
                            <Check className="h-3.5 w-3.5 text-accent" aria-hidden />
                            Saved
                          </motion.span>
                        ) : null}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="notes-view"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="space-y-2"
                  >
                    {state.personalNote ? (
                      <p className="text-sm text-foreground/90 whitespace-pre-wrap">{state.personalNote}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Add observations about how your skin felt while following this routine.
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>

        {/* 2) Routine adherence */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut", delay: 0.08 }}
        >
          <Card className="border-border hover:shadow-[0_0_24px_rgba(229,190,181,0.22)]">
            <CardHeader>
              <CardTitle className="font-heading text-lg">Routine Adherence</CardTitle>
              <CardDescription>Mark today’s routine and track weekly consistency.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-border/60 bg-muted/40 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">Today</p>
                  <span className="text-xs text-muted-foreground">{formatDateShort(todayKey)}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <ChipButton
                    type="button"
                    selected={!!todayRoutine.morning && !todayRoutine.skipped}
                    onClick={() => toggleRoutine("morning")}
                  >
                    Morning Routine Followed
                  </ChipButton>
                  <ChipButton
                    type="button"
                    selected={!!todayRoutine.evening && !todayRoutine.skipped}
                    onClick={() => toggleRoutine("evening")}
                  >
                    Evening Routine Followed
                  </ChipButton>
                  <ChipButton type="button" selected={!!todayRoutine.skipped} onClick={() => toggleRoutine("skipped")}>
                    Skipped
                  </ChipButton>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Weekly Adherence Meter</span>
                  <span className="font-medium">{Math.round(weeklyMeterValue)}%</span>
                </div>
                <Progress value={weeklyMeterValue} className="h-3" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 3) Symptom tracking */}
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut", delay: 0.11 }}
        >
          <Card className="border-border hover:shadow-[0_0_24px_rgba(229,190,181,0.22)]">
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <CardTitle className="font-heading text-lg">New Observations</CardTitle>
                <CardDescription>Tag symptoms or changes you notice (non-clinical).</CardDescription>
              </div>
              <Button type="button" onClick={addSymptomEntry} disabled={symptomSelection.length === 0}>
                Add entry
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {SYMPTOM_TAGS.map((tag) => (
                  <ChipButton
                    key={tag}
                    type="button"
                    selected={symptomSelection.includes(tag)}
                    onClick={() => toggleSymptom(tag)}
                  >
                    {tag}
                  </ChipButton>
                ))}
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/40 px-4 py-3">
                <p className="text-sm font-medium">Timeline</p>
                {state.symptomTimeline.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Add an entry to start tracking changes across time.
                  </p>
                ) : (
                  <div className="relative mt-3 pl-6 space-y-3">
                    <div aria-hidden className="absolute left-2 top-1 bottom-1 w-px bg-border/60" />
                    {state.symptomTimeline.slice(0, 8).map((e) => (
                      <div key={e.id} className="relative">
                        <div aria-hidden className="absolute -left-[19px] top-2 h-2.5 w-2.5 rounded-full border border-border bg-background" />
                        <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-card/70 backdrop-blur-[20px] px-4 py-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs text-muted-foreground">
                              {new Date(e.at).toLocaleString()}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {e.tags.length} tag{e.tags.length === 1 ? "" : "s"}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {e.tags.map((t) => (
                              <Badge key={t} variant="outline">
                                {t}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 4) Follow-up reminder */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut", delay: 0.14 }}
        >
          <Card className="border-border hover:shadow-[0_0_24px_rgba(229,190,181,0.22)]">
            <CardHeader>
              <CardTitle className="font-heading text-lg">Next Follow-up</CardTitle>
              <CardDescription>Recommended reassessment window (UI-only reminder).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/40 px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" aria-hidden />
                  <span>Recommended</span>
                </div>
                <span className="text-sm font-medium">{recommendedLabel}</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={state.reminderEnabled}
                    onCheckedChange={(v) => persist({ ...state, reminderEnabled: v === true })}
                    aria-label="Set reminder"
                  />
                  <span className="text-sm font-medium">Set reminder</span>
                </div>
                {state.reminderEnabled ? (
                  <span className="text-xs text-muted-foreground">Reminder scheduled</span>
                ) : (
                  <span className="text-xs text-muted-foreground">Off</span>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 5) Progress status */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut", delay: 0.17 }}
        >
          <Card className="border-border hover:shadow-[0_0_24px_rgba(229,190,181,0.22)]">
            <CardHeader>
              <CardTitle className="font-heading text-lg">Progress Status</CardTitle>
              <CardDescription>Based on your routine adherence (UI-only simulation).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge
                  variant={progressBadgeVariant}
                  className="shadow-[0_0_14px_rgba(229,190,181,0.20)]"
                >
                  {progressStatus}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                This status is for personal tracking only and does not change clinical recommendations.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* 6) Export options */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut", delay: 0.2 }}
        >
          <Card className="border-border hover:shadow-[0_0_24px_rgba(229,190,181,0.22)]">
            <CardHeader>
              <CardTitle className="font-heading text-lg">Export Options</CardTitle>
              <CardDescription>UI-ready actions (safe, read-only exports).</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  aria-label="Download PDF"
                  onClick={() => openComingSoon("Download PDF")}
                >
                  <Download className="h-4 w-4" aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  aria-label="Share with Dermatologist"
                  onClick={() => openComingSoon("Share with Dermatologist")}
                >
                  <Share2 className="h-4 w-4" aria-hidden />
                </Button>
              </div>
              <span className="text-xs text-muted-foreground">UI only</span>
            </CardContent>
          </Card>
        </motion.div>

        {/* 7) History snapshot */}
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut", delay: 0.23 }}
        >
          <Card className="border-border hover:shadow-[0_0_24px_rgba(229,190,181,0.22)]">
            <CardHeader>
              <CardTitle className="font-heading text-lg">Previous vs Current</CardTitle>
              <CardDescription>Mini snapshot comparing your recent trend signals.</CardDescription>
            </CardHeader>
            <CardContent>
              {!previousReport || !historySignals ? (
                <p className="text-sm text-muted-foreground">
                  Add at least one earlier report to unlock a comparison snapshot.
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-border/60 bg-muted/40 px-4 py-3">
                    <p className="text-xs text-muted-foreground">Then</p>
                    <p className="text-sm font-medium mt-1">{previousReport.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatDateShort(previousReport.date)}</p>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-muted/40 px-4 py-3">
                    <p className="text-xs text-muted-foreground">Now</p>
                    <p className="text-sm font-medium mt-1">{report.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatDateShort(report.date)}</p>
                  </div>

                  <div className="md:col-span-2 rounded-xl border border-border/60 bg-muted/40 px-4 py-3">
                    <p className="text-sm font-medium">Primary concern trend</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Hydration</span>
                        <span className="font-medium">
                          {historySignals.hydration.delta > 0 ? "↑" : historySignals.hydration.delta < 0 ? "↓" : "↔"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Texture</span>
                        <span className="font-medium">
                          {historySignals.texture.delta > 0 ? "↑" : historySignals.texture.delta < 0 ? "↓" : "↔"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Export dialog (UI-only) */}
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
    </motion.section>
  );
}

