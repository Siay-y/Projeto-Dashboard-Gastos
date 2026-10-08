import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { daysInMonth, toDateKey, toMonthKey } from '../../shared/utils/date';
import { categoriesFor, findCategory } from '../constants/categories';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { Category } from '../domain/models';
import { RecurringExpenseService } from './recurring-expense.service';
import { StorageService } from './storage.service';
import { TransactionService } from './transaction.service';

export type BudgetStatus = 'ok' | 'near' | 'over';

export interface CategoryBudget {
  category: Category;
  limit: number;
  spent: number;
  projected: number;
  remaining: number;
  ratio: number;
  status: BudgetStatus;
  /** Ainda dentro do limite, mas o ritmo atual o estoura antes do fim do mês. */
  willExceed: boolean;
}

interface Spending {
  fixed: number;
  installments: number;
  variableAll: number;
  variableToDate: number;
}

const NEAR_RATIO = 0.8;

@Injectable({ providedIn: 'root' })
export class BudgetService {
  private readonly storage = inject(StorageService);
  private readonly transactions = inject(TransactionService);
  private readonly recurring = inject(RecurringExpenseService);

  private readonly now = new Date();
  private readonly today = toDateKey(this.now);
  private readonly currentMonth = toMonthKey(this.now);

  private readonly _limits = signal<Record<string, number>>(
    sanitize(this.storage.get<Record<string, number>>(STORAGE_KEYS.BUDGETS)),
  );

  readonly limits = this._limits.asReadonly();
  readonly hasLimits = computed(() => Object.keys(this._limits()).length > 0);

  readonly budgets = computed<CategoryBudget[]>(() => {
    const spending = this.spending();
    const day = this.now.getDate();
    const days = daysInMonth(this.now);

    return Object.entries(this._limits())
      .map(([id, limit]) => build(findCategory(id), limit, spending.get(id), day, days))
      .sort(
        (a, b) =>
          b.ratio - a.ratio || a.category.label.localeCompare(b.category.label, 'pt-BR'),
      );
  });

  readonly totals = computed(() =>
    this.budgets().reduce(
      (acc, b) => ({
        limit: acc.limit + b.limit,
        spent: acc.spent + b.spent,
        projected: acc.projected + b.projected,
      }),
      { limit: 0, spent: 0, projected: 0 },
    ),
  );

  readonly over = computed(() => this.budgets().filter((b) => b.status === 'over'));
  readonly willExceed = computed(() => this.budgets().filter((b) => b.willExceed));

  /** Categorias de gasto que ainda não têm limite. */
  readonly available = computed(() => {
    const limits = this._limits();
    return categoriesFor('expense').filter((c) => limits[c.id] === undefined);
  });

  constructor() {
    effect(() => {
      this.storage.set(STORAGE_KEYS.BUDGETS, this._limits());
    });
  }

  setLimit(categoryId: string, limit: number): void {
    const value = Math.round(limit * 100) / 100;
    if (!Number.isFinite(value) || value <= 0) return;

    this._limits.update((limits) => ({ ...limits, [categoryId]: value }));
  }

  removeLimit(categoryId: string): void {
    this._limits.update(({ [categoryId]: _removed, ...rest }) => rest);
  }

  private readonly spending = computed(() => {
    const map = new Map<string, Spending>();
    const entry = (id: string): Spending => {
      const found = map.get(id) ?? { fixed: 0, installments: 0, variableAll: 0, variableToDate: 0 };
      map.set(id, found);
      return found;
    };

    for (const item of this.recurring.active()) {
      entry(item.categoryId).fixed += item.amount;
    }

    for (const o of this.transactions.occurrences()) {
      if (o.transaction.type !== 'expense' || toMonthKey(o.date) !== this.currentMonth) continue;

      const found = entry(o.transaction.categoryId);
      if (o.installment) {
        found.installments += o.amount;
        continue;
      }

      found.variableAll += o.amount;
      if (o.date <= this.today) found.variableToDate += o.amount;
    }

    return map;
  });
}

function build(
  category: Category,
  limit: number,
  spending: Spending | undefined,
  day: number,
  days: number,
): CategoryBudget {
  const { fixed, installments, variableAll, variableToDate } = spending ?? {
    fixed: 0,
    installments: 0,
    variableAll: 0,
    variableToDate: 0,
  };

  // Mesma projeção da previsão do mês: fixos e parcelas são certos, o variável vem da média diária.
  const committed = fixed + installments;
  const spent = committed + variableAll;
  const projected = committed + Math.max(variableAll, (variableToDate / day) * days);

  const ratio = spent / limit;
  const status: BudgetStatus = spent > limit ? 'over' : ratio >= NEAR_RATIO ? 'near' : 'ok';

  return {
    category,
    limit,
    spent,
    projected,
    remaining: limit - spent,
    ratio,
    status,
    willExceed: status !== 'over' && projected > limit,
  };
}

function sanitize(raw: Record<string, number> | null): Record<string, number> {
  if (!raw) return {};

  const valid = new Set(categoriesFor('expense').map((c) => c.id));
  return Object.fromEntries(
    Object.entries(raw).filter(
      ([id, value]) => valid.has(id) && typeof value === 'number' && Number.isFinite(value) && value > 0,
    ),
  );
}
