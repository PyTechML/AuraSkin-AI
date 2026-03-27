import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import { Throttle } from "@nestjs/throttler";
import { AuthGuard, AuthenticatedUser } from "../../../shared/guards/auth.guard";
import { RoleGuard, ROLES_KEY } from "../../../shared/guards/role.guard";
import { SetMetadata } from "@nestjs/common";
import type { BackendRole } from "../../../shared/constants/roles";
import { SlotsService } from "./services/slots.service";
import { formatSuccess } from "../../../shared/utils/responseFormatter";
import { CreateSlotDto, UpdateSlotDto, SyncAvailabilityDto } from "./dto";

const RequireDermatologist = () =>
  SetMetadata(ROLES_KEY, ["dermatologist"] as BackendRole[]);

@Controller("partner/dermatologist/slots")
@UseGuards(AuthGuard, RoleGuard)
@RequireDermatologist()
@Throttle({ public: { limit: 300, ttl: 60_000 } })
export class SlotsController {
  constructor(private readonly slotsService: SlotsService) {}

  @Get()
  async list(@Req() req: Request) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const dermatologistId = user?.id ?? "";
    const data = await this.slotsService.listByDermatologist(dermatologistId);
    return formatSuccess(data);
  }

  @Post("sync")
  async sync(@Req() req: Request, @Body() dto: SyncAvailabilityDto) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const dermatologistId = user?.id ?? "";
    const data = await this.slotsService.syncAvailability(dermatologistId, dto);
    return formatSuccess(data);
  }

  @Post("create")
  async create(@Req() req: Request, @Body() dto: CreateSlotDto) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const dermatologistId = user?.id ?? "";
    const data = await this.slotsService.create(dermatologistId, dto);
    return formatSuccess(data);
  }

  @Put("update/:id")
  async update(
    @Param("id") id: string,
    @Req() req: Request,
    @Body() dto: UpdateSlotDto
  ) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const dermatologistId = user?.id ?? "";
    const data = await this.slotsService.update(id, dermatologistId, dto);
    return formatSuccess(data);
  }

  @Delete("delete/:id")
  async delete(@Param("id") id: string, @Req() req: Request) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const dermatologistId = user?.id ?? "";
    const ok = await this.slotsService.delete(id, dermatologistId);
    return formatSuccess({ deleted: ok });
  }
}
