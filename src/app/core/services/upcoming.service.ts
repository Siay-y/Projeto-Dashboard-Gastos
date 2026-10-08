import { Injectable, computed, inject } from '@angular/core';
import { getInstallmentProgress } from '../domain/installments';
import { daysBetween, daysInMonth, toDateKey } from '../../shared/utils/date';
import { RecurringExpenseService } from './recurring-expense.service';
import { TransactionService } from './transaction.service';

export interface UpcomingItem {
  id: string;
  kind: 'fixed' | 'installment';

  label: string;

  detail: string | null;
  amount: number;

  days: number;

  date: string;
}

@Injectable({ providedIn: 'root' })
export class UpcomingService {
  private readonly transactions = inject(TransactionService);
  private readonly recurring = inject(RecurringExpenseService);

  private readonly now = new Date();
  private readonly today = toDateKey(this.now);

  readonly items = computed<UpcomingItem[]>(() =>
    [...this.fromRecurring(), ...this.fromInstallments()].sort(
      (a, b) => a.days - b.days || a.label.localeCompare(b.label, 'pt-BR'),
    ),
  );

  private fromRecurring(): UpcomingItem[] {
    const day = this.now.getDate();
    const inThisMonth = daysInMonth(this.now);
    const next = new Date(this.now.getFullYear(), this.now.getMonth() + 1, 1);
    const inNextMonth = daysInMonth(next);

    return this.recurring
      .active()
      .filter((r) => r.dueDay !== null)
      .map((r) => {
        const dueDay = r.dueDay!;

        // Dia 31 em mês de 30 cai no último dia; se já passou, vale o mês seguinte.
        const thisMonthDay = Math.min(dueDay, inThisMonth);
        const date =
          thisMonthDay >= day
            ? new Date(this.now.getFullYear(), this.now.getMonth(), thisMonthDay)
            : new Date(next.getFullYear(), next.getMonth(), Math.min(dueDay, inNextMonth));
        const dateKey = toDateKey(date);

        return {
          id: `fixed:${r.id}`,
          kind: 'fixed' as const,
          label: r.description,
          detail: null,
          amount: r.amount,
          days: daysBetween(this.today, dateKey),
          date: dateKey,
        };
      });
  }

  private fromInstallments(): UpcomingItem[] {
    const items: UpcomingItem[] = [];

    for (const t of this.transactions.transactions()) {
      const progress = getInstallmentProgress(t, this.today);
      if (!progress?.nextDate) continue;

      items.push({
        id: `installment:${t.id}`,
        kind: 'installment',
        label: t.description,
        detail: `Parcela ${progress.paid + 1}/${progress.count}`,
        amount: t.amount,
        days: daysBetween(this.today, progress.nextDate),
        date: progress.nextDate,
      });
    }
    return items;
  }
}
