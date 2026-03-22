import { create } from "zustand";
import type { Order } from "@/types";
import { getOrders as apiGetOrders, getOrderById as apiGetOrderById } from "@/services/api";
import { useAuthStore } from "./authStore";

interface OrdersState {
  orders: Order[];
  loading: boolean;
  fetchError: string | null;
  fetchOrders: (options?: { silent?: boolean }) => Promise<void>;
  getOrderById: (id: string) => Promise<Order | null>;
}

export const useOrdersStore = create<OrdersState>((set) => ({
  orders: [],
  loading: false,
  fetchError: null,
  fetchOrders: async (options) => {
    const silent = options?.silent === true;
    const user = useAuthStore.getState().user;
    if (!user) return;
    if (!silent) set({ loading: true, fetchError: null });
    try {
      const orders = await apiGetOrders(user.id);
      set({ orders, fetchError: null });
    } catch {
      if (silent) {
        set({ fetchError: null });
      } else {
        set({
          orders: [],
          fetchError: "Unable to load orders. Please try again.",
        });
      }
    } finally {
      if (!silent) set({ loading: false });
    }
  },
  getOrderById: async (id: string) => {
    const user = useAuthStore.getState().user;
    if (!user) return null;
    try {
      return await apiGetOrderById(id, user.id);
    } catch {
      return null;
    }
  },
}));
