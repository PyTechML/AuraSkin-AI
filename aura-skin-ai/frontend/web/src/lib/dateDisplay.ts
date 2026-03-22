/**
 * Safe date/time for UI. Returns "" when missing or invalid — use `safeFormatDateTime(d) || "—"`.
 */
export function safeFormatDateTime(iso?: string | null): string {
  if (iso == null || typeof iso !== "string" || iso.trim() === "") return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString();
}

export function safeFiniteNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
