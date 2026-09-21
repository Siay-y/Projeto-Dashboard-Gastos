import { CurrencyPipe, DatePipe, formatDate } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  LOCALE_ID,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { findAccount } from '../../../../core/constants/accounts';
import { findCategory } from '../../../../core/constants/categories';
import { InstallmentProgress, getInstallmentProgress } from '../../../../core/domain/installments';
import { Account, Category, Transaction } from '../../../../core/domain/models';
import { DeleteButtonComponent, TileIconComponent } from '../../../../shared/ui';
import { capitalizeFirst, toMonthKey } from '../../../../shared/utils/date';

interface Row {
  transaction: Transaction;
  category: Category;
  account: Account | undefined;
  /** Presente apenas em compras parceladas. */
  installments: InstallmentProgress | null;
}

interface MonthGroup {
  key: string;
  label: string;
  rows: Row[];
  income: number;
  expense: number;
}

export type HistoryFilter = 'all' | 'ongoing' | 'settled';

const FILTERS: readonly { value: HistoryFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'ongoing', label: 'Em andamento' },
  { value: 'settled', label: 'Quitadas' },
];

/**
 * Histórico em formato de tabela minimalista, agrupado por mês.
 * Uma linha por compra; parceladas mostram o progresso (ex.: 5/12).
 * Clique na linha → editar. Excluir pede confirmação inline.
 */
@Component({
  selector: 'app-transaction-list',
  imports: [CurrencyPipe, DatePipe, TileIconComponent, DeleteButtonComponent],
  templateUrl: './transaction-list.component.html',
  styleUrl: './transaction-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionListComponent {
  private readonly locale = inject(LOCALE_ID);

  readonly transactions = input.required<Transaction[]>();
  readonly edit = output<Transaction>();
  readonly remove = output<string>();

  /** Id da linha com confirmação de exclusão aberta (para destacar). */
  protected readonly confirmingId = signal<string | null>(null);

  protected readonly filters = FILTERS;
  protected readonly filter = signal<HistoryFilter>('all');

  private readonly rows = computed<Row[]>(() =>
    this.transactions().map((transaction) => ({
      transaction,
      category: findCategory(transaction.categoryId),
      account: findAccount(transaction.accountId),
      installments: getInstallmentProgress(transaction),
    })),
  );

  /** Quantidade por filtro, exibida nos chips. */
  protected readonly counts = computed<Record<HistoryFilter, number>>(() => {
    const rows = this.rows();
    return {
      all: rows.length,
      ongoing: rows.filter((r) => r.installments && r.installments.remaining > 0).length,
      settled: rows.filter((r) => r.installments && r.installments.remaining === 0).length,
    };
  });

  /** Mostra os chips só quando há alguma compra parcelada — senão não fazem sentido. */
  protected readonly showFilters = computed(() => this.counts().ongoing + this.counts().settled > 0);

  private readonly filteredRows = computed(() => {
    const rows = this.rows();
    switch (this.filter()) {
      case 'ongoing':
        return rows.filter((r) => r.installments && r.installments.remaining > 0);
      case 'settled':
        return rows.filter((r) => r.installments && r.installments.remaining === 0);
      default:
        return rows;
    }
  });

  protected readonly groups = computed<MonthGroup[]>(() => {
    const map = new Map<string, MonthGroup>();

    for (const row of this.filteredRows()) {
      const transaction = row.transaction;
      const key = toMonthKey(transaction.date);
      let group = map.get(key);

      if (!group) {
        group = { key, label: this.monthLabel(key), rows: [], income: 0, expense: 0 };
        map.set(key, group);
      }

      group.rows.push(row);

      // No cabeçalho do mês conta o que saiu naquele mês (a parcela, não o total).
      if (transaction.type === 'income') group.income += transaction.amount;
      else group.expense += transaction.amount;
    }

    return [...map.values()];
  });

  protected setFilter(value: HistoryFilter): void {
    this.filter.set(value);
  }

  protected setConfirming(id: string, confirming: boolean): void {
    this.confirmingId.set(confirming ? id : null);
  }

  private monthLabel(key: string): string {
    return capitalizeFirst(formatDate(`${key}-01`, "MMMM 'de' y", this.locale));
  }
}
