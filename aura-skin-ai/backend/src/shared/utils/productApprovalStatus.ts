import { BadRequestException } from "@nestjs/common";

export type DbProductApprovalStatus = "DRAFT" | "PENDING" | "LIVE" | "REJECTED";

/**
 * Maps UI/legacy/DB-drift values to canonical `products.approval_status` CHECK values.
 */
export function normalizeDbProductApprovalStatus(
  raw: string | undefined | null
): DbProductApprovalStatus {
  if (raw == null) {
    throw new BadRequestException("approval_status is required");
  }
  const s = String(raw).trim();
  if (!s) {
    throw new BadRequestException("approval_status cannot be empty");
  }
  const compact = s.replace(/\s+/g, "_");
  const upper = compact.toUpperCase();

  if (upper === "DRAFT" || upper === "DRAFTS") return "DRAFT";
  if (
    upper === "PENDING" ||
    upper === "SUBMITTED_FOR_REVIEW" ||
    upper === "SUBMITTED" ||
    upper === "SUBMITTEDFORREVIEW"
  ) {
    return "PENDING";
  }
  if (upper === "LIVE" || upper === "APPROVED" || upper === "APPROVE") return "LIVE";
  if (upper === "REJECTED" || upper === "REJECT") return "REJECTED";

  const lower = s.toLowerCase();
  if (lower === "draft") return "DRAFT";
  if (lower === "pending" || lower === "submitted") return "PENDING";
  if (lower === "live" || lower === "approved") return "LIVE";
  if (lower === "rejected") return "REJECTED";

  throw new BadRequestException(
    `Invalid approval_status "${raw}". Use DRAFT, PENDING, LIVE, or REJECTED.`
  );
}

/**
 * Partner create flow only allows draft or pending listings.
 */
export function normalizePartnerCreateApprovalStatus(
  raw: string | undefined
): "DRAFT" | "PENDING" {
  if (raw == null || String(raw).trim() === "") return "PENDING";
  try {
    const n = normalizeDbProductApprovalStatus(raw);
    if (n === "DRAFT") return "DRAFT";
    return "PENDING";
  } catch {
    return "PENDING";
  }
}
