import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { getSupabaseClient } from "../../../database/supabase.client";
import { RoleRequestsRepository, type RoleRequestStatus, type RoleRequestWithProfile } from "../repositories/role-requests.repository";
import { AdminUsersRepository } from "../repositories/users.repository";
import { AuditService } from "./audit.service";
import { toBackendRole } from "../../../shared/constants/roles";

const MASTER_ADMIN_EMAIL = "admin@auraskin.ai";

@Injectable()
export class RoleRequestsService {
  constructor(
    private readonly roleRequestsRepo: RoleRequestsRepository,
    private readonly usersRepo: AdminUsersRepository,
    private readonly audit: AuditService
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
    await this.audit.log(adminId, "approve_role_request", "role_requests", requestId, {
      user_id: request.user_id,
      requested_role: requestedRole,
    });
    return (await this.roleRequestsRepo.findById(requestId))!;
  }

  async reject(adminId: string, requestId: string): Promise<RoleRequestWithProfile> {
    const request = await this.roleRequestsRepo.findById(requestId);
    if (!request) throw new NotFoundException("Role request not found");
    if (request.status !== "pending") {
      throw new ForbiddenException("Request is no longer pending");
    }
    await this.roleRequestsRepo.updateStatus(requestId, "rejected", adminId);
    await this.audit.log(adminId, "reject_role_request", "role_requests", requestId, {
      user_id: request.user_id,
      requested_role: request.requested_role,
    });
    return (await this.roleRequestsRepo.findById(requestId))!;
  }

  async countPending(): Promise<number> {
    return this.roleRequestsRepo.countPending();
  }
}
