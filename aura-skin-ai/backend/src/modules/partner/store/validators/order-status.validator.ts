/**
 * Allowed order status transitions for store partner.
 * pending → confirmed | cancelled
 * confirmed → packed | cancelled
 * packed → shipped
 * shipped → delivered
 */

export const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["packed", "cancelled"],
  packed: ["shipped"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

export function isAllowedOrderStatusTransition(current: string, next: string): boolean {
  const allowed = ORDER_STATUS_TRANSITIONS[current];
  if (!allowed) return false;
  return allowed.includes(next);
}
