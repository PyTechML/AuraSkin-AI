import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { getSupabaseClient } from "../../../database/supabase.client";
import { AdminUsersRepository, type AdminProfile } from "../repositories/users.repository";
import { AuditService } from "./audit.service";

const MASTER_ADMIN_EMAIL = "admin@auraskin.ai";

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly usersRepo: AdminUsersRepository,
    private readonly audit: AuditService
  ) {}

  async getAll(): Promise<AdminProfile[]> {
    return this.usersRepo.findAll();
  }

  async getById(id: string): Promise<AdminProfile> {
    const user = await this.usersRepo.findById(id);
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  private isMasterAdmin(profile: AdminProfile): boolean {
    return (profile.email ?? "").trim().toLowerCase() === MASTER_ADMIN_EMAIL;
  }

  async blockUser(adminId: string, userId: string): Promise<AdminProfile> {
    const user = await this.usersRepo.findById(userId);
    if (!user) throw new NotFoundException("User not found");
    if (this.isMasterAdmin(user)) throw new ForbiddenException("Cannot block master admin");
    const ok = await this.usersRepo.setBlocked(userId, true);
    if (!ok) throw new NotFoundException("Failed to update user");
    await this.audit.log(adminId, "block_user", "profiles", userId, { blocked: true });
    return (await this.usersRepo.findById(userId))!;
  }

  async unblockUser(adminId: string, userId: string): Promise<AdminProfile> {
    const user = await this.usersRepo.findById(userId);
    if (!user) throw new NotFoundException("User not found");
    const ok = await this.usersRepo.setBlocked(userId, false);
    if (!ok) throw new NotFoundException("Failed to update user");
    await this.audit.log(adminId, "unblock_user", "profiles", userId, { blocked: false });
    return (await this.usersRepo.findById(userId))!;
  }

  async deleteUser(adminId: string, userId: string): Promise<{ deleted: true }> {
    const user = await this.usersRepo.findById(userId);
    if (!user) throw new NotFoundException("User not found");
    if (this.isMasterAdmin(user)) throw new ForbiddenException("Cannot delete master admin");
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) throw new NotFoundException(error.message);
    await this.audit.log(adminId, "delete_user", "profiles", userId, {});
    return { deleted: true };
  }

  async resetPassword(adminId: string, userId: string, newPassword: string): Promise<AdminProfile> {
    const user = await this.usersRepo.findById(userId);
    if (!user) throw new NotFoundException("User not found");
    if (this.isMasterAdmin(user)) throw new ForbiddenException("Cannot reset master admin password via this endpoint");
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.admin.updateUserById(userId, { password: newPassword });
    if (error) throw new NotFoundException(error.message);
    await this.audit.log(adminId, "reset_password", "profiles", userId, {});
    return user;
  }

  async updateRole(adminId: string, userId: string, role: string): Promise<AdminProfile> {
    const user = await this.usersRepo.findById(userId);
    if (!user) throw new NotFoundException("User not found");
    const normalizedRole = role?.toLowerCase();
    const allowedRoles = ["user", "store", "dermatologist"];
    if (normalizedRole === "admin") {
      if (!this.isMasterAdmin(user)) {
        throw new ForbiddenException("Only the master admin account may have the admin role");
      }
    } else if (!allowedRoles.includes(normalizedRole)) {
      throw new ForbiddenException("Invalid role");
    }
    if (this.isMasterAdmin(user) && normalizedRole !== "admin") {
      throw new ForbiddenException("Cannot change master admin role");
    }
    const ok = await this.usersRepo.setRole(userId, normalizedRole);
    if (!ok) throw new NotFoundException("Failed to update user role");
    await this.audit.log(adminId, "update_role", "profiles", userId, { role: normalizedRole });
    return (await this.usersRepo.findById(userId))!;
  }
}
