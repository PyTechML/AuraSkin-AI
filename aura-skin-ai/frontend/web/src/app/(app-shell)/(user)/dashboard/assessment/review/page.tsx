"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAssessmentStore } from "@/store/assessmentStore";
import { useAuthStore } from "@/store/authStore";
import type { AssessmentStepData } from "@/types";
import {
  createAssessment,
  uploadAssessmentImages,
  submitAssessment,
  submitQuestionnaireAssessment,
  getAssessmentProgress,
  getAssessmentStatus,
  getReportByAssessmentId,
  type CreateAssessmentPayload,
} from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 180; // ~6 min
const ANALYSIS_UNAVAILABLE_BACKEND_MESSAGE =
  "Image-based analysis service is temporarily unavailable. Please try questionnaire-only submission or retry later.";

function mapSubmitErrorMessage(rawMessage: string): string {
  const message = rawMessage.trim();
  const lower = message.toLowerCase();

  if (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("network request failed") ||
    lower.includes("load failed") ||
    lower.includes("cors")
  ) {
    return "Network issue while submitting your assessment. Check your connection and try again.";
  }

  if (lower.includes(ANALYSIS_UNAVAILABLE_BACKEND_MESSAGE.toLowerCase())) {
    return ANALYSIS_UNAVAILABLE_BACKEND_MESSAGE;
  }

  if (
    lower.includes("questionnaire-only submission is disabled") ||
    lower.includes("assessment option is not available")
  ) {
    return "Questionnaire-only submission is currently disabled. Please use live capture or try again after support enables it.";
  }

  return message || "Unable to submit assessment right now. Please try again.";
}

function buildCreateAssessmentPayload(data: AssessmentStepData): CreateAssessmentPayload {
  const skinType = data.skinTypeTone?.skinType;
  const parts: string[] = [];
  if (data.personalDetails) {
    parts.push(`Age: ${data.personalDetails.age}`);
    if (data.personalDetails.gender?.trim()) {
      parts.push(`Gender: ${data.personalDetails.gender.trim()}`);
    }
  }
  if (data.skinTypeTone?.skinTone) {
    parts.push(`Skin tone: ${data.skinTypeTone.skinTone}`);
  }
  if (Array.isArray(data.skinConcerns) && data.skinConcerns.length > 0) {
    parts.push(`Concerns: ${data.skinConcerns.join(", ")}`);
  }
  if (data.lifestyle) {
    parts.push(`Sun: ${data.lifestyle.sunExposure ?? "—"}`);
    if (data.lifestyle.sleepHours != null && Number.isFinite(Number(data.lifestyle.sleepHours))) {
      parts.push(`Sleep: ${data.lifestyle.sleepHours}h/night`);
    }
    if (data.lifestyle.diet?.trim()) parts.push(`Diet: ${data.lifestyle.diet.trim()}`);
    if (data.lifestyle.stressLevel?.trim()) parts.push(`Stress: ${data.lifestyle.stressLevel.trim()}`);
  }
  if (data.medicalBackground) {
    const mb = data.medicalBackground;
    if (Array.isArray(mb.conditions) && mb.conditions.length > 0) {
      parts.push(`Conditions: ${mb.conditions.join(", ")}`);
    }
    if (Array.isArray(mb.medications) && mb.medications.length > 0) {
      parts.push(`Medications: ${mb.medications.join(", ")}`);
    }
    if (mb.allergies?.trim()) parts.push(`Allergies: ${mb.allergies.trim()}`);
  }
  const lifestyleFactors = parts.length > 0 ? parts.join(" | ").slice(0, 1950) : undefined;
  const sensitivityLevel = skinType === "Sensitive" ? "high" : undefined;
  return {
    skinType,
    primaryConcern: Array.isArray(data.skinConcerns) ? data.skinConcerns[0] : undefined,
    secondaryConcern: Array.isArray(data.skinConcerns) ? data.skinConcerns[1] : undefined,
    sensitivityLevel,
    lifestyleFactors,
  };
}

export default function AssessmentReviewPage() {
  const router = useRouter();
  const { data, submissionMode } = useAssessmentStore();
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [stage, setStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentAssessmentId, setCurrentAssessmentId] = useState<string | null>(null);
  const attemptsRef = useRef(0);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    attemptsRef.current = 0;
  };

  const navigateToReport = (reportId: string) => {
    stopPolling();
    router.push(`/reports/${reportId}`);
  };

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  const handleSubmit = async () => {
    const files = Array.isArray(data.imageUpload?.files) ? data.imageUpload!.files! : [];
    const isQuestionnaire =
      submissionMode === "questionnaire" || Boolean(data.imageUpload?.skipped);

    if (!isQuestionnaire && files.length < 5) {
      setError("Please go back and complete the live face capture (all 5 angles).");
      return;
    }

    setError(null);
    setSubmitting(true);
    setProgress(0);
    setStage("Creating assessment…");

    try {
      const createPayload = buildCreateAssessmentPayload(data);
      const { assessment_id } = await createAssessment(createPayload);
      setCurrentAssessmentId(assessment_id);

      if (isQuestionnaire) {
        setStage("Generating your report…");
        setProgress(50);
        const submitResult = await submitQuestionnaireAssessment({ assessmentId: assessment_id });
        if (submitResult.report_id) {
          navigateToReport(submitResult.report_id);
          return;
        }
        setError("Report could not be created. Please try again.");
        return;
      }

      setStage("Uploading images…");

      await uploadAssessmentImages(assessment_id, files);
      setStage("Submitting for analysis…");

      const submitResult = await submitAssessment({ assessmentId: assessment_id });
      setStage("Analyzing your skin…");
      setProgress(5);

      if (submitResult.report_id) {
        navigateToReport(submitResult.report_id);
        return;
      }

      attemptsRef.current = 0;

      const pollOnce = async () => {
        if (!assessment_id) return;
        if (attemptsRef.current >= MAX_POLL_ATTEMPTS) {
          stopPolling();
          setError(
            "Analysis is taking longer than expected. Please check your reports in a few minutes."
          );
          setSubmitting(false);
          return;
        }

        attemptsRef.current += 1;
        const result = await getAssessmentStatus(assessment_id).catch(() =>
          getAssessmentProgress(assessment_id)
        );
        setProgress(result.progress ?? 0);
        setStage(result.stage ?? "processing");

        if (result.error) {
          stopPolling();
          setError(result.error);
          setSubmitting(false);
          return;
        }

        if (result.progress === 100) {
          if (result.report_id) {
            navigateToReport(result.report_id);
            return;
          }

          try {
            const byAssessment = await getReportByAssessmentId(assessment_id);
            const fallbackReportId = byAssessment?.report?.id;
            if (fallbackReportId) {
              navigateToReport(fallbackReportId);
              return;
            }
          } catch {
            // ignore and let polling continue up to max attempts
          }
        }
      };

      await pollOnce();
      pollTimerRef.current = setInterval(() => {
        void pollOnce();
      }, POLL_INTERVAL_MS);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Something went wrong. Please try again.";
      if (message === "Session expired. Please login again.") {
        setError(message);
        useAuthStore.getState().logout();
        router.replace(`/login?redirect=${encodeURIComponent("/dashboard/assessment/review")}`);
      } else {
        setError(mapSubmitErrorMessage(message));
      }
    } finally {
      if (!pollTimerRef.current) {
        setSubmitting(false);
        setProgress(null);
        setStage(null);
      }
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="font-heading text-2xl font-semibold">Review your assessment</h1>
      <p className="text-muted-foreground text-sm">
        Confirm your answers below. Submit to generate your report.
      </p>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="font-heading">Summary</CardTitle>
          <CardDescription>Your assessment responses.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-label text-sm text-muted-foreground">Personal details</h3>
            <p className="text-sm">
              {data.personalDetails ? (
                <>
                  {data.personalDetails.fullName ?? "—"},{" "}
                  {Number.isFinite(Number(data.personalDetails.age))
                    ? data.personalDetails.age
                    : "—"}
                  {data.personalDetails.gender?.trim()
                    ? ` · ${data.personalDetails.gender.trim()}`
                    : ""}
                </>
              ) : (
                "—"
              )}
            </p>
          </div>
          <div>
            <h3 className="font-label text-sm text-muted-foreground">Skin type & tone</h3>
            <p className="text-sm">
              {data.skinTypeTone
                ? `${data.skinTypeTone.skinType ?? "—"}, ${data.skinTypeTone.skinTone ?? "—"}`
                : "—"}
            </p>
          </div>
          <div>
            <h3 className="font-label text-sm text-muted-foreground">Concerns</h3>
            <p className="text-sm">
              {Array.isArray(data.skinConcerns) && data.skinConcerns.length > 0
                ? data.skinConcerns.join(", ")
                : "—"}
            </p>
          </div>
          <div>
            <h3 className="font-label text-sm text-muted-foreground">Lifestyle</h3>
            <p className="text-sm">
              {data.lifestyle
                ? [
                    `Sun exposure: ${data.lifestyle.sunExposure ?? "—"}`,
                    data.lifestyle.sleepHours != null && Number.isFinite(Number(data.lifestyle.sleepHours))
                      ? `Sleep: ${data.lifestyle.sleepHours}h`
                      : null,
                    data.lifestyle.diet?.trim() ? `Diet: ${data.lifestyle.diet.trim()}` : null,
                    data.lifestyle.stressLevel?.trim() ? `Stress: ${data.lifestyle.stressLevel.trim()}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"
                : "—"}
            </p>
          </div>
          <div>
            <h3 className="font-label text-sm text-muted-foreground">Medical background</h3>
            <p className="text-sm">
              {data.medicalBackground ? (
                <>
                  Conditions:{" "}
                  {Array.isArray(data.medicalBackground.conditions) && data.medicalBackground.conditions.length > 0
                    ? data.medicalBackground.conditions.join(", ")
                    : "None"}
                  <br />
                  Medications:{" "}
                  {Array.isArray(data.medicalBackground.medications) && data.medicalBackground.medications.length > 0
                    ? data.medicalBackground.medications.join(", ")
                    : "None"}
                  {data.medicalBackground.allergies?.trim() ? (
                    <>
                      <br />
                      Allergies: {data.medicalBackground.allergies.trim()}
                    </>
                  ) : null}
                </>
              ) : (
                "—"
              )}
            </p>
          </div>
          <div>
            <h3 className="font-label text-sm text-muted-foreground">Images</h3>
            <p className="text-sm">
              {submissionMode === "questionnaire" || data.imageUpload?.skipped
                ? "Face scan not provided — your report will be based on your questionnaire answers only."
                : data.imageUpload?.files && data.imageUpload.files.length > 0
                  ? `${data.imageUpload.files.length} file(s) ready for upload.`
                  : Array.isArray(data.imageUpload?.fileNames) && data.imageUpload.fileNames.length > 0
                    ? `${data.imageUpload.fileNames.length} file(s) selected.`
                    : "—"}
            </p>
          </div>
        </CardContent>
      </Card>

      {submitting && (progress !== null || stage) && (
        <Card className="border-border">
          <CardContent className="pt-6 space-y-3">
            <p className="text-sm font-medium">{stage ?? "Processing…"}</p>
            <Progress value={progress ?? 0} className="h-2" />
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" asChild disabled={submitting}>
          <Link href="/start-assessment">Edit assessment</Link>
        </Button>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Submitting…" : "Submit assessment"}
        </Button>
      </div>
    </div>
  );
}
