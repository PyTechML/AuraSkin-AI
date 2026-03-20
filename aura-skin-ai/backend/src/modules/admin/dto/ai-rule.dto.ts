import { IsIn, IsString, MaxLength, MinLength } from "class-validator";

const RULE_TYPES = ["blocked_keywords", "rate_limit", "query_limit"] as const;
export type AiRuleType = (typeof RULE_TYPES)[number];

export class CreateAiRuleDto {
  @IsIn(RULE_TYPES, { message: "rule_type must be one of: blocked_keywords, rate_limit, query_limit" })
  rule_type!: AiRuleType;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  rule_value!: string;
}
