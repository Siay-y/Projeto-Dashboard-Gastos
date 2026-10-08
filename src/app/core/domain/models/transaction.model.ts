export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  description: string;
  amount: number;
  categoryId: string;
  accountId: string | null;
  installments: number | null;
  date: string;
  createdAt: string;
}

export interface TransactionOccurrence {
  key: string;
  transaction: Transaction;
  date: string;
  amount: number;
  installment: { number: number; count: number; paid: boolean } | null;
}
