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
import { CurrencyPipe, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { APP_ROUTES } from '../../core/constants/routes';
import { findAccount } from '../../core/constants/accounts';
import { findCategory } from '../../core/constants/categories';
import { NOTE_COLORS } from '../../core/constants/note-colors';
import { Account, Note, NoteChecklistItem, NoteColor } from '../../core/domain/models';
import { checklistSummary } from '../../core/domain/note-checklist';
import { noteExcerpt } from '../../core/domain/note-html';
import { ExportService } from '../../core/services/export.service';
import { ImportError, ImportPreview, ImportService } from '../../core/services/import.service';
import { NoteInput } from '../../core/domain/models';
import { NoteService } from '../../core/services/note.service';
import { TransactionService } from '../../core/services/transaction.service';
import { daysBetween, toDateKey } from '../../shared/utils/date';
import { FadeInUpDirective } from '../../shared/directives/fade-in-up.directive';
import {
  ButtonComponent,
  CardComponent,
  DeleteButtonComponent,
  EmptyStateComponent,
  InputComponent,
  MenuComponent,
  MenuItem,
  TileIconComponent,
} from '../../shared/ui';
import {
  LaunchDialogComponent,
  LaunchResult,
} from './components/launch-dialog/launch-dialog.component';
import { NoteEditorComponent, NoteSubmit } from './components/note-editor/note-editor.component';
import { NoteImportDialogComponent } from './components/note-import-dialog/note-import-dialog.component';
import { NoteViewComponent } from './components/note-view/note-view.component';

@Component({
  selector: 'app-notes-page',
  imports: [
    CurrencyPipe,
    DatePipe,
    FormsModule,
    ButtonComponent,
    CardComponent,
    DeleteButtonComponent,
    EmptyStateComponent,
    InputComponent,
    MenuComponent,
    TileIconComponent,
    NoteEditorComponent,
    NoteViewComponent,
    LaunchDialogComponent,
    NoteImportDialogComponent,
    FadeInUpDirective,
  ],
  templateUrl: './notes.page.html',
  styleUrl: './notes.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotesPage {
  private readonly router = inject(Router);
  private readonly exporter = inject(ExportService);
  private readonly importer = inject(ImportService);
  private readonly transactions = inject(TransactionService);
  protected readonly service = inject(NoteService);

  /** Permite abrir o editor direto, como em `/anotacoes?nova=1`. */
  readonly nova = input<string>();

  private readonly editor = viewChild.required(NoteEditorComponent);
  private readonly view = viewChild.required(NoteViewComponent);
  private readonly launcher = viewChild.required(LaunchDialogComponent);
  private readonly importDialog = viewChild.required(NoteImportDialogComponent);
  private readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  private readonly today = toDateKey();

  protected readonly query = signal('');
  protected readonly busy = signal(false);
  protected readonly launched = signal<string | null>(null);
  protected readonly colorFilter = signal<NoteColor | 'all'>('all');

  private pending: ImportPreview<NoteInput> | null = null;

  protected readonly visible = computed(() => {
    const found = this.service.search(this.query());
    const color = this.colorFilter();

    return color === 'all' ? found : found.filter((note) => note.color === color);
  });

  /** Só as cores em uso: filtro vazio não ajuda a varrer a grade. */
  protected readonly colorOptions = computed(() =>
    NOTE_COLORS.filter((color) => color.id !== 'none' && this.service.usedColors().has(color.id)),
  );

  protected readonly menu = computed<MenuItem[]>(() => [
    {
      id: 'export',
      label: 'Exportar anotações',
      icon: 'download',
      disabled: !this.service.hasNotes() || this.busy(),
    },
    { id: 'import', label: 'Importar anotações', icon: 'upload', disabled: this.busy() },
  ]);

  protected readonly countLabel = computed(() => {
    const total = this.service.count();
    if (total === 0) return 'Nenhuma anotação';

    const pinned = this.service.pinnedCount();
    const base = total === 1 ? '1 anotação' : `${total} anotações`;

    return pinned > 0 ? `${base} · ${pinned} fixada${pinned > 1 ? 's' : ''}` : base;
  });

  constructor() {
    afterNextRender(() => {
      if (!this.nova()) return;

      this.openNew();
      void this.router.navigate([], { queryParams: {}, replaceUrl: true });
    });
  }

  protected excerpt(note: Note): string {
    return noteExcerpt(this.contentOf(note));
  }

  protected summary(note: Note) {
    return checklistSummary(this.checklistOf(note));
  }

  protected isRevealed(note: Note): boolean {
    return note.vault !== null && this.service.isRevealed(note.id);
  }

  protected categoryOf(note: Note) {
    return note.categoryId ? findCategory(note.categoryId) : null;
  }

  protected accountsOf(note: Note): Account[] {
    return [findAccount(note.bankId), findAccount(note.methodId)].filter(
      (account) => account !== undefined,
    );
  }

  /** Negativo quando a data já passou: o cartão destaca o atraso. */
  protected reminderDays(note: Note): number | null {
    return note.remindOn ? daysBetween(this.today, note.remindOn) : null;
  }

  protected openNew(): void {
    this.editor().openNew();
  }

  protected openView(note: Note): void {
    this.view().open(note);
  }

  protected openEdit(note: Note): void {
    this.editor().openEdit(note);
  }

  protected onSaved(submit: NoteSubmit): void {
    if (submit.id) void this.service.update(submit.id, submit.input);
    else this.service.add(submit.input);
  }

  protected togglePinned(note: Note): void {
    this.service.togglePinned(note.id);
  }

  protected remove(note: Note): void {
    this.service.remove(note.id);
  }

  protected openLaunch(note: Note): void {
    const items = this.summary(note);
    this.launcher().open(note, items.checkedAmount, items.done);
  }

  protected onLaunched(result: LaunchResult): void {
    this.transactions.add({
      type: 'expense',
      description: result.description,
      amount: result.amount,
      categoryId: result.categoryId,
      bankId: result.bankId,
      methodId: result.methodId,
      installments: null,
      date: result.date,
    });

    this.launched.set(result.description);
  }

  protected goToHistory(): void {
    void this.router.navigate([APP_ROUTES.TRANSACTIONS], { queryParams: { secao: 'historico' } });
  }

  protected onMenu(id: string): void {
    if (id === 'export') void this.exportNotes();
    else this.fileInput().nativeElement.click();
  }

  protected async onFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.busy.set(true);

    try {
      this.pending = await this.importer.parseNotes(file);
      this.importDialog().show(this.pending);
    } catch (error) {
      this.pending = null;
      this.importDialog().show(null, message(error));
    } finally {
      this.busy.set(false);
    }
  }

  protected confirmImport(): void {
    for (const item of this.pending?.items ?? []) this.service.add(item);
    this.pending = null;
  }

  /** Trancada e fechada não tem texto para mostrar; aberta mostra o que a senha liberou. */
  private contentOf(note: Note): string {
    if (!note.vault) return note.content;
    return this.service.revealedOf(note.id)?.content ?? '';
  }

  private checklistOf(note: Note): NoteChecklistItem[] {
    if (!note.vault) return note.checklist;
    return this.service.revealedOf(note.id)?.checklist ?? [];
  }

  private async exportNotes(): Promise<void> {
    this.busy.set(true);

    try {
      await this.exporter.exportNotes();
    } finally {
      this.busy.set(false);
    }
  }
}

function message(error: unknown): string {
  return error instanceof ImportError
    ? error.message
    : 'Não foi possível ler o arquivo. Tente exportar de novo e usar o arquivo gerado.';
}
