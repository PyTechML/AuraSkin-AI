import { Injectable, NotFoundException } from "@nestjs/common";
import {
  AdminDermatologistsRepository,
  type AdminDermatologistWithVerification,
  type DermatologistVerificationRow,
} from "../repositories/dermatologists.repository";
import { AuditService } from "./audit.service";
import { PartnerActivationService } from "./partner-activation.service";

@Injectable()
export class AdminDermatologistsService {
  constructor(
    private readonly dermRepo: AdminDermatologistsRepository,
    private readonly audit: AuditService,
    private readonly partnerActivationService: PartnerActivationService
  ) {}

  async getPendingVerifications(): Promise<AdminDermatologistWithVerification[]> {
    return this.dermRepo.findPendingVerifications();
  }

  async verifyDermatologist(
    adminId: string,
    verificationId: string,
    reviewNotes?: string | null
  ): Promise<DermatologistVerificationRow> {
    const verification = await this.dermRepo.getVerificationById(verificationId);
    if (!verification) throw new NotFoundException("Verification request not found");
    if (verification.verification_status !== "pending") {
      throw new NotFoundException("Verification is not pending");
    }
    const ok = await this.dermRepo.updateVerificationStatus(
      verificationId,
      "verified",
      adminId,
      reviewNotes
    );
    if (!ok) throw new NotFoundException("Failed to update verification");
    await this.dermRepo.setDermatologistVerified(verification.dermatologist_id, true);
    const identity = await this.partnerActivationService.getProfileIdentity(verification.dermatologist_id);
    await this.partnerActivationService.ensureRoleProfileRow(verification.dermatologist_id, "dermatologist", identity);
    await this.partnerActivationService.activateRole(verification.dermatologist_id, "dermatologist");
    await this.audit.log(adminId, "verify_dermatologist", "dermatologist_verification", verificationId, {
      dermatologist_id: verification.dermatologist_id,
    });
    return (await this.dermRepo.getVerificationById(verificationId))!;
  }

  async rejectDermatologist(
    adminId: string,
    verificationId: string,
    reviewNotes?: string | null
  ): Promise<DermatologistVerificationRow> {
    const verification = await this.dermRepo.getVerificationById(verificationId);
    if (!verification) throw new NotFoundException("Verification request not found");
    if (verification.verification_status !== "pending") {
      throw new NotFoundException("Verification is not pending");
    }
    const ok = await this.dermRepo.updateVerificationStatus(
      verificationId,
      "rejected",
      adminId,
      reviewNotes
    );
    if (!ok) throw new NotFoundException("Failed to update verification");
    await this.dermRepo.setDermatologistVerified(verification.dermatologist_id, false);
    await this.audit.log(adminId, "reject_dermatologist", "dermatologist_verification", verificationId, {
      dermatologist_id: verification.dermatologist_id,
    });
    return (await this.dermRepo.getVerificationById(verificationId))!;
  }
}
