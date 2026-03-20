import { Injectable, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";
import { loadEnv } from "../config/env";

const AI_QUEUE_KEY = "ai:assessment:queue";
const PROGRESS_KEY_PREFIX = "assessment:progress:";
const PROCESSING_LOCK_PREFIX = "assessment:processing:";
const JOB_RETRY_PREFIX = "ai:job:retry:";
const DEAD_LETTER_KEY = "ai:assessment:failed";
const PROGRESS_TTL_SEC = 86400; // 24 hours

export type AssessmentStage =
  | "queued"
  | "image_validation"
  | "processing"
  | "generating_report"
  | "completed"
  | "failed";

export interface AssessmentProgress {
  progress: number;
  stage: AssessmentStage | string;
  report_id?: string;
  error?: string;
}

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: Redis | null = null;
  private static memoryProgress = new Map<
    string,
    { value: AssessmentProgress; expiresAt: number }
  >();

  private getClient(): Redis | null {
    if (this.client) return this.client;
    const env = loadEnv();
    if (!env.redisUrl) return null;
    try {
      this.client = new Redis(env.redisUrl, { maxRetriesPerRequest: 3 });
      return this.client;
    } catch {
      return null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      this.client.disconnect();
      this.client = null;
    }
  }

  /** Push AI assessment job to queue (consumed by Python worker). */
  async pushAssessmentJob(payload: string): Promise<boolean> {
    const redis = this.getClient();
    if (!redis) return false;
    try {
      await redis.lpush(AI_QUEUE_KEY, payload);
      return true;
    } catch {
      return false;
    }
  }

  /** Initialize or update assessment progress (read by frontend & worker). */
  async setAssessmentProgress(
    assessmentId: string,
    stage: AssessmentStage,
    progress: number,
    extras?: Partial<Pick<AssessmentProgress, "report_id" | "error">>
  ): Promise<boolean> {
    const redis = this.getClient();
    const storeMemory = () => {
      RedisService.memoryProgress.set(PROGRESS_KEY_PREFIX + assessmentId, {
        value: {
          progress,
          stage,
          report_id: extras?.report_id,
          error: extras?.error,
        },
        expiresAt: Date.now() + PROGRESS_TTL_SEC * 1000,
      });
      return true;
    };
    if (!redis) return storeMemory();
    try {
      const key = PROGRESS_KEY_PREFIX + assessmentId;
      const payload: AssessmentProgress = {
        progress,
        stage,
        report_id: extras?.report_id,
        error: extras?.error,
      };
      await redis.set(key, JSON.stringify(payload), "EX", PROGRESS_TTL_SEC);
      return true;
    } catch {
      // If Redis is configured but temporarily unavailable, still allow progress polling in the
      // current backend instance (dev fallback).
      return storeMemory();
    }
  }

  /** Get progress for an assessment (written by Python worker). */
  async getAssessmentProgress(assessmentId: string): Promise<AssessmentProgress | null> {
    const redis = this.getClient();
    const readMemory = (): AssessmentProgress | null => {
      const key = PROGRESS_KEY_PREFIX + assessmentId;
      const entry = RedisService.memoryProgress.get(key) ?? null;
      if (!entry) return null;
      if (Date.now() > entry.expiresAt) {
        RedisService.memoryProgress.delete(key);
        return null;
      }
      return entry.value;
    };
    if (!redis) return readMemory();
    try {
      const key = PROGRESS_KEY_PREFIX + assessmentId;
      const raw = await redis.get(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as AssessmentProgress;
      return parsed;
    } catch {
      return readMemory();
    }
  }

  /** Queue length for metrics (LLEN). */
  async getQueueLength(): Promise<number> {
    const redis = this.getClient();
    if (!redis) return 0;
    try {
      return await redis.llen(AI_QUEUE_KEY);
    } catch {
      return 0;
    }
  }

  /**
   * Attempt to acquire a processing lock for an assessment.
   * Returns true if the lock was acquired, false if it already exists.
   */
  async acquireAssessmentLock(assessmentId: string, ttlSeconds: number = 900): Promise<boolean> {
    const redis = this.getClient();
    if (!redis) return false;
    try {
      const key = PROCESSING_LOCK_PREFIX + assessmentId;
      const result = await redis.set(key, "1", "EX", ttlSeconds, "NX");
      return result === "OK";
    } catch {
      return false;
    }
  }

  /** Release an assessment processing lock. */
  async releaseAssessmentLock(assessmentId: string): Promise<void> {
    const redis = this.getClient();
    if (!redis) return;
    try {
      const key = PROCESSING_LOCK_PREFIX + assessmentId;
      await redis.del(key);
    } catch {
      // best-effort
    }
  }

  /** Increment and return the retry count for a given job id. */
  async incrementJobRetry(jobId: string): Promise<number> {
    const redis = this.getClient();
    if (!redis) return 0;
    try {
      const key = JOB_RETRY_PREFIX + jobId;
      const value = await redis.incr(key);
      return value ?? 0;
    } catch {
      return 0;
    }
  }

  /** Clear the retry counter for a job once it succeeds. */
  async resetJobRetry(jobId: string): Promise<void> {
    const redis = this.getClient();
    if (!redis) return;
    try {
      const key = JOB_RETRY_PREFIX + jobId;
      await redis.del(key);
    } catch {
      // best-effort
    }
  }

  /** Append a failed job payload to the dead-letter queue. */
  async pushFailedJob(payload: string): Promise<void> {
    const redis = this.getClient();
    if (!redis) return;
    try {
      await redis.rpush(DEAD_LETTER_KEY, payload);
    } catch {
      // best-effort
    }
  }

  /** Lightweight connectivity check. */
  async ping(): Promise<boolean> {
    const redis = this.getClient();
    if (!redis) return false;
    try {
      await redis.ping();
      return true;
    } catch {
      return false;
    }
  }

  /** Read ai:worker:running (set by Python worker for metrics). */
  async getWorkerRunningCount(): Promise<number> {
    const redis = this.getClient();
    if (!redis) return 0;
    try {
      const raw = await redis.get("ai:worker:running");
      const n = raw ? parseInt(raw, 10) : 0;
      return Number.isNaN(n) ? 0 : Math.max(0, n);
    } catch {
      return 0;
    }
  }

  /** Read ai:worker:failed (INCR by Python worker on each failed job). */
  async getWorkerFailedCount(): Promise<number> {
    const redis = this.getClient();
    if (!redis) return 0;
    try {
      const raw = await redis.get("ai:worker:failed");
      const n = raw ? parseInt(raw, 10) : 0;
      return Number.isNaN(n) ? 0 : Math.max(0, n);
    } catch {
      return 0;
    }
  }

  /** Last heartbeat timestamp from Python worker (ai:worker:last_heartbeat). */
  async getWorkerHeartbeat(): Promise<string | null> {
    const redis = this.getClient();
    if (!redis) return null;
    try {
      const raw = await redis.get("ai:worker:last_heartbeat");
      return raw ?? null;
    } catch {
      return null;
    }
  }

  /** Expose queue key for Python worker compatibility. */
  static getQueueKey(): string {
    return AI_QUEUE_KEY;
  }

  static getProgressKeyPrefix(): string {
    return PROGRESS_KEY_PREFIX;
  }
}
