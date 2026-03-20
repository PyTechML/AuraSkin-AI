import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import { AuthGuard, AuthenticatedUser } from "../../../shared/guards/auth.guard";
import { RoleGuard, ROLES_KEY } from "../../../shared/guards/role.guard";
import { SetMetadata } from "@nestjs/common";
import type { BackendRole } from "../../../shared/constants/roles";
import { formatSuccess } from "../../../shared/utils/responseFormatter";
import { RoutineService } from "../services/routine.service";
import { CreateRoutineLogDto, GetRoutineLogsQueryDto } from "../dto/routine-log.dto";

const RequireUser = () => SetMetadata(ROLES_KEY, ["user"] as BackendRole[]);

@Controller("user")
@UseGuards(AuthGuard, RoleGuard)
@RequireUser()
export class RoutineController {
  constructor(private readonly routineService: RoutineService) {}

  @Get("routines/current")
  async getCurrent(@Req() req: Request) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const userId = user?.id ?? "";
    const data = await this.routineService.getCurrentRoutine(userId);
    return formatSuccess(data);
  }

  @Get("routines/logs")
  async getLogs(@Req() req: Request, @Query() query: GetRoutineLogsQueryDto) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const userId = user?.id ?? "";
    const days = query.days ? Number.parseInt(query.days, 10) || 7 : 7;
    const { planId, logs } = await this.routineService.getLogsForUser(userId, days);
    return formatSuccess({
      planId,
      logs: logs.map((l) => ({
        id: l.id,
        date: l.date,
        timeOfDay: l.time_of_day,
        status: l.status,
      })),
    });
  }

  @Post("routines/logs")
  async createOrUpdateLog(@Req() req: Request, @Body() dto: CreateRoutineLogDto) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const userId = user?.id ?? "";
    await this.routineService.upsertLog(userId, {
      date: dto.date,
      timeOfDay: dto.timeOfDay,
      status: dto.status,
    });
    return formatSuccess({ success: true });
  }
}

