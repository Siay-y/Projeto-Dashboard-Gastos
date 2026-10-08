import { addMonthsClamped, toDateKey } from '../../shared/utils/date';
import { Transaction } from './models';

export interface InstallmentProgress {
  paid: number;
  count: number;
  remaining: number;
  nextDate: string | null;
  total: number;
}

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
    // Parcela k vence em `date + (k-1) meses`: o progresso avança sozinho com a data.
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
