import { Module } from "@nestjs/common";
import { AuthSessionController } from "./auth-session.controller";
import { AuthPasswordController } from "./auth-password.controller";
import { AuthOtpController } from "./auth-otp.controller";
import { AuthService } from "./auth.service";
import { AuthOtpService } from "./auth-otp.service";
import { PendingSignupRepository } from "./pending-signup.repository";
import { LoginChallengeRepository } from "./login-challenge.repository";
import { SessionModule } from "../../modules/session/session.module";
import { isAuthEmailOtpRequiredEnv } from "../../config/env";

const otpRequired = isAuthEmailOtpRequiredEnv();

@Module({
  imports: [SessionModule],
  controllers: [
    AuthSessionController,
    ...(otpRequired ? [AuthOtpController] : [AuthPasswordController]),
  ],
  providers: [
    AuthService,
    ...(otpRequired ? [PendingSignupRepository, LoginChallengeRepository, AuthOtpService] : []),
  ],
  exports: [AuthService],
})
export class AuthModule {}
