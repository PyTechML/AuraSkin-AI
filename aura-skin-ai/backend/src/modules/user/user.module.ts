import { Module } from "@nestjs/common";
import { UserController } from "./user.controller";
import { AssessmentController } from "./controllers/assessment.controller";
import { ReportController } from "./controllers/report.controller";
import { RoutineController } from "./controllers/routine.controller";
import { UserService } from "./services/user.service";
import { AssessmentService } from "./services/assessment.service";
import { AssessmentProgressService } from "./services/assessment-progress.service";
import { ReportService } from "./services/report.service";
import { ReportGenerator } from "./services/report.generator";
import { RoutineService } from "./services/routine.service";
import { DashboardMetricsService } from "./services/dashboard-metrics.service";
import { AssessmentRepository } from "./repositories/assessment.repository";
import { ReportRepository } from "./repositories/report.repository";
import { RoutineRepository } from "./repositories/routine.repository";
import { RoutineLogsRepository } from "./repositories/routineLogs.repository";
import { ImageUploadService } from "../../services/storage/imageUpload.service";
import { ProductRecommendationService } from "../../ai/recommendation/productRecommendation.service";
import { AiProductRecommendationService } from "../ai/product-recommendation.service";
import { AiDermatologistRecommendationService } from "../ai/dermatologist-recommendation.service";
import { NotificationsModule } from "../notifications/notifications.module";
import { AiEngineAnalysisService } from "../../ai/analysis/ai-engine-analysis.service";
import { AiReportService } from "./services/ai-report.service";

@Module({
  imports: [NotificationsModule],
  controllers: [UserController, AssessmentController, ReportController, RoutineController],
  providers: [
    UserService,
    AssessmentService,
    AssessmentProgressService,
    ReportService,
    ReportGenerator,
    RoutineService,
    DashboardMetricsService,
    AssessmentRepository,
    ReportRepository,
    RoutineRepository,
    RoutineLogsRepository,
    ImageUploadService,
    ProductRecommendationService,
    AiProductRecommendationService,
    AiDermatologistRecommendationService,
    AiEngineAnalysisService,
    AiReportService,
  ],
  exports: [UserService],
})
export class UserModule {}
