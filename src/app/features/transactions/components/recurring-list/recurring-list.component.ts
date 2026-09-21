import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { findAccount } from '../../../../core/constants/accounts';
import { findCategory } from '../../../../core/constants/categories';
import { Account, Category, RecurringExpense } from '../../../../core/domain/models';
import { DeleteButtonComponent, TileIconComponent } from '../../../../shared/ui';

interface Row {
  item: RecurringExpense;
  category: Category;
  account: Account | undefined;
}

/**
 * Lista compacta de gastos fixos. Clique na linha → editar.
 * O switch pausa/reativa sem apagar o item.
 */
@Component({
  selector: 'app-recurring-list',
  imports: [CurrencyPipe, TileIconComponent, DeleteButtonComponent],
  templateUrl: './recurring-list.component.html',
  styleUrl: './recurring-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecurringListComponent {
  readonly items = input.required<RecurringExpense[]>();
  readonly edit = output<RecurringExpense>();
  readonly toggle = output<{ id: string; active: boolean }>();
  readonly remove = output<string>();

  protected readonly confirmingId = signal<string | null>(null);

  protected readonly rows = computed<Row[]>(() =>
    this.items().map((item) => ({
      item,
      category: findCategory(item.categoryId),
      account: findAccount(item.accountId),
    })),
  );

  protected setConfirming(id: string, confirming: boolean): void {
    this.confirmingId.set(confirming ? id : null);
  }
}
