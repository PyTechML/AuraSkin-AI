import { Injectable, NotFoundException, ForbiddenException, InternalServerErrorException } from "@nestjs/common";
import { getSupabaseClient } from "../../../database/supabase.client";
import { RoleRequestsRepository, type RoleRequestStatus, type RoleRequestWithProfile } from "../repositories/role-requests.repository";
import { AdminUsersRepository } from "../repositories/users.repository";
import { AuditService } from "./audit.service";
import { toBackendRole, type BackendRole } from "../../../shared/constants/roles";
import { NotificationsService } from "../../notifications/services/notifications.service";

const MASTER_ADMIN_EMAIL = "admin@auraskin.ai";

@Injectable()
export class RoleRequestsService {
  constructor(
    private readonly roleRequestsRepo: RoleRequestsRepository,
    private readonly usersRepo: AdminUsersRepository,
    private readonly audit: AuditService,
    private readonly notificationsService: NotificationsService
  ) {}

  async list(status?: RoleRequestStatus): Promise<RoleRequestWithProfile[]> {
    return this.roleRequestsRepo.findAll(status);
  }

  async approve(adminId: string, requestId: string): Promise<RoleRequestWithProfile> {
    const request = await this.roleRequestsRepo.findById(requestId);
    if (!request) throw new NotFoundException("Role request not found");
    if (request.status !== "pending") {
      throw new ForbiddenException("Request is no longer pending");
    }
    const requestedRole = toBackendRole(request.requested_role);
    if (!requestedRole) throw new ForbiddenException("Invalid requested role");
    if (requestedRole === "admin") {
      const email = (request.email ?? "").trim().toLowerCase();
      if (email !== MASTER_ADMIN_EMAIL) {
        throw new ForbiddenException("Only the master admin account may have the admin role");
      }
    }
    const supabase = getSupabaseClient();
    const { data: profileRow, error: profileFetchError } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .eq("id", request.user_id)
      .single();
    if (profileFetchError || !profileRow) {
      throw new NotFoundException("Profile not found");
    }

    const identity = {
      full_name: (profileRow as { full_name?: string | null }).full_name ?? null,
      email: (profileRow as { email?: string | null }).email ?? null,
    };

    // Upsert partner profile rows first so we never persist role=store/dermatologist without a row.
    await this.ensureRoleProfileRowForApproval(request.user_id, requestedRole, identity);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        role: requestedRole,
        status: "approved",
        is_active: true,
      })
      .eq("id", request.user_id);
    if (updateError) throw new NotFoundException(updateError.message);

    await this.roleRequestsRepo.updateStatus(requestId, "approved", adminId);
    await this.notificationsService.createNotification({
      recipientId: request.user_id,
      recipientRole: "user",
      type: "role_request_approved",
      title: "Role request approved",
      message: `Your ${requestedRole} role request has been approved. You can now login as ${requestedRole}.`,
      metadata: { request_id: requestId, requested_role: requestedRole },
    });
    await this.audit.log(adminId, "approve_role_request", "role_requests", requestId, {
      user_id: request.user_id,
      requested_role: requestedRole,
    });
    return (await this.roleRequestsRepo.findById(requestId))!;
  }

  /**
   * Public listings require profiles.role + status/is_active AND an approved store_profiles /
   * dermatologist_profiles row. Create or align those rows when a role request is approved.
   */
  private async ensureRoleProfileRowForApproval(
    userId: string,
    role: BackendRole,
    profile: { full_name: string | null; email: string | null }
  ): Promise<void> {
    if (role !== "store" && role !== "dermatologist") return;

    const supabase = getSupabaseClient();
    const displayFallback =
      (profile.full_name && profile.full_name.trim()) ||
      (profile.email && profile.email.split("@")[0]?.trim()) ||
      null;

    if (role === "store") {
      const { data: existing } = await supabase
        .from("store_profiles")
        .select("id, store_name")
        .eq("id", userId)
        .maybeSingle();
      const row = existing as { id?: string; store_name?: string | null } | null;
      const storeName =
        (row?.store_name && String(row.store_name).trim()) || displayFallback || "Store";
      if (row?.id) {
        const patch: Record<string, unknown> = { approval_status: "approved" };
        if (!(row.store_name && String(row.store_name).trim())) {
          patch.store_name = storeName;
        }
        const { error: upErr } = await supabase.from("store_profiles").update(patch).eq("id", userId);
        if (upErr) throw new InternalServerErrorException(upErr.message);
      } else {
        const { error: insErr } = await supabase.from("store_profiles").insert({
          id: userId,
          store_name: storeName,
          approval_status: "approved",
        });
        if (insErr) throw new InternalServerErrorException(insErr.message);
      }
      return;
    }

    // dermatologist
    const { data: dExisting } = await supabase
      .from("dermatologist_profiles")
      .select("id, clinic_name")
      .eq("id", userId)
      .maybeSingle();
    const dRow = dExisting as { id?: string; clinic_name?: string | null } | null;
    const clinicName =
      (dRow?.clinic_name && String(dRow.clinic_name).trim()) || displayFallback || "Practice";
    if (!dRow?.id) {
      const { error: dInsErr } = await supabase.from("dermatologist_profiles").insert({
        id: userId,
        clinic_name: clinicName,
      });
      if (dInsErr) throw new InternalServerErrorException(dInsErr.message);
    } else if (!(dRow.clinic_name && String(dRow.clinic_name).trim())) {
      const { error: dUpErr } = await supabase
        .from("dermatologist_profiles")
        .update({ clinic_name: clinicName })
        .eq("id", userId);
      if (dUpErr) throw new InternalServerErrorException(dUpErr.message);
    }
  }

  async reject(adminId: string, requestId: string, reason?: string): Promise<RoleRequestWithProfile> {
    const request = await this.roleRequestsRepo.findById(requestId);
    if (!request) throw new NotFoundException("Role request not found");
    if (request.status !== "pending") {
      throw new ForbiddenException("Request is no longer pending");
    }
    await this.roleRequestsRepo.updateStatus(requestId, "rejected", adminId, reason ?? null);
    await this.notificationsService.createNotification({
      recipientId: request.user_id,
      recipientRole: "user",
      type: "role_request_rejected",
      title: "Role request rejected",
      message:
        reason?.trim() && reason.trim().length > 0
          ? `Your ${request.requested_role} role request was rejected. Reason: ${reason.trim()}`
          : `Your ${request.requested_role} role request was rejected. You can resubmit with complete profile details.`,
      metadata: { request_id: requestId, requested_role: request.requested_role, reason: reason ?? null },
    });
    await this.audit.log(adminId, "reject_role_request", "role_requests", requestId, {
      user_id: request.user_id,
      requested_role: request.requested_role,
    });
    return (await this.roleRequestsRepo.findById(requestId))!;
  }

  async countPending(): Promise<number> {
    return this.roleRequestsRepo.countPending();
  }

  async resubmit(userId: string, requestedRole: "store" | "dermatologist"): Promise<boolean> {
    const ok = await this.roleRequestsRepo.resubmitLatestRejected(userId, requestedRole);
    if (!ok) return false;
    await this.notificationsService.createNotification({
      recipientId: userId,
      recipientRole: "user",
      type: "role_request_resubmitted",
      title: "Role request resubmitted",
      message: `Your ${requestedRole} request has been resubmitted for admin review.`,
      metadata: { requested_role: requestedRole },
    });
    return true;
  }
}
