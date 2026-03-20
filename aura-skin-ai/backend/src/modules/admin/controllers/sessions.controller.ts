import { Controller, Get, Delete, Param, Query, UseGuards } from "@nestjs/common";
import { RoleGuard, ROLES_KEY } from "../../../shared/guards/role.guard";
import { SetMetadata } from "@nestjs/common";
import type { BackendRole } from "../../../shared/constants/roles";
import { AuthGuard } from "../../../shared/guards/auth.guard";
import { AdminSessionsService } from "../services/sessions.service";
import { formatSuccess } from "../../../shared/utils/responseFormatter";
import { Throttle } from "@nestjs/throttler";

const RequireAdmin = () => SetMetadata(ROLES_KEY, ["admin"] as BackendRole[]);

@Controller("admin")
@UseGuards(AuthGuard, RoleGuard)
@RequireAdmin()
@Throttle({ default: { limit: 200, ttl: 60_000 } })
export class AdminSessionsController {
  constructor(private readonly sessionsService: AdminSessionsService) {}

  @Get("sessions")
  async getSessions(
    @Query("status") status?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    const data = await this.sessionsService.listSessions({
      status: status || undefined,
      limit: limit ? Math.min(Number(limit), 500) : 100,
      offset: offset ? Number(offset) : 0,
    });
    return formatSuccess(data);
  }

  @Delete("sessions/:sessionId")
  async forceLogout(@Param("sessionId") sessionId: string) {
    const ok = await this.sessionsService.forceLogout(sessionId);
    if (!ok) {
      return { statusCode: 404, message: "Session not found" };
    }
    return formatSuccess({ success: true });
  }
}
