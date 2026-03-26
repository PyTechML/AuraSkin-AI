/**
 * AI assessment job queue. Pushes to Redis list; Python worker consumes.
 */

import { randomUUID } from "crypto";
import { RedisService } from "../redis/redis.service";

export interface AiProcessingJobPayload {
  assessmentId: string;
  userId: string;
  imageUrls: string[];
  captureMode?: "upload" | "live";
  capturedAt?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

/** Legacy shape for any existing callers; map to new payload. */
export interface AiProcessingJob {
  assessmentId: string;
  userId: string;
  imageKeys: string[];
  questionnaire: Record<string, unknown>;
}

/**
 * Enqueue an assessment for AI processing. Returns true if queued, false if Redis unavailable.
 * Worker (Python) reads from same Redis list and updates progress in Redis.
 */
export type EnqueueAssessmentResult = "queued" | "already_processing" | "unavailable";

export async function enqueueAssessmentProcessing(
  redis: RedisService,
  job: AiProcessingJobPayload
): Promise<EnqueueAssessmentResult> {
  const lockAcquired = await redis.acquireAssessmentLock(job.assessmentId);
  if (!lockAcquired) {
    return "already_processing";
  }

  const jobId = randomUUID();
  const payload = JSON.stringify({
    job_id: jobId,
    assessmentId: job.assessmentId,
    userId: job.userId,
    imageUrls: job.imageUrls,
    captureMode: job.captureMode ?? "upload",
    capturedAt: job.capturedAt ?? new Date().toISOString(),
    city: job.city,
    latitude: job.latitude,
    longitude: job.longitude,
  });
  const queued = await redis.pushAssessmentJob(payload);
  if (!queued) {
    await redis.releaseAssessmentLock(job.assessmentId);
    return "unavailable";
  }
  return "queued";
}
