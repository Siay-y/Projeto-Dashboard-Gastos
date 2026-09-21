import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Router } from '@angular/router';
import { RecurringExpense, Transaction } from '../../core/domain/models';
import {
  RecurringExpenseInput,
  RecurringExpenseService,
} from '../../core/services/recurring-expense.service';
import { TransactionInput, TransactionService } from '../../core/services/transaction.service';
import { FadeInUpDirective } from '../../shared/directives/fade-in-up.directive';
import {
  ButtonComponent,
  CardComponent,
  CollapsibleSectionComponent,
  DialogComponent,
  EmptyStateComponent,
} from '../../shared/ui';
import { RecurringFormComponent } from './components/recurring-form/recurring-form.component';
import { RecurringListComponent } from './components/recurring-list/recurring-list.component';
import { TransactionFormComponent } from './components/transaction-form/transaction-form.component';
import { TransactionListComponent } from './components/transaction-list/transaction-list.component';

/**
 * Gastos fixos + histórico de transações.
 * Abre o formulário de transação automaticamente quando chega com `?novo=1`.
 */
@Component({
  selector: 'app-transactions-page',
  imports: [
    CurrencyPipe,
    CardComponent,
    ButtonComponent,
    DialogComponent,
    CollapsibleSectionComponent,
    EmptyStateComponent,
    TransactionFormComponent,
    TransactionListComponent,
    RecurringFormComponent,
    RecurringListComponent,
    FadeInUpDirective,
  ],
  templateUrl: './transactions.page.html',
  styleUrl: './transactions.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionsPage {
  private readonly router = inject(Router);
  protected readonly service = inject(TransactionService);
  protected readonly recurring = inject(RecurringExpenseService);

  /** Query param `?novo=1` — vindo do CTA da visão geral. */
  readonly novo = input<string>();

  // ---- Transações ----
  private readonly txDialog = viewChild.required<DialogComponent>('txDialog');
  private readonly txForm = viewChild.required(TransactionFormComponent);
  protected readonly editing = signal<Transaction | null>(null);
  protected readonly txDialogTitle = computed(() =>
    this.editing() ? 'Editar transação' : 'Nova transação',
  );

  // ---- Gastos fixos ----
  private readonly recDialog = viewChild.required<DialogComponent>('recDialog');
  private readonly recForm = viewChild.required(RecurringFormComponent);
  protected readonly editingRecurring = signal<RecurringExpense | null>(null);
  protected readonly recDialogTitle = computed(() =>
    this.editingRecurring() ? 'Editar gasto fixo' : 'Novo gasto fixo',
  );

  protected readonly countLabel = computed(() => {
    const n = this.service.transactions().length;
    return n === 1 ? '1 registro' : `${n} registros`;
  });

  protected readonly recurringSummary = computed(() => {
    const n = this.recurring.activeCount();
    if (n === 0) return 'Nenhum ativo';
    return n === 1 ? '1 ativo' : `${n} ativos`;
  });

  constructor() {
    afterNextRender(() => {
      if (this.novo()) {
        this.openNew();
        // Remove o query param para o refresh não reabrir o formulário.
        void this.router.navigate([], { queryParams: {}, replaceUrl: true });
      }
    });
  }

  // ---- Transações ----

  protected openNew(): void {
    this.editing.set(null);
    this.txForm().load(null);
    this.txDialog().open();
  }

  protected openEdit(transaction: Transaction): void {
    this.editing.set(transaction);
    this.txForm().load(transaction);
    this.txDialog().open();
  }

  protected save(input: TransactionInput): void {
    const current = this.editing();
    if (current) this.service.update(current.id, input);
    else this.service.add(input);

    this.txDialog().close();
  }

  protected remove(id: string): void {
    this.service.remove(id);
  }

  // ---- Gastos fixos ----

  protected openNewRecurring(): void {
    this.editingRecurring.set(null);
    this.recForm().load(null);
    this.recDialog().open();
  }

  protected openEditRecurring(item: RecurringExpense): void {
    this.editingRecurring.set(item);
    this.recForm().load(item);
    this.recDialog().open();
  }

  protected saveRecurring(input: RecurringExpenseInput): void {
    const current = this.editingRecurring();
    if (current) this.recurring.update(current.id, input);
    else this.recurring.add(input);

    this.recDialog().close();
  }

  protected toggleRecurring(event: { id: string; active: boolean }): void {
    this.recurring.setActive(event.id, event.active);
  }

  protected removeRecurring(id: string): void {
    this.recurring.remove(id);
  }
}
