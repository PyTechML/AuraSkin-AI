import { create } from "zustand";
import { getPartnerStoreId } from "@/services/apiPartner";

interface PartnerState {
  /** Resolved store ID for the current partner (for order/inventory scope). */
  storeId: string | null;
  /** Whether this partner has dermatology/linked dermatologist (show Bookings). */
  dermatologyLinked: boolean;
  /** Set partner context from auth user id and role. */
  setPartnerContext: (userId: string, role: string) => void;
}

export const usePartnerStore = create<PartnerState>((set) => ({
  storeId: null,
  dermatologyLinked: false,
  setPartnerContext: (userId: string, role: string) => {
    let storeId: string | null = null;
    try {
      storeId = getPartnerStoreId(userId, role);
    } catch {
      storeId = null;
    }
    const dermatologyLinked = role === "DERMATOLOGIST" || role === "STORE";
    set({ storeId, dermatologyLinked });
  },
}));
