import { create } from "zustand";
import type { Order } from "@/types";
import { createOrder as apiCreateOrder, getOrders as apiGetOrders, getOrderById as apiGetOrderById } from "@/services/api";
import { useAuthStore } from "./authStore";

interface OrdersState {
  orders: Order[];
  loading: boolean;
  fetchError: string | null;
  fetchOrders: () => Promise<void>;
  createOrder: (items: { productId: string; productName: string; quantity: number; price: number }[]) => Promise<Order | null>;
  getOrderById: (id: string) => Promise<Order | null>;
}

export const useOrdersStore = create<OrdersState>((set, get) => ({
  orders: [],
  loading: false,
  fetchError: null,
  fetchOrders: async () => {
    const user = useAuthStore.getState().user;
    if (!user) return;
    set({ loading: true, fetchError: null });
    try {
      const orders = await apiGetOrders(user.id);
      set({ orders, fetchError: null });
    } catch {
      set({ orders: [], fetchError: "Unable to load orders. Please try again." });
    } finally {
      set({ loading: false });
    }
  },
  createOrder: async (items) => {
    const user = useAuthStore.getState().user;
    if (!user) return null;
    try {
      const order = await apiCreateOrder(user.id, items);
      set((s) => ({ orders: [order, ...s.orders] }));
      return order;
    } catch {
      return null;
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
