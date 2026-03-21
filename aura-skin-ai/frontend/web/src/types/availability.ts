export type SlotStatus = "available" | "booked" | "blocked";

export type NormalizedSlot = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: SlotStatus;
  consultationId?: string;
};

export type CreateDermatologistSlotPayload = {
  date: string;
  startTime: string;
  endTime: string;
  status?: SlotStatus;
};

export type UpdateDermatologistSlotPayload = Partial<CreateDermatologistSlotPayload>;
