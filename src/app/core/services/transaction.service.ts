import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { Transaction, TransactionOccurrence } from '../domain/models';
import { FinanceSettingsService } from './finance-settings.service';
import { RecurringExpenseService } from './recurring-expense.service';
import { StorageService } from './storage.service';
import { addMonthsClamped, toDateKey, toMonthKey } from '../../shared/utils/date';

/** Dados necessários para criar/editar uma transação. */
export type TransactionInput = Omit<Transaction, 'id' | 'createdAt'>;

/**
 * Estado das transações e totais mensais derivados.
 *
 * O histórico mostra uma linha por compra. Para os TOTAIS, compras parceladas
 * são expandidas em uma "ocorrência" por mês (até o mês atual), de modo que
 * cada mês conte apenas a parcela que vence nele.
 * O saldo total NÃO é calculado aqui — é informado pelo usuário (FinanceSettingsService).
 */
@Injectable({ providedIn: 'root' })
export class TransactionService {
  private readonly storage = inject(StorageService);
  private readonly settings = inject(FinanceSettingsService);
  private readonly recurring = inject(RecurringExpenseService);

  private readonly today = toDateKey();
  private readonly currentMonth = toMonthKey(new Date());

  private readonly _transactions = signal<Transaction[]>(
    (this.storage.get<Partial<Transaction>[]>(STORAGE_KEYS.TRANSACTIONS) ?? []).map(migrate),
  );

  /** Mês de referência (`YYYY-MM`) usado nos totais mensais. */
  readonly referenceMonth = signal(this.currentMonth);

  /** Transações brutas (uma por compra), mais recentes primeiro. */
  readonly transactions = computed(() =>
    [...this._transactions()].sort(
      (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
    ),
  );

  readonly hasTransactions = computed(() => this._transactions().length > 0);

  /**
   * Cobranças efetivas até o mês atual (base dos totais mensais).
   * À vista → 1 ocorrência. Parcelada → uma por mês já iniciado.
   */
  readonly occurrences = computed<TransactionOccurrence[]>(() =>
    this.transactions().flatMap((t) => this.expand(t)),
  );

  /** Ocorrências do mês de referência. */
  readonly monthOccurrences = computed(() => {
    const month = this.referenceMonth();
    return this.occurrences().filter((o) => toMonthKey(o.date) === month);
  });

  /** Renda fixa informada pelo usuário (conta em todo mês). */
  readonly monthlyFixedIncome = computed(() => this.settings.monthlyIncome());

  /** Entradas lançadas manualmente no mês de referência. */
  readonly monthlyExtraIncome = computed(() => this.sumByType(this.monthOccurrences(), 'income'));

  readonly monthlyIncome = computed(() => this.monthlyFixedIncome() + this.monthlyExtraIncome());

  /** Gastos fixos ativos (assinaturas, aluguel…) — contam em todo mês. */
  readonly monthlyFixedExpenses = computed(() => this.recurring.monthlyTotal());

  /** Gastos lançados manualmente no mês de referência (parcelas do mês inclusas). */
  readonly monthlyVariableExpenses = computed(() =>
    this.sumByType(this.monthOccurrences(), 'expense'),
  );

  readonly monthlyExpenses = computed(
    () => this.monthlyFixedExpenses() + this.monthlyVariableExpenses(),
  );

  readonly monthlyIncomeCount = computed(
    () => this.monthOccurrences().filter((o) => o.transaction.type === 'income').length,
  );
  readonly monthlyExpenseCount = computed(
    () => this.monthOccurrences().filter((o) => o.transaction.type === 'expense').length,
  );

  constructor() {
    // Persiste automaticamente a cada mudança no estado.
    effect(() => {
      this.storage.set(STORAGE_KEYS.TRANSACTIONS, this._transactions());
    });
  }

  // ---- Escrita ----

  add(input: TransactionInput): Transaction {
    const transaction: Transaction = {
      ...this.normalize(input),
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };

    this._transactions.update((list) => [...list, transaction]);
    return transaction;
  }

  update(id: string, input: TransactionInput): void {
    this._transactions.update((list) =>
      list.map((t) => (t.id === id ? { ...t, ...this.normalize(input) } : t)),
    );
  }

  remove(id: string): void {
    this._transactions.update((list) => list.filter((t) => t.id !== id));
  }

  // ---- Auxiliares ----

  /** Gera as ocorrências de uma transação até o mês atual. */
  private expand(t: Transaction): TransactionOccurrence[] {
    if (!t.installments || t.installments < 2) {
      return [{ key: `${t.id}#0`, transaction: t, date: t.date, amount: t.amount, installment: null }];
    }

    const list: TransactionOccurrence[] = [];
    for (let i = 0; i < t.installments; i++) {
      const date = addMonthsClamped(t.date, i);
      if (toMonthKey(date) > this.currentMonth) break;

      list.push({
        key: `${t.id}#${i}`,
        transaction: t,
        date,
        amount: t.amount,
        // "Paga" quando o dia de vencimento já chegou.
        installment: { number: i + 1, count: t.installments, paid: date <= this.today },
      });
    }
    return list;
  }

  private normalize(input: TransactionInput): TransactionInput {
    const installments =
      input.type === 'expense' && input.installments && input.installments >= 2
        ? Math.round(input.installments)
        : null;

    return {
      ...input,
      description: input.description.trim(),
      amount: Math.round(Math.abs(input.amount) * 100) / 100,
      accountId: input.accountId || null,
      installments,
    };
  }

  private sumByType(list: TransactionOccurrence[], type: Transaction['type']): number {
    return list.filter((o) => o.transaction.type === type).reduce((acc, o) => acc + o.amount, 0);
  }
}

/** Preenche campos adicionados depois da primeira versão do modelo. */
function migrate(raw: Partial<Transaction>): Transaction {
  return {
    ...(raw as Transaction),
    accountId: raw.accountId ?? null,
    installments: raw.installments ?? null,
  };
}
