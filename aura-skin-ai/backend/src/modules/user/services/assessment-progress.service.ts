import { Injectable } from "@nestjs/common";
import { RedisService } from "../../../redis/redis.service";
import { AssessmentRepository } from "../repositories/assessment.repository";
import { ReportRepository } from "../repositories/report.repository";

export interface ProgressResponse {
  progress: number;
  stage: string;
  report_id?: string;
  error?: string;
}

@Injectable()
export class AssessmentProgressService {
  constructor(
    private readonly redis: RedisService,
    private readonly assessmentRepository: AssessmentRepository,
    private readonly reportRepository: ReportRepository
  ) {}

  async getProgress(assessmentId: string, userId: string): Promise<ProgressResponse> {
    const assessment = await this.assessmentRepository.findByIdAndUser(assessmentId, userId);
    if (!assessment) {
      return { progress: 0, stage: "pending" };
    }
    const data = await this.redis.getAssessmentProgress(assessmentId);
    const report = await this.reportRepository.findByAssessmentIdAndUser(assessmentId, userId);
    if (report?.id && (!data || data.stage !== "completed")) {
      return { progress: 100, stage: "completed", report_id: report.id };
    }
    if (!data) {
      return { progress: 0, stage: "pending" };
    }
    return {
      progress: data.progress,
      stage: data.stage,
      report_id: data.report_id,
      error: data.error,
    };
  }
}
