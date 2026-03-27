import { Injectable } from "@nestjs/common";
import { AdminSettingsRepository } from "../repositories/settings.repository";
import { UpdateAdminSettingsDto } from "../dto/update-admin-settings.dto";

const SETTINGS_KEY = "global";

@Injectable()
export class AdminSettingsService {
  constructor(private readonly settingsRepository: AdminSettingsRepository) {}

  async getSettings(): Promise<Record<string, unknown>> {
    return (await this.settingsRepository.getByKey(SETTINGS_KEY)) ?? {};
  }

  async saveSettings(dto: UpdateAdminSettingsDto): Promise<Record<string, unknown>> {
    const current = await this.getSettings();
    const next: Record<string, unknown> = {
      ...current,
      ...dto,
    };
    return (await this.settingsRepository.upsertByKey(SETTINGS_KEY, next)) ?? next;
  }
}
