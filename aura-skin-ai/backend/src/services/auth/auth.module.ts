import { Module } from "@nestjs/common";
import { AuthSessionController } from "./auth-session.controller";
import { AuthPasswordController } from "./auth-password.controller";
import { AuthService } from "./auth.service";
import { SessionModule } from "../../modules/session/session.module";
import { OAuthController } from "../../modules/auth/controllers/oauth.controller";
import { OAuthService } from "../../modules/auth/services/oauth.service";

@Module({
  imports: [SessionModule],
  controllers: [
    AuthSessionController,
    AuthPasswordController,
    OAuthController,
  ],
  providers: [
    AuthService,
    OAuthService,
  ],
  exports: [AuthService],
})
export class AuthModule {}
