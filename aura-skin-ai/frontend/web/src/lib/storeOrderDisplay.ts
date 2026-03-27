import type { Order } from "@/types";
import { getNextOrderStatuses } from "@/services/apiPartner";

/** Heuristic: show internal ref only for long opaque ids (e.g. UUID), not short placeholders. */
function shouldShowUserRef(userId: string): boolean {
  const t = userId.trim();
  if (t.length < 20) return false;
  if (/^[0-9a-f-]{36}$/i.test(t)) return true;
  return t.length >= 32;
}

export function formatOrderStatusLabel(status: string): string {
  return status
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export interface StoreCustomerDisplay {
  primary: string;
  refNote?: string;
}

export function formatStoreCustomerDisplay(
  order: Pick<Order, "customerName" | "userId">
): StoreCustomerDisplay {
  const name = order.customerName?.trim();
  if (name) {
    return { primary: name };
  }
  const uid = order.userId?.trim() ?? "";
  const ref =
    uid && shouldShowUserRef(uid) ? (uid.length > 8 ? uid.slice(-8) : uid) : undefined;
  return {
    primary: "Name not provided",
    ...(ref ? { refNote: `Ref · ${ref}` } : {}),
  };
}

export function csvCustomerNameColumn(order: Pick<Order, "customerName">): string {
  const name = order.customerName?.trim();
  if (name) return name;
  return "Name not provided";
}

/** Read-only hint for the next allowed transition (first option from getNextOrderStatuses). */
export function nextFulfillmentStepLabel(status: Order["status"]): string | null {
  const next = getNextOrderStatuses(status);
  if (!next.length) return null;
  return `Next: ${formatOrderStatusLabel(next[0])}`;
}
