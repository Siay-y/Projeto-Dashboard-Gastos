import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { findCategory } from '../../../../core/constants/categories';
import {
  ImportPreview,
  RecurringImportItem,
} from '../../../../core/services/import.service';
import { TransactionInput } from '../../../../core/services/transaction.service';
import { ButtonComponent, DialogComponent } from '../../../../shared/ui';

export type ImportKind = 'history' | 'recurring';

/** Linha da prévia, já em formato de exibição. */
interface PreviewRow {
  description: string;
  amount: number;
  /** Ganho = positivo, gasto = negativo (só no histórico). */
  signed: number;
  meta: string;
}

/** Quantas linhas mostrar na prévia antes do "+ N mais". */
const PREVIEW_LIMIT = 6;
const ISSUE_LIMIT = 8;

/**
 * Prévia do que será importado: quantos entram, quantos já existem,
 * linhas com problema. Só confirma quando o usuário clica em Importar.
 */
@Component({
  selector: 'app-import-dialog',
  imports: [CurrencyPipe, ButtonComponent, DialogComponent],
  templateUrl: './import-dialog.component.html',
  styleUrl: './import-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportDialogComponent {
  readonly kind = input.required<ImportKind>();
  readonly confirmed = output<void>();

  private readonly dialog = viewChild.required(DialogComponent);

  protected readonly preview = signal<ImportPreview<TransactionInput | RecurringImportItem> | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly previewLimit = PREVIEW_LIMIT;
  protected readonly issueLimit = ISSUE_LIMIT;

  protected readonly title = computed(() =>
    this.kind() === 'history' ? 'Importar histórico' : 'Importar gastos fixos',
  );

  protected readonly count = computed(() => this.preview()?.items.length ?? 0);

  protected readonly rows = computed<PreviewRow[]>(() => {
    const preview = this.preview();
    if (!preview) return [];

    return preview.items.slice(0, PREVIEW_LIMIT).map((item) => {
      const category = findCategory(item.categoryId).label;

      if ('date' in item) {
        const parts = [category];
        if (item.installments) parts.push(`${item.installments}×`);
        return {
          description: item.description,
          amount: item.amount,
          signed: item.type === 'income' ? item.amount : -item.amount,
          meta: `${formatDay(item.date)} · ${parts.join(' · ')}`,
        };
      }

      const parts = [category];
      if (item.dueDay) parts.push(`dia ${item.dueDay}`);
      if (!item.active) parts.push('pausado');
      return { description: item.description, amount: item.amount, signed: -item.amount, meta: parts.join(' · ') };
    });
  });

  /** Mostra a prévia (ou o erro) e abre o diálogo. */
  show(preview: ImportPreview<TransactionInput | RecurringImportItem> | null, error: string | null = null): void {
    this.preview.set(preview);
    this.error.set(error);
    this.dialog().open();
  }

  close(): void {
    this.dialog().close();
  }

  protected confirm(): void {
    this.confirmed.emit();
    this.close();
  }

  protected plural(n: number, singular: string, plural: string): string {
    return `${n} ${n === 1 ? singular : plural}`;
  }
}

/** "2026-09-21" → "21/09" sem depender do pipe dentro do computed. */
function formatDay(dateKey: string): string {
  const [, month, day] = dateKey.split('-');
  return `${day}/${month}`;
}
