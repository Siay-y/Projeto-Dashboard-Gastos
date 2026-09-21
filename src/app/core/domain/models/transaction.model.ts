export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  description: string;
  /**
   * Sempre positivo, em reais. O sinal é dado pelo `type`.
   * Em compras parceladas, é o valor de CADA parcela.
   */
  amount: number;
  categoryId: string;
  /** Conta/cartão usado. `null` = não informado. */
  accountId: string | null;
  /**
   * Número de parcelas (≥ 2) ou `null` para compra à vista.
   * A 1ª parcela vence em `date`; as seguintes, no mesmo dia dos meses seguintes.
   */
  installments: number | null;
  /** Data da transação (ou da 1ª parcela) no formato `YYYY-MM-DD`. */
  date: string;
  /** ISO 8601 — quando foi registrada. */
  createdAt: string;
}

/**
 * Uma "cobrança" concreta derivada de uma transação.
 * Compra à vista → 1 ocorrência. Parcelada em N → até N ocorrências (uma por mês).
 */
export interface TransactionOccurrence {
  /** `${transaction.id}#${index}` — estável para `track`. */
  key: string;
  transaction: Transaction;
  /** Data desta cobrança (`YYYY-MM-DD`). */
  date: string;
  amount: number;
  /** Presente apenas em parceladas. `number` começa em 1. */
  installment: { number: number; count: number; paid: boolean } | null;
}
