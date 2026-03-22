export interface AdminRule {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const ADMIN_RULE_TYPES = [
  "blocked_keywords",
  "rate_limit",
  "query_limit",
] as const;

export type AdminRuleType = (typeof ADMIN_RULE_TYPES)[number];

export interface CreateAdminRulePayload {
  rule_type: AdminRuleType;
  rule_value: string;
}
