import { Injectable } from "@nestjs/common";
import { StoreRepository } from "../repositories/store.repository";
import type { DbStoreProfile, DbStoreNotification } from "../../../../database/models";
import type { CreateStoreProfileDto, UpdateStoreProfileDto } from "../dto/store-profile.dto";

@Injectable()
export class StoreService {
  constructor(private readonly storeRepository: StoreRepository) {}

  async getProfile(storeId: string): Promise<DbStoreProfile | null> {
    return this.storeRepository.getProfileById(storeId);
  }

  async createProfile(storeId: string, dto: CreateStoreProfileDto): Promise<DbStoreProfile | null> {
    const existing = await this.storeRepository.getProfileById(storeId);
    if (existing) return null;
    return this.storeRepository.createProfile({
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
  }

  async updateProfile(storeId: string, dto: UpdateStoreProfileDto): Promise<DbStoreProfile | null> {
    return this.storeRepository.updateProfile(storeId, {
      store_name: dto.storeName,
      store_description: dto.storeDescription,
      address: dto.address,
      city: dto.city,
      latitude: dto.latitude,
      longitude: dto.longitude,
      contact_number: dto.contactNumber,
      logo_url: dto.logoUrl,
    });
  }

  async getNotifications(storeId: string): Promise<DbStoreNotification[]> {
    return this.storeRepository.getNotificationsByStoreId(storeId);
  }

  async markNotificationRead(id: string, storeId: string): Promise<DbStoreNotification | null> {
    return this.storeRepository.markNotificationRead(id, storeId);
  }
}
