import { Injectable, NotFoundException } from "@nestjs/common";
import {
  AdminAiManagementRepository,
  type AiChatbotRuleRow,
  type AiUsageLogRow,
} from "../repositories/ai-management.repository";
import { AuditService } from "./audit.service";
import type { AiRuleType } from "../dto/ai-rule.dto";

@Injectable()
export class AdminAiManagementService {
  constructor(
    private readonly aiRepo: AdminAiManagementRepository,
    private readonly audit: AuditService
  ) {}

  async getRules(): Promise<AiChatbotRuleRow[]> {
    return this.aiRepo.findAllRules();
  }

  async createRule(
    adminId: string,
    ruleType: AiRuleType,
    ruleValue: string
  ): Promise<AiChatbotRuleRow> {
    const row = await this.aiRepo.createRule(ruleType, ruleValue);
    if (!row) throw new NotFoundException("Failed to create rule");
    await this.audit.log(adminId, "create_ai_rule", "ai_chatbot_rules", row.id, {
      rule_type: ruleType,
    });
    return row;
  }

  async deleteRule(adminId: string, ruleId: string): Promise<void> {
    const ok = await this.aiRepo.deleteRule(ruleId);
    if (!ok) throw new NotFoundException("Rule not found or already deleted");
    await this.audit.log(adminId, "delete_ai_rule", "ai_chatbot_rules", ruleId, {});
  }

  async getUsageLogs(filters: {
    user_id?: string;
    model?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<AiUsageLogRow[]> {
    return this.aiRepo.findUsageLogs(filters);
  }
}
