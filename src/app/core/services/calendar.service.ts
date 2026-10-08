import { Injectable, inject } from '@angular/core';
import { findCategory } from '../constants/categories';
import { Category } from '../domain/models';
import { addMonthsClamped, daysInMonth, fromDateKey, toDateKey, toMonthKey } from '../../shared/utils/date';
import { RecurringExpenseService } from './recurring-expense.service';
import { TransactionService } from './transaction.service';

export type CalendarEventKind = 'fixed' | 'installment' | 'expense' | 'income';

export interface CalendarEvent {
  id: string;
  date: string;
  kind: CalendarEventKind;
  label: string;
  detail: string | null;
  amount: number;
  category: Category;
}

export interface CalendarDay {
  date: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
  outflow: number;
  inflow: number;
}

@Injectable({ providedIn: 'root' })
export class CalendarService {
  private readonly transactions = inject(TransactionService);
  private readonly recurring = inject(RecurringExpenseService);

  eventsFor(month: string): CalendarEvent[] {
    const events = [...this.fixedFor(month), ...this.installmentsFor(month), ...this.entriesFor(month)];
    return events.sort((a, b) => a.date.localeCompare(b.date) || b.amount - a.amount);
  }

  gridFor(month: string): CalendarDay[] {
    const first = fromDateKey(`${month}-01`);
    const start = new Date(first);
    start.setDate(1 - first.getDay());

    const total = daysInMonth(first);
    const weeks = Math.ceil((first.getDay() + total) / 7);

    const byDate = new Map<string, CalendarEvent[]>();
    for (const e of this.eventsFor(month)) {
      byDate.set(e.date, [...(byDate.get(e.date) ?? []), e]);
    }

    const today = toDateKey();
    const days: CalendarDay[] = [];

    for (let i = 0; i < weeks * 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const key = toDateKey(date);
      const events = byDate.get(key) ?? [];

      days.push({
        date: key,
        day: date.getDate(),
        inMonth: toMonthKey(key) === month,
        isToday: key === today,
        events,
        outflow: events.filter((e) => e.kind !== 'income').reduce((s, e) => s + e.amount, 0),
        inflow: events.filter((e) => e.kind === 'income').reduce((s, e) => s + e.amount, 0),
      });
    }
    return days;
  }

  private fixedFor(month: string): CalendarEvent[] {
    const last = daysInMonth(fromDateKey(`${month}-01`));

    return this.recurring
      .active()
      .filter((r) => r.dueDay !== null)
      .map((r) => ({
        id: `fixed:${r.id}`,
        date: `${month}-${String(Math.min(r.dueDay!, last)).padStart(2, '0')}`,
        kind: 'fixed' as const,
        label: r.description,
        detail: 'Gasto fixo',
        amount: r.amount,
        category: findCategory(r.categoryId),
      }));
  }

  private installmentsFor(month: string): CalendarEvent[] {
    const events: CalendarEvent[] = [];

    for (const t of this.transactions.transactions()) {
      if (!t.installments || t.installments < 2) continue;

      for (let i = 0; i < t.installments; i++) {
        const date = addMonthsClamped(t.date, i);
        const key = toMonthKey(date);
        if (key < month) continue;
        if (key > month) break;

        events.push({
          id: `installment:${t.id}#${i}`,
          date,
          kind: 'installment',
          label: t.description,
          detail: `Parcela ${i + 1}/${t.installments}`,
          amount: t.amount,
          category: findCategory(t.categoryId),
        });
      }
    }
    return events;
  }

  private entriesFor(month: string): CalendarEvent[] {
    return this.transactions
      .transactions()
      .filter((t) => (!t.installments || t.installments < 2) && toMonthKey(t.date) === month)
      .map((t) => ({
        id: `entry:${t.id}`,
        date: t.date,
        kind: t.type === 'income' ? ('income' as const) : ('expense' as const),
        label: t.description,
        detail: null,
        amount: t.amount,
        category: findCategory(t.categoryId),
      }));
  }
}
