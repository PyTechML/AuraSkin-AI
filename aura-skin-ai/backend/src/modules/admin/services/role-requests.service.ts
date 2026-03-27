import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { getSupabaseClient } from "../../../database/supabase.client";
import { RoleRequestsRepository, type RoleRequestStatus, type RoleRequestWithProfile } from "../repositories/role-requests.repository";
import { AdminUsersRepository } from "../repositories/users.repository";
import { AuditService } from "./audit.service";
import { toBackendRole } from "../../../shared/constants/roles";
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
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ role: requestedRole })
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
