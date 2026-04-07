import { Module } from "@nestjs/common";
import { AuthSessionController } from "./auth-session.controller";
import { AuthPasswordController } from "./auth-password.controller";
import { AuthOtpController } from "./auth-otp.controller";
import { AuthService } from "./auth.service";
import { AuthOtpService } from "./auth-otp.service";
import { PendingSignupRepository } from "./pending-signup.repository";
import { LoginChallengeRepository } from "./login-challenge.repository";
import { SessionModule } from "../../modules/session/session.module";
import { OAuthController } from "../../modules/auth/controllers/oauth.controller";
import { OAuthService } from "../../modules/auth/services/oauth.service";
import { isAuthEmailOtpRequiredEnv } from "../../config/env";

const otpRequired = isAuthEmailOtpRequiredEnv();

@Module({
  imports: [SessionModule],
  controllers: [
    AuthSessionController,
    AuthPasswordController,
    AuthOtpController,
    OAuthController,
  ],
  providers: [
    AuthService,
    AuthOtpService,
    OAuthService,
    PendingSignupRepository,
    LoginChallengeRepository,
  ],
  exports: [AuthService],
})
export class AuthModule {}
