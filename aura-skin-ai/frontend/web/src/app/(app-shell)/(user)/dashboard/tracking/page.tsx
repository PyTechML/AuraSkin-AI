"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const STREAK_CIRCLE_SIZE = 72;
const STREAK_STROKE = 6;
const STREAK_R = (STREAK_CIRCLE_SIZE - STREAK_STROKE) / 2;
const STREAK_CIRCUMFERENCE = 2 * Math.PI * STREAK_R;
const STREAK_TARGET_DAYS = 21;

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

type RoutineStatus = "pending" | "completed" | "skipped";

type DayRoutine = {
  day: (typeof DAYS_OF_WEEK)[number];
  morning: RoutineStatus;
  evening: RoutineStatus;
};

type Mood = "better" | "same" | "worse";

type FeedbackEntry = {
  id: number;
  dateLabel: string;
  mood: Mood;
};

const INITIAL_ROUTINE_LOG: DayRoutine[] = DAYS_OF_WEEK.map((day, index) => ({
  day,
  morning: index === 1 || index === 2 ? "completed" : "pending",
  evening: index === 2 ? "completed" : "pending",
}));

const INITIAL_FEEDBACK_ENTRIES: FeedbackEntry[] = [
  { id: 1, dateLabel: "Yesterday", mood: "same" },
  { id: 2, dateLabel: "2 days ago", mood: "worse" },
];

function buildWeeklyTrendPath(values: number[]): string {
  if (!values.length) return "";
  const maxX = 100;
  const maxY = 40;

  return values
    .map((v, i) => {
      const x = (i / (values.length - 1 || 1)) * maxX;
      const y = maxY - (v / 100) * (maxY - 10) - 2;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

function getRoutineConfidence(adherencePercent: number) {
  if (adherencePercent > 75) {
    return { label: "High", helper: "Solid, keep going." };
  }
  if (adherencePercent >= 40) {
    return { label: "Moderate", helper: "Consistency building week by week." };
  }
  return { label: "Low", helper: "Small daily wins will move this up." };
}

export default function TrackingPage() {
  const [routineLog, setRoutineLog] = useState<DayRoutine[]>(() => INITIAL_ROUTINE_LOG);
  const [morningReminderEnabled, setMorningReminderEnabled] = useState(false);
  const [nightReminderEnabled, setNightReminderEnabled] = useState(false);
  const [feedbackEntries, setFeedbackEntries] = useState<FeedbackEntry[]>(() => INITIAL_FEEDBACK_ENTRIES);
  const [todayMood, setTodayMood] = useState<Mood | null>(null);
  const [hoveredTrendIndex, setHoveredTrendIndex] = useState<number | null>(null);
  const [streakDays] = useState(5);

  const totalSessions = routineLog.length * 2;
  const completedSessions = routineLog.reduce(
    (acc, day) => acc + (day.morning === "completed" ? 1 : 0) + (day.evening === "completed" ? 1 : 0),
    0,
  );
  const adherencePercent = totalSessions ? Math.round((completedSessions / totalSessions) * 100) : 0;
  const dailyCompletion = routineLog.map((day) => {
    const completedCount = (day.morning === "completed" ? 1 : 0) + (day.evening === "completed" ? 1 : 0);
    return Math.round((completedCount / 2) * 100);
  });

  const streakProgress = Math.min(streakDays / STREAK_TARGET_DAYS, 1);
  const streakRingOffset = STREAK_CIRCUMFERENCE * (1 - streakProgress);

  const { label: confidenceLabel, helper: confidenceHelper } = getRoutineConfidence(adherencePercent);

  let skinResponseCopy = "Consistent care helps your skin respond over time.";
  let skinResponseRoutineBadge = `${adherencePercent}% routine adherence`;
  let skinResponseSymptomBadge = "Steady response";

  if (adherencePercent >= 80) {
    skinResponseCopy = "Routine followed ~80% \u2192 Dryness reduced.";
    skinResponseSymptomBadge = "Dryness \u2198";
  } else if (adherencePercent >= 60) {
    skinResponseCopy = "Good adherence \u2192 gradual improvement expected.";
    skinResponseSymptomBadge = "Texture smoothing";
  } else if (adherencePercent > 0) {
    skinResponseCopy = "Inconsistent adherence \u2192 results may be slower.";
    skinResponseSymptomBadge = "Symptoms unchanged";
  } else {
    skinResponseCopy = "Start logging your routine to see how your skin responds.";
    skinResponseSymptomBadge = "No pattern yet";
  }

  const hasThreeDayBadge = streakDays >= 3;
  const hasSevenDayBadge = streakDays >= 7;
  const hasRestartedBadge = streakDays > 0 && streakDays < 3;

  const handleToggleRoutine = (dayIndex: number, part: "morning" | "evening") => {
    setRoutineLog((prev) =>
      prev.map((day, index) => {
        if (index !== dayIndex) return day;
        const current = day[part];
        const next: RoutineStatus = current === "completed" ? "skipped" : "completed";
        return { ...day, [part]: next };
      }),
    );
  };

  const handleFeedbackClick = (mood: Mood) => {
    setTodayMood(mood);
    setFeedbackEntries((prev) => {
      const nextEntry: FeedbackEntry = {
        id: Date.now(),
        dateLabel: "Today",
        mood,
      };
      const withoutToday = prev.filter((entry) => entry.dateLabel !== "Today");
      return [nextEntry, ...withoutToday].slice(0, 5);
    });
  };

  const reassessmentDays: number = 7;

  return (
    <div className="space-y-8">
      <h1 className="font-heading text-2xl font-semibold">Routine tracking</h1>
      <p className="text-muted-foreground">
        Track your adherence to the recommended routine and see progress over time.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-heading">This week</CardTitle>
            <CardDescription>Morning and evening routine completion.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Completion</span>
                <span>{adherencePercent}%</span>
              </div>
              <Progress value={adherencePercent} />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-heading">Next assessment</CardTitle>
            <CardDescription>Recommended in 7 days for the best tracking.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Re-run the assessment to update your report and recommendations.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Routine Intelligence Hub */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        aria-label="Routine intelligence hub"
        className="space-y-6"
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)]">
          <Card className="border-border/70 bg-card/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="font-heading">Daily Routine Log</CardTitle>
              <CardDescription>Mini calendar for your morning and evening routine.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-xs text-muted-foreground px-1">
                {DAYS_OF_WEEK.map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {routineLog.map((day, dayIndex) => (
                  <div key={day.day} className="flex flex-col items-stretch gap-1">
                    <motion.button
                      type="button"
                      onClick={() => handleToggleRoutine(dayIndex, "morning")}
                      className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                        day.morning === "completed"
                          ? "border-accent bg-accent/20 text-accent shadow-[0_0_12px_hsl(var(--accent)/0.25)]"
                          : day.morning === "skipped"
                          ? "border-border/70 bg-muted/40 text-muted-foreground"
                          : "border-border/60 bg-card/80 text-muted-foreground"
                      }`}
                      whileTap={{ opacity: 0.9 }}
                    >
                      Morning
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={() => handleToggleRoutine(dayIndex, "evening")}
                      className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                        day.evening === "completed"
                          ? "border-accent bg-accent/20 text-accent shadow-[0_0_12px_hsl(var(--accent)/0.25)]"
                          : day.evening === "skipped"
                          ? "border-border/70 bg-muted/40 text-muted-foreground"
                          : "border-border/60 bg-card/80 text-muted-foreground"
                      }`}
                      whileTap={{ opacity: 0.9 }}
                    >
                      Evening
                    </motion.button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Tap a pill to mark it as <span className="font-medium text-accent">Completed</span> or{" "}
                <span className="font-medium">Skipped</span>. Soft glow shows your completed sessions.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="font-heading text-base">How did your skin feel today?</CardTitle>
              <CardDescription>Log how your skin feels alongside your routine.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "better" as Mood, label: "Better" },
                  { key: "same" as Mood, label: "Same" },
                  { key: "worse" as Mood, label: "Worse" },
                ].map((option) => {
                  const isActive = todayMood === option.key;
                  return (
                    <motion.button
                      key={option.key}
                      type="button"
                      onClick={() => handleFeedbackClick(option.key)}
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        isActive
                          ? "border-accent bg-accent/15 text-accent shadow-[0_0_12px_hsl(var(--accent)/0.25)]"
                          : "border-border/60 bg-card text-muted-foreground"
                      }`}
                      whileTap={{ opacity: 0.9 }}
                    >
                      {option.label}
                    </motion.button>
                  );
                })}
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Recent feelings</p>
                <AnimatePresence initial={false}>
                  {feedbackEntries.map((entry) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 px-2.5 py-1.5 text-xs"
                    >
                      <span className="text-muted-foreground">{entry.dateLabel}</span>
                      <span
                        className={`font-medium ${
                          entry.mood === "better"
                            ? "text-emerald-500"
                            : entry.mood === "worse"
                            ? "text-rose-500"
                            : "text-muted-foreground"
                        }`}
                      >
                        {entry.mood === "better"
                          ? "Better"
                          : entry.mood === "worse"
                          ? "Worse"
                          : "Same"}
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <Card className="border-border/70 bg-card/80 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-base">Consistency Streak</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <svg
                  width={STREAK_CIRCLE_SIZE}
                  height={STREAK_CIRCLE_SIZE}
                  className="rotate-[-90deg]"
                  aria-hidden
                >
                  <circle
                    cx={STREAK_CIRCLE_SIZE / 2}
                    cy={STREAK_CIRCLE_SIZE / 2}
                    r={STREAK_R}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={STREAK_STROKE}
                    className="text-muted/30"
                  />
                  <motion.circle
                    cx={STREAK_CIRCLE_SIZE / 2}
                    cy={STREAK_CIRCLE_SIZE / 2}
                    r={STREAK_R}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={STREAK_STROKE}
                    strokeLinecap="round"
                    className="text-accent"
                    strokeDasharray={STREAK_CIRCUMFERENCE}
                    initial={{ strokeDashoffset: STREAK_CIRCUMFERENCE }}
                    animate={{ strokeDashoffset: streakRingOffset }}
                    transition={{ duration: 0.75, ease: "easeOut" }}
                  />
                </svg>
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">
                  {streakDays} Day{streakDays === 1 ? "" : "s"} Streak
                </p>
                <p className="text-xs text-muted-foreground">
                  You&apos;re building a habit with every completed routine.
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <AnimatePresence initial={false}>
                    {hasThreeDayBadge && (
                      <motion.span
                        key="badge-3-day"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className="inline-flex items-center rounded-full border border-border/70 bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground"
                      >
                        3 Days Consistent
                      </motion.span>
                    )}
                    {hasSevenDayBadge && (
                      <motion.span
                        key="badge-7-day"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className="inline-flex items-center rounded-full border border-border/70 bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground"
                      >
                        7 Days Completed
                      </motion.span>
                    )}
                    {hasRestartedBadge && (
                      <motion.span
                        key="badge-restarted"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className="inline-flex items-center rounded-full border border-border/70 bg-muted/50 px-2 py-0.5 text-[11px] text-muted-foreground"
                      >
                        Routine Restarted
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/80 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-base">Adherence Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                Most missed step:{" "}
                <span className="font-medium">
                  {routineLog.filter((d) => d.evening !== "completed").length >
                  routineLog.filter((d) => d.morning !== "completed").length
                    ? "Night routine"
                    : "Morning routine"}
                </span>
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
              >
                Strongest consistency mid-week around{" "}
                <span className="font-medium">
                  {DAYS_OF_WEEK[3]}–{DAYS_OF_WEEK[5]}
                </span>
                .
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                {adherencePercent >= 60
                  ? "You’re trending more consistent than last week."
                  : "There’s room to gently increase consistency this week."}
              </motion.p>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/80 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-base">Weekly Trend</CardTitle>
              <CardDescription>Completion across this week.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative h-28">
                <svg
                  viewBox="0 0 100 40"
                  className="h-full w-full text-accent/80"
                  onMouseLeave={() => setHoveredTrendIndex(null)}
                >
                  <defs>
                    <linearGradient id="weeklyTrendFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d={buildWeeklyTrendPath(dailyCompletion)}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                  <path
                    d={`${buildWeeklyTrendPath(dailyCompletion)} L 100 40 L 0 40 Z`}
                    fill="url(#weeklyTrendFill)"
                    stroke="none"
                  />
                  {dailyCompletion.map((value, index) => {
                    const x = (index / (dailyCompletion.length - 1 || 1)) * 100;
                    const y = 40 - (value / 100) * 30 - 5;
                    return (
                      <circle
                        key={index}
                        cx={x}
                        cy={y}
                        r={1.5}
                        fill="currentColor"
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredTrendIndex(index)}
                      />
                    );
                  })}
                </svg>
                <AnimatePresence>
                  {hoveredTrendIndex !== null && (
                    <motion.div
                      key={hoveredTrendIndex}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="absolute -top-2 rounded-full border border-border bg-card/95 px-2.5 py-1 text-[11px] text-muted-foreground shadow-sm"
                      style={{
                        left: `${(hoveredTrendIndex / (dailyCompletion.length - 1 || 1)) * 100}%`,
                        transform: "translateX(-50%)",
                      }}
                    >
                      <span className="font-medium">{DAYS_OF_WEEK[hoveredTrendIndex]}</span>{" "}
                      · {dailyCompletion[hoveredTrendIndex]}% routines
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/80 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-base">Routine Confidence</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Confidence level</span>
                <span className="inline-flex items-center rounded-full border border-border/70 bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-foreground">
                  {confidenceLabel}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted/40">
                <motion.div
                  initial={{ width: 0, opacity: 0.6 }}
                  animate={{ width: `${adherencePercent}%`, opacity: 1 }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                  className="h-full bg-accent/70 shadow-[0_0_16px_hsl(var(--accent)/0.35)]"
                />
              </div>
              <p className="text-xs text-muted-foreground">{confidenceHelper}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="border-border/70 bg-card/80 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-base">Skin Response</CardTitle>
              <CardDescription>How your skin is tracking with adherence.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">{skinResponseCopy}</p>
              <div className="flex flex-wrap gap-1.5">
                <span className="inline-flex items-center rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground">
                  {skinResponseRoutineBadge}
                </span>
                <span className="inline-flex items-center rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground">
                  {skinResponseSymptomBadge}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/80 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-base">Routine Reminder</CardTitle>
              <CardDescription>Prep your ideal reminder pattern (UI only).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Morning reminder</span>
                <button
                  type="button"
                  onClick={() => setMorningReminderEnabled((prev) => !prev)}
                  aria-pressed={morningReminderEnabled}
                  aria-label="Toggle morning reminder"
                  className={`relative inline-flex h-6 w-11 items-center rounded-full border px-0.5 transition-colors ${
                    morningReminderEnabled
                      ? "border-accent bg-accent/30"
                      : "border-border/70 bg-muted/40"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-background shadow-sm transition-transform ${
                      morningReminderEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Night reminder</span>
                <button
                  type="button"
                  onClick={() => setNightReminderEnabled((prev) => !prev)}
                  aria-pressed={nightReminderEnabled}
                  aria-label="Toggle night reminder"
                  className={`relative inline-flex h-6 w-11 items-center rounded-full border px-0.5 transition-colors ${
                    nightReminderEnabled
                      ? "border-accent bg-accent/30"
                      : "border-border/70 bg-muted/40"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-background shadow-sm transition-transform ${
                      nightReminderEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                These settings help shape your future nudges without changing your clinical routine.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/80 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-base">Reassessment Readiness</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                Ready in{" "}
                <span className="font-medium">
                  {reassessmentDays} day
                  {reassessmentDays === 1 ? "" : "s"}
                </span>{" "}
                based on your current routine logging.
              </p>
              {adherencePercent < 40 ? (
                <p className="text-xs text-amber-500">
                  Adherence has dipped this week. Consider reassessment if your skin isn&apos;t improving.
                </p>
              ) : (
                <p className="text-xs text-emerald-500">
                  Your consistency is supporting a clear read when it&apos;s time to reassess.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.section>
    </div>
  );
}
