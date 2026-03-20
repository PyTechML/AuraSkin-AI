import { create } from "zustand";
import type { ConsultationBooking } from "@/types";
import {
  createBooking as apiCreateBooking,
  getBookings as apiGetBookings,
} from "@/services/api";
import { useAuthStore } from "./authStore";

interface BookingsState {
  bookings: ConsultationBooking[];
  loading: boolean;
  fetchBookings: () => Promise<void>;
  createBooking: (
    dermatologistId: string,
    dermatologistName: string,
    date: string,
    timeSlot: string
  ) => Promise<ConsultationBooking | null>;
}

export const useBookingsStore = create<BookingsState>((set) => ({
  bookings: [],
  loading: false,
  fetchBookings: async () => {
    const user = useAuthStore.getState().user;
    if (!user) return;
    set({ loading: true });
    try {
      const bookings = await apiGetBookings(user.id);
      set({ bookings });
    } finally {
      set({ loading: false });
    }
  },
  createBooking: async (dermatologistId, dermatologistName, date, timeSlot) => {
    const user = useAuthStore.getState().user;
    if (!user) return null;
    try {
      const booking = await apiCreateBooking(
        user.id,
        dermatologistId,
        dermatologistName,
        date,
        timeSlot
      );
      set((s) => ({ bookings: [booking, ...s.bookings] }));
      return booking;
    } catch {
      return null;
    }
  },
}));
