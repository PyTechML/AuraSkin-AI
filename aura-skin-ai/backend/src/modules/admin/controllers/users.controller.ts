import { Controller, Get, Put, Delete, UseGuards, Req, Param, Body } from "@nestjs/common";
import { Request } from "express";
import { AuthGuard, AuthenticatedUser } from "../../../shared/guards/auth.guard";
import { RoleGuard, ROLES_KEY } from "../../../shared/guards/role.guard";
import { SetMetadata } from "@nestjs/common";
import type { BackendRole } from "../../../shared/constants/roles";
import { AdminUsersService } from "../services/users.service";
import { formatSuccess } from "../../../shared/utils/responseFormatter";
import { Throttle } from "@nestjs/throttler";

const RequireAdmin = () => SetMetadata(ROLES_KEY, ["admin"] as BackendRole[]);

@Controller("admin")
@UseGuards(AuthGuard, RoleGuard)
@RequireAdmin()
@Throttle({ default: { limit: 200, ttl: 60_000 } })
export class AdminUsersController {
  constructor(private readonly usersService: AdminUsersService) {}

  @Get("users")
  async getUsers() {
    const data = await this.usersService.getAll();
    return formatSuccess(data);
  }

  @Get("users/:id")
  async getUserById(@Param("id") id: string) {
    const data = await this.usersService.getById(id);
    return formatSuccess(data);
  }

  @Put("users/block/:id")
  async blockUser(@Req() req: Request, @Param("id") id: string) {
    const user = req.user as AuthenticatedUser;
    const data = await this.usersService.blockUser(user.id, id);
    return formatSuccess(data);
  }

  @Put("users/unblock/:id")
  async unblockUser(@Req() req: Request, @Param("id") id: string) {
    const user = req.user as AuthenticatedUser;
    const data = await this.usersService.unblockUser(user.id, id);
    return formatSuccess(data);
  }

  @Delete("users/:id")
  async deleteUser(@Req() req: Request, @Param("id") id: string) {
    const admin = req.user as AuthenticatedUser;
    const data = await this.usersService.deleteUser(admin.id, id);
    return formatSuccess(data);
  }

  @Put("users/:id")
  async updateUser(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: { role?: string }
  ) {
    const admin = req.user as AuthenticatedUser;
    if (body?.role != null && typeof body.role === "string") {
      const data = await this.usersService.updateRole(admin.id, id, body.role);
      return formatSuccess(data);
    }
    return { statusCode: 400, message: "role is required" };
  }

  @Put("users/:id/reset-password")
  async resetPassword(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() body: { password: string }
  ) {
    const admin = req.user as AuthenticatedUser;
    const password = body?.password;
    if (!password || typeof password !== "string" || password.length < 8) {
      return { statusCode: 400, message: "Password must be at least 8 characters" };
    }
    const data = await this.usersService.resetPassword(admin.id, id, password);
    return formatSuccess(data);
  }
}
