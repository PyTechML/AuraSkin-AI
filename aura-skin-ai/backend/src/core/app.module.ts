import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { RedisModule } from "../redis/redis.module";
import { LoggerModule } from "./logger/logger.module";
import { MetricsModule } from "./metrics/metrics.module";
import { AnalyticsModule } from "../modules/analytics/analytics.module";
import { PublicModule } from "../modules/public/public.module";
import { UserModule } from "../modules/user/user.module";
import { StoreModule } from "../modules/partner/store/store.module";
import { DermatologistModule } from "../modules/partner/dermatologist/dermatologist.module";
import { AdminModule } from "../modules/admin/admin.module";
import { AssistantModule } from "../ai/assistant/assistant.module";
import { AuthModule } from "../services/auth/auth.module";
import { PaymentsModule } from "../modules/payments/payments.module";
import { ConsultationModule } from "../modules/consultation/consultation.module";
import { NotificationsModule } from "../modules/notifications/notifications.module";
import { SessionModule } from "../modules/session/session.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: [".env"] }),
    ScheduleModule.forRoot(),
    RedisModule,
    LoggerModule,
    MetricsModule,
    AnalyticsModule,
    ThrottlerModule.forRoot([
      { name: "public", ttl: 60_000, limit: 100 },
      { name: "auth", ttl: 60_000, limit: 10 },
      { name: "otp", ttl: 60_000, limit: 8 },
      { name: "consultation", ttl: 60_000, limit: 30 },
      { name: "admin", ttl: 60_000, limit: 200 },
      { name: "payment", ttl: 60_000, limit: 20 },
      { name: "notification", ttl: 60_000, limit: 60 },
      { name: "user", ttl: 60_000, limit: 80 },
    ]),
    AuthModule,
    SessionModule,
    PublicModule,
    UserModule,
    StoreModule,
    DermatologistModule,
    AdminModule,
    AssistantModule,
    PaymentsModule,
    ConsultationModule,
    NotificationsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
