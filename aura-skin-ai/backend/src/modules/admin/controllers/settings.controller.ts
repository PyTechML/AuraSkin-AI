import { Body, Controller, Get, Put, SetMetadata, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../../../shared/guards/auth.guard";
import { RoleGuard, ROLES_KEY } from "../../../shared/guards/role.guard";
import type { BackendRole } from "../../../shared/constants/roles";
import { Throttle } from "@nestjs/throttler";
import { formatSuccess } from "../../../shared/utils/responseFormatter";
import { AdminSettingsService } from "../services/settings.service";
import { UpdateAdminSettingsDto } from "../dto/update-admin-settings.dto";

const RequireAdmin = () => SetMetadata(ROLES_KEY, ["admin"] as BackendRole[]);

@Controller("admin/settings")
@UseGuards(AuthGuard, RoleGuard)
@RequireAdmin()
@Throttle({ default: { limit: 200, ttl: 60_000 } })
export class AdminSettingsController {
  constructor(private readonly settingsService: AdminSettingsService) {}

  @Get()
  async getSettings() {
    const data = await this.settingsService.getSettings();
    return formatSuccess(data);
  }

  @Put()
  async updateSettings(@Body() dto: UpdateAdminSettingsDto) {
    const data = await this.settingsService.saveSettings(dto);
    return formatSuccess(data);
  }
}
