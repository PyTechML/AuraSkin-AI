import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import { Throttle } from "@nestjs/throttler";
import { AuthGuard, AuthenticatedUser } from "../../../shared/guards/auth.guard";
import { RoleGuard, ROLES_KEY } from "../../../shared/guards/role.guard";
import { SetMetadata } from "@nestjs/common";
import type { BackendRole } from "../../../shared/constants/roles";
import { ConsultationService } from "../services/consultation.service";
import { formatSuccess } from "../../../shared/utils/responseFormatter";
import { CreateRoomDto } from "../dto/create-room.dto";
import { JoinRoomDto } from "../dto/join-room.dto";
import { LeaveRoomDto } from "../dto/leave-room.dto";

const RequireUser = () => SetMetadata(ROLES_KEY, ["user"] as BackendRole[]);
const RequireUserOrDermatologist = () =>
  SetMetadata(ROLES_KEY, ["user", "dermatologist"] as BackendRole[]);

@Controller("consultation")
@UseGuards(AuthGuard, RoleGuard)
@Throttle({ consultation: { limit: 30, ttl: 60_000 } })
export class ConsultationController {
  constructor(private readonly consultationService: ConsultationService) {}

  @Post("create-room")
  @RequireUser()
  async createRoom(@Req() req: Request, @Body() dto: CreateRoomDto) {
    const user = (req as Request & { user?: AuthenticatedUser }).user!;
    const data = await this.consultationService.createRoom(
      dto.consultation_id,
      user.id
    );
    return formatSuccess(data);
  }

  @Post("join-room")
  @RequireUserOrDermatologist()
  async joinRoom(@Req() req: Request, @Body() dto: JoinRoomDto) {
    const user = (req as Request & { user?: AuthenticatedUser }).user!;
    const data = await this.consultationService.joinRoom(
      dto.room_id,
      dto.session_token,
      user.id
    );
    return formatSuccess(data);
  }

  @Post("leave-room")
  @RequireUserOrDermatologist()
  async leaveRoom(@Req() req: Request, @Body() dto: LeaveRoomDto) {
    const user = (req as Request & { user?: AuthenticatedUser }).user!;
    const data = await this.consultationService.leaveRoom(
      dto.room_id,
      user.id
    );
    return formatSuccess(data);
  }

  @Get("session-status/:consultationId")
  @RequireUserOrDermatologist()
  async sessionStatus(
    @Req() req: Request,
    @Param("consultationId") consultationId: string
  ) {
    const user = (req as Request & { user?: AuthenticatedUser }).user!;
    const data = await this.consultationService.getSessionStatus(
      consultationId,
      user.id
    );
    return formatSuccess(data);
  }
}
