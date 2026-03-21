export interface DermatologistEarningsTransaction {
  id: string;
  amount: number;
  date: string;
  status: string;
}

export interface DermatologistEarnings {
  totalRevenue: number;
  monthlyRevenue: number;
  completedConsultations: number;
  pendingPayout: number;
  recentTransactions: DermatologistEarningsTransaction[];
}
