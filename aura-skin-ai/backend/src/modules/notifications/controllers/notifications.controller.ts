import {
  Controller,
  Delete,
  Get,
  Put,
  Param,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import { Throttle } from "@nestjs/throttler";
import { AuthGuard, AuthenticatedUser } from "../../../shared/guards/auth.guard";
import { RoleGuard } from "../../../shared/guards/role.guard";
import { ROLES_KEY } from "../../../shared/guards/role.guard";
import { SetMetadata } from "@nestjs/common";
import type { BackendRole } from "../../../shared/constants/roles";
import { formatSuccess } from "../../../shared/utils/responseFormatter";
import { NotificationsService } from "../services/notifications.service";
import { NotificationQueryDto } from "../dto/notification-query.dto";

const RequireAnyRole = () =>
  SetMetadata(ROLES_KEY, ["user", "store", "dermatologist", "admin"] as BackendRole[]);

@Controller("notifications")
@UseGuards(AuthGuard, RoleGuard)
@RequireAnyRole()
@Throttle({ notification: { limit: 60, ttl: 60_000 } })
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async list(
    @Req() req: Request,
    @Query() query: NotificationQueryDto
  ) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const userId = user?.id ?? "";
    const list = await this.notificationsService.listForRecipient(userId, {
      limit: query.limit,
      offset: query.offset,
      unreadOnly: query.unread_only,
      recycledOnly: (query as NotificationQueryDto & { recycled_only?: boolean }).recycled_only,
    });
    return formatSuccess(list);
  }

  @Put("read/:id")
  async markRead(@Param("id") id: string, @Req() req: Request) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const userId = user?.id ?? "";
    const notification = await this.notificationsService.markRead(id, userId);
    if (!notification) {
      return formatSuccess({ success: false });
    }
    return formatSuccess(notification);
  }

  @Put("read-all")
  async markAllRead(@Req() req: Request) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const userId = user?.id ?? "";
    const ok = await this.notificationsService.markAllRead(userId);
    return formatSuccess({ success: ok });
  }

  @Put("star/:id")
  async toggleStar(@Param("id") id: string, @Req() req: Request) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const userId = user?.id ?? "";
    const notification = await this.notificationsService.toggleStar(id, userId);
    return formatSuccess(notification ?? { success: false });
  }

  @Put("recycle/:id")
  async recycle(@Param("id") id: string, @Req() req: Request) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const userId = user?.id ?? "";
    const notification = await this.notificationsService.recycle(id, userId);
    return formatSuccess(notification ?? { success: false });
  }

  @Put("restore/:id")
  async restore(@Param("id") id: string, @Req() req: Request) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const userId = user?.id ?? "";
    const notification = await this.notificationsService.restore(id, userId);
    return formatSuccess(notification ?? { success: false });
  }

  @Delete(":id")
  async deleteForever(@Param("id") id: string, @Req() req: Request) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const userId = user?.id ?? "";
    const ok = await this.notificationsService.deleteForever(id, userId);
    return formatSuccess({ success: ok });
  }
}
