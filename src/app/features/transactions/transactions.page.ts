import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
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
import { ExportService } from '../../core/services/export.service';
import {
  ImportError,
  ImportPreview,
  ImportService,
  RecurringImportItem,
} from '../../core/services/import.service';
import {
  RecurringExpenseInput,
  RecurringExpenseService,
} from '../../core/services/recurring-expense.service';
import { TransactionInput, TransactionService } from '../../core/services/transaction.service';
import { UiPreferencesService } from '../../core/services/ui-preferences.service';
import { FadeInUpDirective } from '../../shared/directives/fade-in-up.directive';
import {
  ButtonComponent,
  CardComponent,
  CollapsibleSectionComponent,
  DialogComponent,
  EmptyStateComponent,
  MenuComponent,
  MenuItem,
} from '../../shared/ui';
import { ImportDialogComponent, ImportKind } from './components/import-dialog/import-dialog.component';
import { RecurringFormComponent } from './components/recurring-form/recurring-form.component';
import { RecurringListComponent } from './components/recurring-list/recurring-list.component';
import { TransactionFormComponent } from './components/transaction-form/transaction-form.component';
import { TransactionListComponent } from './components/transaction-list/transaction-list.component';

/** `?secao=` → id da seção recolhível a abrir. */
const SECTION_PARAMS: Record<string, string | undefined> = {
  fixos: 'recurring',
  historico: 'history',
};

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
    MenuComponent,
    ImportDialogComponent,
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
  private readonly prefs = inject(UiPreferencesService);
  private readonly exporter = inject(ExportService);
  private readonly importer = inject(ImportService);
  protected readonly service = inject(TransactionService);
  protected readonly recurring = inject(RecurringExpenseService);

  /** Query param `?novo=1` — vindo do CTA da visão geral. */
  readonly novo = input<string>();
  /** Query param `?secao=fixos|historico` — abre a seção (vindo dos alertas). */
  readonly secao = input<string>();

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

  // ---- Exportar / importar ----
  private readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');
  private readonly importDialog = viewChild.required(ImportDialogComponent);

  /** Qual seção está exportando/importando (desabilita o item do menu enquanto isso). */
  protected readonly busy = signal<ImportKind | null>(null);
  /** Seção alvo da importação em andamento (define o diálogo e o que salvar). */
  protected readonly importKind = signal<ImportKind>('history');
  private pendingImport: ImportPreview<TransactionInput | RecurringImportItem> | null = null;

  protected readonly recurringMenu = computed<MenuItem[]>(() =>
    this.menuItems(this.recurring.hasItems(), this.busy() === 'recurring'),
  );

  protected readonly historyMenu = computed<MenuItem[]>(() =>
    this.menuItems(this.service.hasTransactions(), this.busy() === 'history'),
  );

  protected readonly recurringSummary = computed(() => {
    const n = this.recurring.activeCount();
    if (n === 0) return 'Nenhum ativo';
    return n === 1 ? '1 ativo' : `${n} ativos`;
  });

  constructor() {
    afterNextRender(() => {
      const section = SECTION_PARAMS[this.secao() ?? ''];
      if (section) this.prefs.setExpanded(section, true);

      if (this.novo()) this.openNew();

      // Remove os query params para o refresh não repetir a ação.
      if (this.novo() || this.secao()) {
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

  // ---- Menus: exportar / importar ----

  protected onRecurringMenu(action: string): void {
    this.onMenu('recurring', action);
  }

  protected onHistoryMenu(action: string): void {
    this.onMenu('history', action);
  }

  private onMenu(kind: ImportKind, action: string): void {
    if (this.busy()) return;

    if (action === 'export') {
      void this.whileBusy(kind, () =>
        kind === 'recurring' ? this.exporter.exportRecurring() : this.exporter.exportHistory(),
      );
    } else if (action === 'import') {
      this.importKind.set(kind);
      this.fileInput().nativeElement.click();
    }
  }

  private menuItems(hasData: boolean, busy: boolean): MenuItem[] {
    return [
      {
        id: 'export',
        label: busy ? 'Aguarde…' : 'Exportar para Excel',
        icon: 'download',
        disabled: !hasData || busy,
      },
      { id: 'import', label: 'Importar do Excel', icon: 'upload', disabled: busy },
    ];
  }

  /** Arquivo escolhido no seletor: lê, monta a prévia e abre o diálogo. */
  protected onFileChosen(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // permite escolher o mesmo arquivo de novo
    if (!file) return;

    const kind = this.importKind();
    void this.whileBusy(kind, async () => {
      try {
        this.pendingImport =
          kind === 'recurring'
            ? await this.importer.parseRecurring(file)
            : await this.importer.parseHistory(file);
        this.importDialog().show(this.pendingImport);
      } catch (error) {
        this.pendingImport = null;
        const message =
          error instanceof ImportError ? error.message : 'Não foi possível ler o arquivo.';
        this.importDialog().show(null, message);
      }
    });
  }

  /** Usuário confirmou a prévia: grava os registros e abre a seção. */
  protected confirmImport(): void {
    const preview = this.pendingImport;
    this.pendingImport = null;
    if (!preview) return;

    if (this.importKind() === 'recurring') {
      for (const item of preview.items as RecurringImportItem[]) {
        const { active, ...input } = item;
        const created = this.recurring.add(input);
        if (!active) this.recurring.setActive(created.id, false);
      }
      this.prefs.setExpanded('recurring', true);
    } else {
      for (const item of preview.items as TransactionInput[]) this.service.add(item);
      this.prefs.setExpanded('history', true);
    }
  }

  private async whileBusy(kind: ImportKind, task: () => Promise<void>): Promise<void> {
    this.busy.set(kind);
    try {
      await task();
    } finally {
      this.busy.set(null);
    }
  }
}
