const VAGUE_MESSAGE =
  /^(system updated|item modified)$/i;

/** Matches backend-style lines like "Order <uuid>" or "Report <uuid>" (opaque id only). */
function isOpaqueOrderOrReportLine(msg: string, typeKeyVal: string): boolean {
  const t = msg.trim();
  if (!t) return true;
  if (typeKeyVal === "order" && /^order\s+[\w-]{8,}$/i.test(t)) return true;
  if (typeKeyVal === "report" && /^report\s+[\w-]{8,}$/i.test(t)) return true;
  return false;
}

/** Alphanumeric-only key so snake_case, camelCase, and spaced labels match one map. */
function typeKey(type: string): string {
  return type.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function titleFromTypeKey(key: string): string | null {
  const map: Record<string, string> = {
    order: "New order",
    report: "Assessment report",
    storeapproved: "Store approved",
    dermatologistverified: "Dermatologist verified",
    productapproved: "Product approved",
    ruleupdated: "Rule updated",
    inventoryapproved: "Product approved",
    storerejected: "Store rejected",
    productrejected: "Product rejected",
  };
  return map[key] ?? null;
}

/**
 * Primary line for admin activity timeline: clear event description, no vague defaults.
 */
export function getAdminActivityTimelineTitle(item: {
  type: string;
  message: string;
}): string {
  const key = typeKey(item.type ?? "");
  const msg = (item.message ?? "").trim();

  if (msg && !VAGUE_MESSAGE.test(msg) && !isOpaqueOrderOrReportLine(msg, key)) {
    return msg;
  }

  const fromType = titleFromTypeKey(key);
  if (fromType) return fromType;

  return "Unknown activity";
}
