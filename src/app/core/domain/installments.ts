import { addMonthsClamped, toDateKey } from '../../shared/utils/date';
import { Transaction } from './models';

export interface InstallmentProgress {
  /** Parcelas cujo vencimento já chegou (avança sozinho com a data). */
  paid: number;
  count: number;
  remaining: number;
  /** Data da próxima parcela (`YYYY-MM-DD`) ou `null` se quitada. */
  nextDate: string | null;
  total: number;
}

/**
 * Progresso de uma compra parcelada em relação a `today`.
 * Parcela k vence em `date + (k − 1) meses`, no mesmo dia (ajustado ao fim do mês).
 * Retorna `null` para compras à vista.
 */
export function getInstallmentProgress(
  t: Transaction,
  today: string = toDateKey(),
): InstallmentProgress | null {
  if (!t.installments || t.installments < 2) return null;

  const count = t.installments;
  let paid = 0;
  let nextDate: string | null = null;

  for (let i = 0; i < count; i++) {
    const due = addMonthsClamped(t.date, i);
    if (due <= today) {
      paid++;
    } else {
      nextDate = due;
      break;
    }
  }

  return {
    paid,
    count,
    remaining: count - paid,
    nextDate,
    total: Math.round(t.amount * count * 100) / 100,
  };
}
