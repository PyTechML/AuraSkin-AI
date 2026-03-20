import { Controller, Get, Post, Delete, UseGuards, Req, Param, Body, Query } from "@nestjs/common";
import { Request } from "express";
import { AuthGuard, AuthenticatedUser } from "../../../shared/guards/auth.guard";
import { RoleGuard, ROLES_KEY } from "../../../shared/guards/role.guard";
import { SetMetadata } from "@nestjs/common";
import type { BackendRole } from "../../../shared/constants/roles";
import { AdminAiManagementService } from "../services/ai-management.service";
import { formatSuccess } from "../../../shared/utils/responseFormatter";
import { Throttle } from "@nestjs/throttler";
import { CreateAiRuleDto } from "../dto/ai-rule.dto";
import { AiUsageQueryDto } from "../dto/ai-usage-query.dto";

const RequireAdmin = () => SetMetadata(ROLES_KEY, ["admin"] as BackendRole[]);

@Controller("admin")
@UseGuards(AuthGuard, RoleGuard)
@RequireAdmin()
@Throttle({ default: { limit: 200, ttl: 60_000 } })
export class AdminAiManagementController {
  constructor(private readonly aiManagementService: AdminAiManagementService) {}

  @Get("ai/rules")
  async getRules() {
    const data = await this.aiManagementService.getRules();
    return formatSuccess(data);
  }

  @Post("ai/rules")
  async createRule(@Req() req: Request, @Body() body: CreateAiRuleDto) {
    const user = req.user as AuthenticatedUser;
    const data = await this.aiManagementService.createRule(
      user.id,
      body.rule_type,
      body.rule_value
    );
    return formatSuccess(data);
  }

  @Delete("ai/rules/:id")
  async deleteRule(@Req() req: Request, @Param("id") id: string) {
    const user = req.user as AuthenticatedUser;
    await this.aiManagementService.deleteRule(user.id, id);
    return formatSuccess({ deleted: id });
  }

  @Get("ai/usage")
  async getUsage(@Query() query: AiUsageQueryDto) {
    const data = await this.aiManagementService.getUsageLogs({
      user_id: query.user,
      model: query.model,
      date_from: query.date_from,
      date_to: query.date_to,
    });
    return formatSuccess(data);
  }
}
