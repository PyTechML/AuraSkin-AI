/**
 * Allowed order status transitions for store partner.
 * pending/placed → confirmed | cancelled | cancel_requested
 * confirmed → packed | cancelled
 * packed → shipped
 * shipped → out_for_delivery | delivered
 * out_for_delivery → delivered
 * delivered → return_requested
 * return_requested → refunded
 */

export const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled", "cancel_requested"],
  placed: ["confirmed", "cancel_requested", "cancelled"],
  confirmed: ["packed", "cancel_requested", "cancelled"],
  packed: ["shipped"],
  shipped: ["out_for_delivery", "delivered"],
  out_for_delivery: ["delivered"],
  delivered: ["return_requested"],
  cancel_requested: ["cancelled"],
  return_requested: ["refunded"],
  refunded: [],
  cancelled: [],
};

export function isAllowedOrderStatusTransition(current: string, next: string): boolean {
  const allowed = ORDER_STATUS_TRANSITIONS[current];
  if (!allowed) return false;
  return allowed.includes(next);
}
