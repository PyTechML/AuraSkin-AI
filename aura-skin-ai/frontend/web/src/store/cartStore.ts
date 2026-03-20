import { create } from "zustand";

export interface CartItem {
  productId: string;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  addItem: (productId: string, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  addItem: (productId: string, quantity = 1) =>
    set((state) => {
      const qty = Math.max(1, Math.min(99, Math.floor(quantity)));
      const existing = state.items.find((i) => i.productId === productId);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.productId === productId
              ? { ...i, quantity: Math.min(99, i.quantity + qty) }
              : i
          ),
        };
      }
      return { items: [...state.items, { productId, quantity: qty }] };
    }),
  removeItem: (productId: string) =>
    set((state) => ({
      items: state.items.filter((i) => i.productId !== productId),
    })),
  updateQuantity: (productId: string, quantity: number) =>
    set((state) => {
      const qty = Math.max(0, Math.min(99, Math.floor(quantity)));
      if (qty === 0) {
        return { items: state.items.filter((i) => i.productId !== productId) };
      }
      return {
        items: state.items.map((i) =>
          i.productId === productId ? { ...i, quantity: qty } : i
        ),
      };
    }),
  clear: () => set({ items: [] }),
}));
