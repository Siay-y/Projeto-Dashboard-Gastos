export interface RecurringExpense {
  id: string;
  description: string;
  amount: number;
  categoryId: string;
  bankId: string | null;
  methodId: string | null;
  dueDay: number | null;
  active: boolean;
  createdAt: string;
}
