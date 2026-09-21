/**
 * Gasto que se repete todo mês (assinatura, aluguel, academia…).
 * Não tem data: só o dia do mês em que costuma ser cobrado.
 */
export interface RecurringExpense {
  id: string;
  description: string;
  /** Sempre positivo, em reais. */
  amount: number;
  categoryId: string;
  /** Conta/cartão usado. `null` = não informado. */
  accountId: string | null;
  /** Dia de cobrança (1–31) ou `null` se não importa. */
  dueDay: number | null;
  /** Pausado = não conta nos totais, mas continua na lista. */
  active: boolean;
  /** ISO 8601 — quando foi cadastrado. */
  createdAt: string;
}
