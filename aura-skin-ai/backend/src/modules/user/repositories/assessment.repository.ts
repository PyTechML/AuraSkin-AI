import { Injectable } from "@nestjs/common";
import { getSupabaseClient } from "../../../database/supabase.client";
import { LoggerService } from "../../../core/logger/logger.service";
import { MetricsService } from "../../../core/metrics/metrics.service";
import type { AssessmentImageType, DbAssessment, DbAssessmentImage } from "../../../database/models";

const SLOW_QUERY_MS = 500;

export interface CreateAssessmentRow {
  user_id: string;
  assessment_name?: string | null;
  skin_type?: string | null;
  primary_concern?: string | null;
  secondary_concern?: string | null;
  sensitivity_level?: string | null;
  current_products?: string | null;
  lifestyle_factors?: string | null;
}

@Injectable()
export class AssessmentRepository {
  constructor(
    private readonly logger: LoggerService,
    private readonly metrics: MetricsService
  ) {}

  private async withDbMetrics<T>(
    table: string,
    fn: () => PromiseLike<{ data: T | null; error: unknown }>
  ): Promise<{ data: T | null; error: unknown }> {
    const start = Date.now();
    const result = await fn();
    const duration = Date.now() - start;
    this.metrics.recordDatabaseQuery(table, duration, !!result.error);
    if (duration >= SLOW_QUERY_MS) {
      this.logger.log("Slow query", { table, duration_ms: duration, event_type: "slow_query" });
    }
    return result;
  }

  async create(row: CreateAssessmentRow): Promise<DbAssessment | null> {
    const supabase = getSupabaseClient();
    const insertPayload = {
      user_id: row.user_id,
      assessment_name: row.assessment_name ?? null,
      skin_type: row.skin_type ?? null,
      primary_concern: row.primary_concern ?? null,
      secondary_concern: row.secondary_concern ?? null,
      sensitivity_level: row.sensitivity_level ?? null,
      current_products: row.current_products ?? null,
      lifestyle_factors: row.lifestyle_factors ?? null,
    };
    const { data, error } = await this.withDbMetrics<DbAssessment>("assessments", () =>
      supabase
        .from("assessments")
        .insert(insertPayload)
        .select()
        .single()
        .then((r) => ({ data: r.data as DbAssessment | null, error: r.error }))
    );
    if (error || !data) {
      const errorMessage =
        typeof error === "object" && error !== null && "message" in error
          ? String((error as { message?: unknown }).message ?? "")
          : "";
      const missingAssessmentNameColumn =
        errorMessage.includes("assessment_name") &&
        (errorMessage.toLowerCase().includes("column") ||
          errorMessage.toLowerCase().includes("schema cache"));
      if (!missingAssessmentNameColumn) return null;

      // Compatibility fallback for environments where assessment_name migration
      // has not been applied yet.
      const { assessment_name: _ignored, ...legacyPayload } = insertPayload;
      const legacyResult = await this.withDbMetrics<DbAssessment>("assessments", () =>
        supabase
          .from("assessments")
          .insert(legacyPayload)
          .select()
          .single()
          .then((r) => ({ data: r.data as DbAssessment | null, error: r.error }))
      );
      if (legacyResult.error || !legacyResult.data) return null;
      return legacyResult.data as DbAssessment;
    }
    return data as DbAssessment;
  }

  async findById(id: string): Promise<DbAssessment | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await this.withDbMetrics<DbAssessment>("assessments", () =>
      supabase.from("assessments").select("*").eq("id", id).single().then((r) => ({ data: r.data as DbAssessment | null, error: r.error }))
    );
    if (error || !data) return null;
    return data as DbAssessment;
  }

  async findByIds(ids: string[]): Promise<DbAssessment[]> {
    if (ids.length === 0) return [];
    const supabase = getSupabaseClient();
    const { data, error } = await this.withDbMetrics<DbAssessment[]>("assessments", () =>
      supabase.from("assessments").select("*").in("id", ids).then((r) => ({ data: (r.data as DbAssessment[]) ?? [], error: r.error }))
    );
    if (error) return [];
    return data ?? [];
  }

  async findByIdAndUser(id: string, userId: string): Promise<DbAssessment | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await this.withDbMetrics<DbAssessment>("assessments", () =>
      supabase
        .from("assessments")
        .select("*")
        .eq("id", id)
        .eq("user_id", userId)
        .single()
        .then((r) => ({ data: r.data as DbAssessment | null, error: r.error }))
    );
    if (error || !data) return null;
    return data as DbAssessment;
  }

  async getImagesByAssessmentId(assessmentId: string): Promise<DbAssessmentImage[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await this.withDbMetrics<DbAssessmentImage[]>("assessment_images", () =>
      supabase
        .from("assessment_images")
        .select("*")
        .eq("assessment_id", assessmentId)
        .order("created_at", { ascending: true })
        .then((r) => ({ data: (r.data as DbAssessmentImage[]) ?? [], error: r.error }))
    );
    if (error) return [];
    return data ?? [];
  }

  async insertImage(row: {
    assessment_id: string;
    image_type: AssessmentImageType;
    image_url: string;
  }): Promise<DbAssessmentImage | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await this.withDbMetrics<DbAssessmentImage>("assessment_images", () =>
      supabase
        .from("assessment_images")
        .insert({
          assessment_id: row.assessment_id,
          image_type: row.image_type,
          image_url: row.image_url,
        })
        .select()
        .single()
        .then((r) => ({ data: r.data as DbAssessmentImage | null, error: r.error }))
    );
    if (error || !data) return null;
    return data as DbAssessmentImage;
  }
}
