"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getReports, updateUserProfile } from "@/services/api";
import type { ProfileMeta, Report } from "@/types";

const skinGoalValues = [
  "REDUCE_ACNE",
  "IMPROVE_TEXTURE",
  "HYDRATION_FOCUS",
  "PIGMENTATION_CONTROL",
] as const;

type SkinGoalValue = (typeof skinGoalValues)[number];

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email required"),
  routineReminderPreference: z.enum(["OFF", "LIGHT", "STRUCTURED"]),
  consultationPreference: z.enum(["AI_ONLY", "AI_PLUS_DERMATOLOGIST"]),
  skinGoalPriority: z.enum(["SHORT_TERM_CLARITY", "LONG_TERM_BARRIER", "BALANCED"]),
  routineStyle: z.enum(["MINIMAL", "BALANCED", "INTENSIVE"]),
  allowAiPersonalization: z.boolean(),
  allowProgressTracking: z.boolean(),
  allowDermatologistSharing: z.boolean(),
  skinGoals: z.array(z.enum(skinGoalValues)).default([]),
});

type FormData = z.infer<typeof schema>;

function buildProfileMetaFromForm(data: FormData): ProfileMeta {
  return {
    routineReminderPreference: data.routineReminderPreference,
    consultationPreference: data.consultationPreference,
    skinGoalPriority: data.skinGoalPriority,
    routineStyle: data.routineStyle,
    skinGoals: data.skinGoals,
    allowAiPersonalization: data.allowAiPersonalization,
    allowProgressTracking: data.allowProgressTracking,
    allowDermatologistSharing: data.allowDermatologistSharing,
  };
}

function formatDate(dateString?: string): string {
  if (!dateString) return "—";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getAssessmentFreshnessLabel(latestReport?: Report | null): { label: string; helper: string } {
  if (!latestReport) {
    return {
      label: "No assessments yet",
      helper: "Complete your first assessment to unlock full personalization.",
    };
  }

  const today = new Date();
  const last = new Date(latestReport.date);
  if (Number.isNaN(last.getTime())) {
    return {
      label: "Unknown",
      helper: "We couldn’t read the last assessment date, but you can safely retake one.",
    };
  }
  const diffDays = Math.round((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 14) {
    return { label: "Fresh", helper: "Your assessment is recent and powering AI guidance." };
  }
  if (diffDays <= 45) {
    return { label: "Due soon", helper: "Consider a follow-up assessment to keep insights aligned." };
  }
  return {
    label: "Stale",
    helper: "Your assessment is older. Retaking it will sharpen your recommendations.",
  };
}

function getRoutineConsistencyLabel(profileMeta?: ProfileMeta): string {
  if (!profileMeta?.routineStyle) return "Emerging";
  if (profileMeta.routineStyle === "INTENSIVE") return "High";
  if (profileMeta.routineStyle === "BALANCED") return "Stable";
  return "Gentle";
}

function computeProfileCompletionPercent(profileMeta?: ProfileMeta): number {
  if (!profileMeta) return 0;
  const keys: (keyof ProfileMeta)[] = [
    "routineReminderPreference",
    "consultationPreference",
    "skinGoalPriority",
    "routineStyle",
    "skinGoals",
    "allowAiPersonalization",
    "allowProgressTracking",
    "allowDermatologistSharing",
  ];

  const filled = keys.filter((key) => {
    const value = profileMeta[key];
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== null;
  }).length;

  return Math.round((filled / keys.length) * 100);
}

export default function ProfilePage() {
  const { user, profileMeta, updateProfile } = useAuthStore((s) => ({
    user: s.user,
    profileMeta: s.profileMeta,
    updateProfile: s.updateProfile,
  }));

  const [reports, setReports] = useState<Report[]>([]);
  const [hasSaved, setHasSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    getReports().then(setReports);
  }, []);

  const latestReport = reports[0] ?? null;
  const firstReport = reports[reports.length - 1] ?? null;
  const totalAssessments = reports.length;

  const assessmentFreshness = getAssessmentFreshnessLabel(latestReport);
  const routineConsistencyLabel = getRoutineConsistencyLabel(profileMeta);

  const initialProfileMeta: ProfileMeta = useMemo(
    () => ({
      routineReminderPreference: profileMeta?.routineReminderPreference ?? "LIGHT",
      consultationPreference: profileMeta?.consultationPreference ?? "AI_PLUS_DERMATOLOGIST",
      skinGoalPriority: profileMeta?.skinGoalPriority ?? "BALANCED",
      routineStyle: profileMeta?.routineStyle ?? "BALANCED",
      skinGoals: profileMeta?.skinGoals ?? [],
      allowAiPersonalization:
        profileMeta?.allowAiPersonalization ?? true,
      allowProgressTracking:
        profileMeta?.allowProgressTracking ?? true,
      allowDermatologistSharing:
        profileMeta?.allowDermatologistSharing ?? false,
    }),
    [profileMeta],
  );

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user?.name ?? "",
      email: user?.email ?? "",
      routineReminderPreference: initialProfileMeta.routineReminderPreference ?? "LIGHT",
      consultationPreference: initialProfileMeta.consultationPreference ?? "AI_PLUS_DERMATOLOGIST",
      skinGoalPriority: initialProfileMeta.skinGoalPriority ?? "BALANCED",
      routineStyle: initialProfileMeta.routineStyle ?? "BALANCED",
      allowAiPersonalization: initialProfileMeta.allowAiPersonalization ?? true,
      allowProgressTracking: initialProfileMeta.allowProgressTracking ?? true,
      allowDermatologistSharing: initialProfileMeta.allowDermatologistSharing ?? false,
      skinGoals: initialProfileMeta.skinGoals ?? [],
    },
  });

  const selectedGoals = form.watch("skinGoals");
  const profileCompletionPercent = computeProfileCompletionPercent({
    ...initialProfileMeta,
    ...buildProfileMetaFromForm(form.getValues()),
  });

  const onSubmit = async (data: FormData) => {
    setSaveError(null);
    try {
      const result = await updateUserProfile({
        full_name: data.name,
        email: data.email,
      });
      updateProfile({
        name: result.full_name ?? data.name,
        email: result.email ?? data.email,
        profileMeta: buildProfileMetaFromForm(data),
      });
      setHasSaved(true);
      setTimeout(() => setHasSaved(false), 2500);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Unable to save profile right now.");
    }
  };

  const toggleGoal = (goal: SkinGoalValue) => {
    const current = form.getValues("skinGoals");
    if (current.includes(goal)) {
      form.setValue(
        "skinGoals",
        current.filter((g) => g !== goal),
        { shouldDirty: true },
      );
    } else {
      form.setValue("skinGoals", [...current, goal], { shouldDirty: true });
    }
  };

  const slideUpFade = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
  };

  const activityItems = [
    { label: "Assessment completed", time: "3 days ago" },
    { label: "Routine updated", time: "5 days ago" },
    { label: "Consultation booked", time: "Last week" },
  ];

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="mx-auto max-w-5xl space-y-8"
    >
      <h1 className="font-heading text-2xl font-semibold">Profile</h1>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1.3fr)]">
        <div className="space-y-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-heading">Account details</CardTitle>
              <CardDescription>
                Update your name and email. Changes are saved to your account and reflected across panels.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" {...form.register("name")} />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...form.register("email")} />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>
              <div className="pt-2 flex items-center gap-3">
                <Button type="submit">Save changes</Button>
                {hasSaved && (
                  <span className="text-xs text-emerald-500">
                    Profile updated.
                  </span>
                )}
              </div>
              {saveError && <p className="text-sm text-destructive">{saveError}</p>}
            </CardContent>
          </Card>

          <motion.div
            initial={slideUpFade.initial}
            animate={slideUpFade.animate}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <Card className="border-border/70 bg-card/90 backdrop-blur">
              <CardHeader>
                <CardTitle className="font-heading text-lg">
                  Skin Identity Snapshot
                </CardTitle>
                <CardDescription>
                  A quick view of how AuraSkin currently understands your skin.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {latestReport ? (
                  <>
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground">
                        Skin type
                      </p>
                      <p className="rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-sm">
                        {latestReport.skinType ?? "To be refined"}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground">
                        Primary concern
                      </p>
                      <p className="rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-sm">
                        {latestReport.concerns?.[0] ?? "Set after your next assessment"}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground">
                        Sensitivity level
                      </p>
                      <p className="rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-sm">
                        {latestReport.sensitivityLevel ?? "To be refined"}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground">
                        Routine stage
                      </p>
                      <p className="rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-sm">
                        {routineConsistencyLabel}
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Complete an assessment to see your personalized skin identity snapshot here.
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={slideUpFade.initial}
            animate={slideUpFade.animate}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.05 }}
          >
            <Card className="border-border/70 bg-card/90 backdrop-blur">
              <CardHeader>
                <CardTitle className="font-heading text-lg">
                  Skin Journey
                </CardTitle>
                <CardDescription>
                  How long AuraSkin has been learning from your skin story.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      First assessment
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {formatDate(firstReport?.date)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Total assessments
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {totalAssessments || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Routine adherence level
                    </p>
                    <p className="mt-1 inline-flex items-center rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-xs font-medium">
                      {totalAssessments >= 3
                        ? "Building strong habits"
                        : totalAssessments === 2
                        ? "Finding your rhythm"
                        : totalAssessments === 1
                        ? "Just getting started"
                        : "Awaiting first data"}
                    </p>
                  </div>
                </div>
                <div className="mt-1">
                  <div className="relative flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-muted">
                      <div className="h-1.5 rounded-full bg-accent/70 shadow-[0_0_14px_hsl(var(--accent)/0.45)] w-2/3" />
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    This mini timeline reflects your journey so far. As more assessments are added, this view becomes richer.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={slideUpFade.initial}
            animate={slideUpFade.animate}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
          >
            <Card className="border-border/70 bg-card/90 backdrop-blur">
              <CardHeader>
                <CardTitle className="font-heading text-lg">
                  Skin Goals
                </CardTitle>
                <CardDescription>
                  Tell the AI what outcomes matter most. This shapes guidance but never overrides clinical logic.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {skinGoalValues.map((goal) => {
                    const isActive = selectedGoals?.includes(goal);
                    const label =
                      goal === "REDUCE_ACNE"
                        ? "Reduce acne"
                        : goal === "IMPROVE_TEXTURE"
                        ? "Improve texture"
                        : goal === "HYDRATION_FOCUS"
                        ? "Hydration focus"
                        : "Pigmentation control";
                    return (
                      <button
                        key={goal}
                        type="button"
                        onClick={() => toggleGoal(goal)}
                        aria-pressed={isActive}
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                          isActive
                            ? "border-accent bg-accent/15 text-accent shadow-[0_0_14px_hsl(var(--accent)/0.35)]"
                            : "border-border/70 bg-card text-muted-foreground hover:border-accent/60 hover:bg-accent/5"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Your goals guide how AuraSkin prioritizes suggestions and explanations. Medical recommendations remain governed by clinical logic.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="space-y-6">
          <motion.div
            initial={slideUpFade.initial}
            animate={slideUpFade.animate}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <Card className="border-border/70 bg-card/90 backdrop-blur">
              <CardHeader>
                <CardTitle className="font-heading text-lg">
                  Personal Preferences
                </CardTitle>
                <CardDescription>
                  Tune how AuraSkin nudges and supports you. These settings don&apos;t change medical advice.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Routine reminder preference
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {["OFF", "LIGHT", "STRUCTURED"].map((value) => {
                      const isActive =
                        form.watch("routineReminderPreference") === value;
                      const label =
                        value === "OFF"
                          ? "Off"
                          : value === "LIGHT"
                          ? "Light"
                          : "Structured";
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() =>
                            form.setValue("routineReminderPreference", value as FormData["routineReminderPreference"], {
                              shouldDirty: true,
                            })
                          }
                          aria-pressed={isActive}
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                            isActive
                              ? "border-accent bg-accent/15 text-accent shadow-[0_0_14px_hsl(var(--accent)/0.35)]"
                              : "border-border/70 bg-card text-muted-foreground hover:border-accent/60 hover:bg-accent/5"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Consultation preference
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: "AI_ONLY", label: "AI only" },
                      { value: "AI_PLUS_DERMATOLOGIST", label: "AI + Dermatologist" },
                    ].map((option) => {
                      const isActive =
                        form.watch("consultationPreference") === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() =>
                            form.setValue("consultationPreference", option.value as FormData["consultationPreference"], {
                              shouldDirty: true,
                            })
                          }
                          aria-pressed={isActive}
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                            isActive
                              ? "border-accent bg-accent/15 text-accent shadow-[0_0_14px_hsl(var(--accent)/0.35)]"
                              : "border-border/70 bg-card text-muted-foreground hover:border-accent/60 hover:bg-accent/5"
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Skin goal priority
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: "SHORT_TERM_CLARITY", label: "Short-term clarity" },
                      { value: "BALANCED", label: "Balanced" },
                      { value: "LONG_TERM_BARRIER", label: "Long-term barrier" },
                    ].map((option) => {
                      const isActive =
                        form.watch("skinGoalPriority") === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() =>
                            form.setValue("skinGoalPriority", option.value as FormData["skinGoalPriority"], {
                              shouldDirty: true,
                            })
                          }
                          aria-pressed={isActive}
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                            isActive
                              ? "border-accent bg-accent/15 text-accent shadow-[0_0_14px_hsl(var(--accent)/0.35)]"
                              : "border-border/70 bg-card text-muted-foreground hover:border-accent/60 hover:bg-accent/5"
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={slideUpFade.initial}
            animate={slideUpFade.animate}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.04 }}
          >
            <Card className="border-border/70 bg-card/90 backdrop-blur">
              <CardHeader>
                <CardTitle className="font-heading text-lg">
                  Privacy Controls
                </CardTitle>
                <CardDescription>
                  Decide how your data supports personalization. These controls never let you override clinical recommendations.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {[
                  {
                    key: "allowAiPersonalization" as const,
                    label: "Allow AI personalization",
                    helper:
                      "Let AuraSkin learn from your usage to refine explanations and examples.",
                  },
                  {
                    key: "allowProgressTracking" as const,
                    label: "Allow progress tracking",
                    helper:
                      "Use your history to visualize change over time in the dashboard.",
                  },
                  {
                    key: "allowDermatologistSharing" as const,
                    label: "Allow dermatologist sharing",
                    helper:
                      "Share key insights with a dermatologist during connected consultations.",
                  },
                ].map((item) => {
                  const checked = form.watch(item.key);
                  return (
                    <div
                      key={item.key}
                      className="flex items-start justify-between gap-3"
                    >
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">
                          {item.label}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground/80">
                          {item.helper}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          form.setValue(item.key, !checked, {
                            shouldDirty: true,
                          })
                        }
                        aria-pressed={checked}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full border px-0.5 transition-colors ${
                          checked
                            ? "border-accent bg-accent/30 shadow-[0_0_14px_hsl(var(--accent)/0.35)]"
                            : "border-border/70 bg-muted/40"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 rounded-full bg-background shadow-sm transition-transform ${
                            checked ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={slideUpFade.initial}
            animate={slideUpFade.animate}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.08 }}
          >
            <Card className="border-border/70 bg-card/90 backdrop-blur">
              <CardHeader>
                <CardTitle className="font-heading text-lg">
                  Routine Style
                </CardTitle>
                <CardDescription>
                  Choose how intensive you like your routine. The AI respects this while keeping clinical safety first.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "MINIMAL", label: "Minimal" },
                    { value: "BALANCED", label: "Balanced" },
                    { value: "INTENSIVE", label: "Intensive" },
                  ].map((option) => {
                    const isActive = form.watch("routineStyle") === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          form.setValue("routineStyle", option.value as FormData["routineStyle"], {
                            shouldDirty: true,
                          })
                        }
                        aria-pressed={isActive}
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                          isActive
                            ? "border-accent bg-accent/15 text-accent shadow-[0_0_14px_hsl(var(--accent)/0.35)]"
                            : "border-border/70 bg-card text-muted-foreground hover:border-accent/60 hover:bg-accent/5"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  This setting guides how many steps and layers AuraSkin suggests, without changing ingredient safety or medical logic.
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={slideUpFade.initial}
            animate={slideUpFade.animate}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.12 }}
          >
            <Card className="border-border/70 bg-card/90 backdrop-blur">
              <CardHeader>
                <CardTitle className="font-heading text-lg">
                  Consultation Summary
                </CardTitle>
                <CardDescription>
                  Snapshot of how often you connect with experts. Demo data only in this phase.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Total consultations
                  </p>
                  <p className="mt-1 text-2xl font-heading">2</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Example count to showcase how this hub will summarize your care touchpoints.
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Last dermatologist consulted
                  </p>
                  <p className="mt-1 text-sm font-medium">Dr. Jane Lee</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    In production, this will reflect your most recent linked dermatologist visit.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={slideUpFade.initial}
            animate={slideUpFade.animate}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.16 }}
          >
            <Card className="border-border/70 bg-card/90 backdrop-blur">
              <CardHeader>
                <CardTitle className="font-heading text-lg">
                  Account Status
                </CardTitle>
                <CardDescription>
                  Health of your AuraSkin profile, from data freshness to setup completeness.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Assessment freshness
                    </span>
                    <span className="inline-flex items-center rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[11px] font-medium">
                      {assessmentFreshness.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {assessmentFreshness.helper}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Routine consistency
                    </span>
                    <span className="inline-flex items-center rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[11px] font-medium">
                      {routineConsistencyLabel}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This is inferred from your preferred routine style and will become more precise with real adherence data.
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Profile completion
                    </span>
                    <span className="text-xs font-medium">
                      {profileCompletionPercent}% complete
                    </span>
                  </div>
                  <Progress value={profileCompletionPercent} />
                  <p className="text-xs text-muted-foreground">
                    Completing your preferences, goals, and privacy choices helps AuraSkin reflect your identity more precisely.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={slideUpFade.initial}
            animate={slideUpFade.animate}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
          >
            <Card className="border-border/70 bg-card/90 backdrop-blur">
              <CardHeader>
                <CardTitle className="font-heading text-lg">
                  Recent Activity
                </CardTitle>
                <CardDescription>
                  A lightweight log of key actions linked to your skin journey. Demo entries for now.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="space-y-2">
                  {activityItems.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/40 px-3 py-2"
                    >
                      <span className="text-foreground/90 text-xs font-medium">
                        {item.label}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {item.time}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  In a future release, this log will reflect your real assessments, routine updates, and consultations.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </form>
  );
}
