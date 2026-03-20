import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../../../shared/guards/auth.guard";
import { RoleGuard, ROLES_KEY } from "../../../shared/guards/role.guard";
import { SetMetadata } from "@nestjs/common";
import type { BackendRole } from "../../../shared/constants/roles";
import { NotificationsService } from "../../notifications/services/notifications.service";
import { formatSuccess } from "../../../shared/utils/responseFormatter";
import { Throttle } from "@nestjs/throttler";
import { BroadcastNotificationDto } from "../../notifications/dto/broadcast-notification.dto";

const RequireAdmin = () => SetMetadata(ROLES_KEY, ["admin"] as BackendRole[]);

@Controller("admin")
@UseGuards(AuthGuard, RoleGuard)
@RequireAdmin()
@Throttle({ default: { limit: 200, ttl: 60_000 } })
export class AdminNotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post("notifications/broadcast")
  async broadcast(@Body() dto: BroadcastNotificationDto) {
    const targetRole = (dto.target_role ?? "admin") as
      | "user"
      | "store"
      | "dermatologist"
      | "admin";
    const count = await this.notificationsService.broadcastSystemAlert(
      dto.title,
      dto.message,
      targetRole
    );
    return formatSuccess({ sent: count, target_role: targetRole });
  }
}
