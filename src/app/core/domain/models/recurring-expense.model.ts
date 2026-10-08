export interface RecurringExpense {
  id: string;
  description: string;
  amount: number;
  categoryId: string;
  accountId: string | null;
  dueDay: number | null;
  active: boolean;
  createdAt: string;
}
