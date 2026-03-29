import { Injectable } from "@nestjs/common";
import { StoreRepository } from "../repositories/store.repository";
import type { DbStoreProfile, DbStoreNotification } from "../../../../database/models";
import type { CreateStoreProfileDto, UpdateStoreProfileDto } from "../dto/store-profile.dto";
import { getSupabaseClient } from "../../../../database/supabase.client";

@Injectable()
export class StoreService {
  constructor(private readonly storeRepository: StoreRepository) {}

  /**
   * If the user is already an approved store partner, keep store_profiles.approval_status in sync
   * so the public Stores map lists them (defaults to pending on insert otherwise).
   */
  private async syncStoreApprovalFromProfile(storeId: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", storeId)
      .maybeSingle();
    const row = profile as { role?: string | null; status?: string | null } | null;
    const role = String(row?.role ?? "").trim().toLowerCase();
    const status = String(row?.status ?? "").trim().toLowerCase();
    if (role === "store" && status === "approved") {
      await supabase.from("store_profiles").update({ approval_status: "approved" }).eq("id", storeId);
    }
  }

  async getProfile(storeId: string): Promise<DbStoreProfile | null> {
    return this.storeRepository.getProfileById(storeId);
  }

  async createProfile(storeId: string, dto: CreateStoreProfileDto): Promise<DbStoreProfile | null> {
    const existing = await this.storeRepository.getProfileById(storeId);
    if (existing) return null;
    const created = await this.storeRepository.createProfile({
      id: storeId,
      store_name: dto.storeName ?? null,
      store_description: dto.storeDescription ?? null,
      address: dto.address ?? null,
      city: dto.city ?? null,
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      contact_number: dto.contactNumber ?? null,
      logo_url: dto.logoUrl ?? null,
    });
    if (created) await this.syncStoreApprovalFromProfile(storeId);
    return created;
  }

  async updateProfile(storeId: string, dto: UpdateStoreProfileDto): Promise<DbStoreProfile | null> {
    const updated = await this.storeRepository.updateProfile(storeId, {
      store_name: dto.storeName,
      store_description: dto.storeDescription,
      address: dto.address,
      city: dto.city,
      latitude: dto.latitude,
      longitude: dto.longitude,
      contact_number: dto.contactNumber,
      logo_url: dto.logoUrl,
    });
    if (updated) await this.syncStoreApprovalFromProfile(storeId);
    return updated;
  }

  async getNotifications(storeId: string): Promise<DbStoreNotification[]> {
    return this.storeRepository.getNotificationsByStoreId(storeId);
  }

  async markNotificationRead(id: string, storeId: string): Promise<DbStoreNotification | null> {
    return this.storeRepository.markNotificationRead(id, storeId);
  }
}
