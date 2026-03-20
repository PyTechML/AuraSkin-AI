"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAssessmentStore } from "@/store/assessmentStore";
import { useAuthStore } from "@/store/authStore";
import {
  createAssessment,
  uploadAssessmentImages,
  submitAssessment,
  getAssessmentProgress,
  getReportByAssessmentId,
  type CreateAssessmentPayload,
} from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 180; // ~6 min

export default function AssessmentReviewPage() {
  const router = useRouter();
  const { data } = useAssessmentStore();
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
    const files = data.imageUpload?.files ?? [];
    if (files.length < 5) {
      setError("Please go back and upload all 5 face images.");
      return;
    }

    setError(null);
    setSubmitting(true);
    setProgress(0);
    setStage("Creating assessment…");

    try {
      const createPayload: CreateAssessmentPayload = {
        skinType: data.skinTypeTone?.skinType,
        primaryConcern: data.skinConcerns?.[0],
        secondaryConcern: data.skinConcerns?.[1],
      };
      const { assessment_id } = await createAssessment(createPayload);
      setCurrentAssessmentId(assessment_id);
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
        const result = await getAssessmentProgress(assessment_id);
        setProgress(result.progress ?? 0);
        setStage(result.stage ?? "Processing…");

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
      setError(message);
      if (message === "Session expired. Please login again.") {
        useAuthStore.getState().logout();
        router.replace(`/login?redirect=${encodeURIComponent("/dashboard/assessment/review")}`);
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
          {data.personalDetails && (
            <div>
              <h3 className="font-label text-sm text-muted-foreground">Personal details</h3>
              <p className="text-sm">
                {data.personalDetails.fullName}, {data.personalDetails.age}
                {data.personalDetails.gender && ` · ${data.personalDetails.gender}`}
              </p>
            </div>
          )}
          {data.skinTypeTone && (
            <div>
              <h3 className="font-label text-sm text-muted-foreground">Skin type & tone</h3>
              <p className="text-sm">
                {data.skinTypeTone.skinType}, {data.skinTypeTone.skinTone}
              </p>
            </div>
          )}
          {data.skinConcerns && data.skinConcerns.length > 0 && (
            <div>
              <h3 className="font-label text-sm text-muted-foreground">Concerns</h3>
              <p className="text-sm">{data.skinConcerns.join(", ")}</p>
            </div>
          )}
          {data.lifestyle && (
            <div>
              <h3 className="font-label text-sm text-muted-foreground">Lifestyle</h3>
              <p className="text-sm">
                Sun exposure: {data.lifestyle.sunExposure}
                {data.lifestyle.sleepHours != null && ` · Sleep: ${data.lifestyle.sleepHours}h`}
              </p>
            </div>
          )}
          {data.medicalBackground && (
            <div>
              <h3 className="font-label text-sm text-muted-foreground">Medical background</h3>
              <p className="text-sm">
                Conditions: {data.medicalBackground.conditions?.length ? data.medicalBackground.conditions.join(", ") : "None"}
                <br />
                Medications: {data.medicalBackground.medications?.length ? data.medicalBackground.medications.join(", ") : "None"}
              </p>
            </div>
          )}
          {data.imageUpload?.files?.length ? (
            <div>
              <h3 className="font-label text-sm text-muted-foreground">Images</h3>
              <p className="text-sm">{data.imageUpload.files.length} file(s) ready for upload.</p>
            </div>
          ) : data.imageUpload?.fileNames?.length ? (
            <div>
              <h3 className="font-label text-sm text-muted-foreground">Images</h3>
              <p className="text-sm">{data.imageUpload.fileNames.length} file(s) selected.</p>
            </div>
          ) : null}
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
