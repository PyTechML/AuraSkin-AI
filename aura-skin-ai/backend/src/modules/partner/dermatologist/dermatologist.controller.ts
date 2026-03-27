import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import { AuthGuard, AuthenticatedUser } from "../../../shared/guards/auth.guard";
import { RoleGuard, ROLES_KEY } from "../../../shared/guards/role.guard";
import { SetMetadata } from "@nestjs/common";
import type { BackendRole } from "../../../shared/constants/roles";
import { DermatologistService } from "./services/dermatologist.service";
import { formatSuccess } from "../../../shared/utils/responseFormatter";
import { CreateDermatologistProfileDto, UpdateDermatologistProfileDto } from "./dto";
import { ForbiddenException } from "@nestjs/common";
import { CreatePatientDto, UpdatePatientDto } from "./dto/patient.dto";

const RequireDermatologist = () =>
  SetMetadata(ROLES_KEY, ["dermatologist"] as BackendRole[]);

@Controller("partner/dermatologist")
@UseGuards(AuthGuard, RoleGuard)
@RequireDermatologist()
export class DermatologistController {
  constructor(private readonly dermatologistService: DermatologistService) {}

  @Get("profile")
  async getProfile(@Req() req: Request) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const dermatologistId = user?.id ?? "";
    const data = await this.dermatologistService.getProfile(dermatologistId);
    return formatSuccess(data);
  }

  @Post("profile")
  async createProfile(
    @Req() req: Request,
    @Body() dto: CreateDermatologistProfileDto
  ) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const dermatologistId = user?.id ?? "";
    const data = await this.dermatologistService.createProfile(
      dermatologistId,
      dto
    );
    return formatSuccess(data);
  }

  @Put("profile")
  async updateProfile(
    @Req() req: Request,
    @Body() dto: UpdateDermatologistProfileDto
  ) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const dermatologistId = user?.id ?? "";
    const data = await this.dermatologistService.updateProfile(
      dermatologistId,
      dto
    );
    return formatSuccess(data);
  }

  @Get("patients")
  async getPatients(@Req() req: Request) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const dermatologistId = user?.id ?? "";
    const data = await this.dermatologistService.getPatients(dermatologistId);
    return formatSuccess(data);
  }

  @Get("patients/:id")
  async getPatientById(@Param("id") id: string, @Req() req: Request) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const dermatologistId = user?.id ?? "";
    const data = await this.dermatologistService.getPatientById(
      dermatologistId,
      id
    );
    if (!data) throw new ForbiddenException("Patient not found or access denied");
    return formatSuccess(data);
  }

  @Post("patients")
  async createPatient(@Req() req: Request, @Body() dto: CreatePatientDto) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const dermatologistId = user?.id ?? "";
    const data = await this.dermatologistService.createPatient(dermatologistId, dto);
    return formatSuccess(data);
  }

  @Put("patients/:id")
  async updatePatient(
    @Param("id") id: string,
    @Req() req: Request,
    @Body() dto: UpdatePatientDto
  ) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const dermatologistId = user?.id ?? "";
    const data = await this.dermatologistService.updatePatient(
      dermatologistId,
      id,
      dto
    );
    return formatSuccess(data);
  }

  @Post("patients/:id/delete")
  async deletePatient(@Param("id") id: string, @Req() req: Request) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const dermatologistId = user?.id ?? "";
    const deleted = await this.dermatologistService.deletePatient(dermatologistId, id);
    return formatSuccess({ deleted });
  }

  @Get("notifications")
  async getNotifications(@Req() req: Request) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const dermatologistId = user?.id ?? "";
    const data = await this.dermatologistService.getNotifications(
      dermatologistId
    );
    return formatSuccess(data);
  }

  @Put("notifications/read/:id")
  async markNotificationRead(@Param("id") id: string, @Req() req: Request) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const dermatologistId = user?.id ?? "";
    const data = await this.dermatologistService.markNotificationRead(
      id,
      dermatologistId
    );
    return formatSuccess(data);
  }

  @Get("bookings")
  async getBookings(@Req() req: Request) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const dermatologistId = user?.id ?? "";
    const data = await this.dermatologistService.getBookingsByDermatologist(
      dermatologistId
    );
    return formatSuccess(data);
  }

  @Get("availability")
  async getAvailability(@Req() req: Request) {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    const dermatologistId = user?.id ?? "";
    const data = await this.dermatologistService.getAvailability(
      dermatologistId
    );
    return formatSuccess(data);
  }
}
