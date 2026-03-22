import type { Store } from "./index";

/** Public directory row from GET /api/stores (approved profile + approved inventory + LIVE products). */
export type PublicStore = Store & { totalProducts: number };

/** Admin governance list row — normalized from `store_profiles` via GET /admin/stores. */
export interface AdminStore {
  id: string;
  name: string;
  email?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  /** From store_profiles when present (display only). */
  city?: string | null;
  address?: string | null;
  storeDescription?: string | null;
  contact?: string | null;
}
