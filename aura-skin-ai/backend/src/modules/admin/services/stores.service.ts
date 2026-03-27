import { Injectable, NotFoundException } from "@nestjs/common";
import { AdminStoresRepository, type AdminStoreProfile } from "../repositories/stores.repository";
import { AuditService } from "./audit.service";
import { PartnerActivationService } from "./partner-activation.service";

@Injectable()
export class AdminStoresService {
  constructor(
    private readonly storesRepo: AdminStoresRepository,
    private readonly audit: AuditService,
    private readonly partnerActivationService: PartnerActivationService
  ) {}

  async getAll(): Promise<AdminStoreProfile[]> {
    return this.storesRepo.findAll();
  }

  async getById(id: string): Promise<AdminStoreProfile> {
    const store = await this.storesRepo.findById(id);
    if (!store) throw new NotFoundException("Store not found");
    return store;
  }

  async approveStore(adminId: string, storeId: string): Promise<AdminStoreProfile> {
    const store = await this.storesRepo.findById(storeId);
    if (!store) throw new NotFoundException("Store not found");
    const ok = await this.storesRepo.setApprovalStatus(storeId, "approved");
    if (!ok) throw new NotFoundException("Failed to update store");
    const identity = await this.partnerActivationService.getProfileIdentity(storeId);
    await this.partnerActivationService.ensureRoleProfileRow(storeId, "store", identity);
    await this.partnerActivationService.activateRole(storeId, "store");
    await this.audit.log(adminId, "approve_store", "store_profiles", storeId, { approval_status: "approved" });
    return (await this.storesRepo.findById(storeId))!;
  }

  async rejectStore(adminId: string, storeId: string): Promise<AdminStoreProfile> {
    const store = await this.storesRepo.findById(storeId);
    if (!store) throw new NotFoundException("Store not found");
    const ok = await this.storesRepo.setApprovalStatus(storeId, "rejected");
    if (!ok) throw new NotFoundException("Failed to update store");
    await this.audit.log(adminId, "reject_store", "store_profiles", storeId, { approval_status: "rejected" });
    return (await this.storesRepo.findById(storeId))!;
  }
}
