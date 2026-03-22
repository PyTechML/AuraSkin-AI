/** Store panel: customers derived from orders + profiles (API response shape, camelCase). */

export interface AssignedUserListItemDto {
  id: string;
  name: string;
  email: string | null;
  totalOrders: number;
  lastOrderDate: string;
  totalSpend: number;
  status: string;
}

export interface AssignedUserPurchaseDto {
  orderId: string;
  date: string;
  total: number;
}

export interface AssignedUserDetailDto extends AssignedUserListItemDto {
  /** Same as lastOrderDate; included for client AssignedUserDetail. */
  lastPurchase: string;
  purchaseHistory: AssignedUserPurchaseDto[];
  consultationHistory: { bookingId: string; date: string; dermatologistName: string }[];
  notes: string;
  lifetimeValue: number;
  activityTimeline: { id: string; type: string; title: string; date: string }[];
}
