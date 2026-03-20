import { create } from "zustand";

interface AdminSidebarState {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

export const useAdminSidebarStore = create<AdminSidebarState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
}));
