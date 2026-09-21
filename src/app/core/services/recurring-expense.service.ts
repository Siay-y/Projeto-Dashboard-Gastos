import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { RecurringExpense } from '../domain/models';
import { StorageService } from './storage.service';

export type RecurringExpenseInput = Omit<RecurringExpense, 'id' | 'createdAt' | 'active'>;

/**
 * Gastos fixos mensais. Os ativos entram automaticamente nos gastos de todo mês.
 */
@Injectable({ providedIn: 'root' })
export class RecurringExpenseService {
  private readonly storage = inject(StorageService);

  private readonly _items = signal<RecurringExpense[]>(
    (this.storage.get<Partial<RecurringExpense>[]>(STORAGE_KEYS.RECURRING_EXPENSES) ?? []).map(
      (raw) => ({ ...(raw as RecurringExpense), accountId: raw.accountId ?? null }),
    ),
  );

  /** Todos, ordenados por dia de cobrança (sem dia por último) e descrição. */
  readonly items = computed(() =>
    [...this._items()].sort(
      (a, b) =>
        (a.dueDay ?? 32) - (b.dueDay ?? 32) || a.description.localeCompare(b.description, 'pt-BR'),
    ),
  );

  readonly hasItems = computed(() => this._items().length > 0);
  readonly active = computed(() => this.items().filter((i) => i.active));
  readonly activeCount = computed(() => this.active().length);

  /** Soma dos gastos fixos ativos — o que sai todo mês. */
  readonly monthlyTotal = computed(() => this.active().reduce((acc, i) => acc + i.amount, 0));

  constructor() {
    effect(() => {
      this.storage.set(STORAGE_KEYS.RECURRING_EXPENSES, this._items());
    });
  }

  add(input: RecurringExpenseInput): RecurringExpense {
    const item: RecurringExpense = {
      ...this.normalize(input),
      id: crypto.randomUUID(),
      active: true,
      createdAt: new Date().toISOString(),
    };
    this._items.update((list) => [...list, item]);
    return item;
  }

  update(id: string, input: RecurringExpenseInput): void {
    this._items.update((list) =>
      list.map((i) => (i.id === id ? { ...i, ...this.normalize(input) } : i)),
    );
  }

  setActive(id: string, active: boolean): void {
    this._items.update((list) => list.map((i) => (i.id === id ? { ...i, active } : i)));
  }

  remove(id: string): void {
    this._items.update((list) => list.filter((i) => i.id !== id));
  }

  private normalize(input: RecurringExpenseInput): RecurringExpenseInput {
    return {
      ...input,
      description: input.description.trim(),
      amount: Math.round(Math.abs(input.amount) * 100) / 100,
      accountId: input.accountId || null,
      dueDay: input.dueDay ? Math.min(31, Math.max(1, Math.round(input.dueDay))) : null,
    };
  }
}
