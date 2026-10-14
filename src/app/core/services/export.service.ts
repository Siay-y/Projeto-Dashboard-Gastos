import { Injectable, inject } from '@angular/core';
import type { CellObject, Row, Sheet } from 'write-excel-file/universal';
import { findAccount } from '../constants/accounts';
import { findCategory } from '../constants/categories';
import { noteColorLabel } from '../constants/note-colors';
import { getInstallmentProgress } from '../domain/installments';
import { noteToText } from '../domain/note-html';
import { fromDateKey, toDateKey, toMonthKey } from '../../shared/utils/date';
import { NoteService } from './note.service';
import { RecurringExpenseService } from './recurring-expense.service';
import { TransactionService } from './transaction.service';

// `[$R$-416]`: moeda em pt-BR independente do idioma do Excel.
const CURRENCY = '[$R$-416] #,##0.00';
const DATE = 'dd/mm/yyyy';
const MONTH = 'mmmm/yyyy';

const HEADER_BG = '#e4efea';
const HEADER_TEXT = '#1e5e4b';
const BORDER = '#c9c6bb';

@Injectable({ providedIn: 'root' })
export class ExportService {
  private readonly transactions = inject(TransactionService);
  private readonly recurring = inject(RecurringExpenseService);
  private readonly notes = inject(NoteService);

  async exportNotes(): Promise<void> {
    // Anotação trancada sai só com o título: decifrar aqui jogaria o texto na planilha.
    const rows: Row[] = this.notes
      .notes()
      .map((note) => [
        text(note.title),
        text(note.vault ? '' : noteToText(note.content)),
        text(checklistToText(note.checklist)),
        note.remindOn ? date(note.remindOn) : null,
        note.categoryId ? text(findCategory(note.categoryId).label) : null,
        account(note.bankId),
        account(note.methodId),
        text(noteColorLabel(note.color)),
        text(note.pinned ? 'Fixada' : ''),
        text(note.vault ? 'Trancada' : ''),
        note.attachments.length ? number(note.attachments.length) : null,
        date(note.createdAt.slice(0, 10)),
        date(note.updatedAt.slice(0, 10)),
      ]);

    await this.download('anotacoes', [
      {
        sheet: 'Anotações',
        data: [
          header([
            'Título',
            'Conteúdo',
            'Checklist',
            'Lembrete',
            'Categoria',
            'Banco',
            'Forma de pagamento',
            'Cor',
            'Fixada',
            'Trancada',
            'Anexos',
            'Criada em',
            'Atualizada em',
          ]),
          ...rows,
        ],
        columns: widths([30, 60, 40, 14, 18, 16, 20, 12, 10, 10, 10, 14, 14]),
        stickyRowsCount: 1,
      },
    ]);
  }

  async exportRecurring(): Promise<void> {
    const items = this.recurring.items();

    const rows: Row[] = items.map((r) => {
      const category = findCategory(r.categoryId);
      return [
        text(r.description),
        money(r.amount),
        r.dueDay ? number(r.dueDay) : null,
        text(category.label),
        text(category.group),
        account(r.bankId),
        account(r.methodId),
        text(r.active ? 'Ativo' : 'Pausado'),
        date(r.createdAt.slice(0, 10)),
      ];
    });

    rows.push([
      bold('Total dos ativos por mês'),
      { ...money(this.recurring.monthlyTotal()), fontWeight: 'bold' },
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ]);

    await this.download('gastos-fixos', [
      {
        sheet: 'Gastos fixos',
        data: [
          header([
            'Descrição',
            'Valor mensal',
            'Dia de cobrança',
            'Categoria',
            'Grupo',
            'Banco',
            'Forma de pagamento',
            'Situação',
            'Cadastrado em',
          ]),
          ...rows,
        ],
        columns: widths([34, 16, 16, 20, 18, 18, 20, 12, 16]),
        stickyRowsCount: 1,
      },
    ]);
  }

  async exportHistory(): Promise<void> {
    const today = toDateKey();

    const rows: Row[] = this.transactions.transactions().map((t) => {
      const category = findCategory(t.categoryId);
      const progress = getInstallmentProgress(t, today);
      const isIncome = t.type === 'income';

      return [
        date(t.date),
        text(isIncome ? 'Ganho' : 'Gasto'),
        text(t.description),
        text(category.label),
        text(category.group),
        account(t.bankId),
        account(t.methodId),
        money(isIncome ? t.amount : -t.amount),
        progress ? number(progress.count) : null,
        progress ? number(progress.paid) : null,
        progress ? number(progress.remaining) : null,
        progress?.nextDate ? date(progress.nextDate) : null,
        money(isIncome ? t.amount : -(progress?.total ?? t.amount)),
        text(progress ? (progress.remaining === 0 ? 'Quitado' : 'Em andamento') : 'À vista'),
        date(t.createdAt.slice(0, 10)),
      ];
    });

    await this.download('historico', [
      {
        sheet: 'Histórico',
        data: [
          header([
            'Data',
            'Tipo',
            'Descrição',
            'Categoria',
            'Grupo',
            'Banco',
            'Forma de pagamento',
            'Valor (parcela)',
            'Parcelas',
            'Pagas',
            'Restantes',
            'Próxima parcela',
            'Valor total',
            'Situação',
            'Cadastrado em',
          ]),
          ...rows,
        ],
        columns: widths([12, 8, 34, 20, 18, 16, 20, 16, 10, 8, 10, 16, 16, 14, 14]),
        stickyRowsCount: 1,
      },
      {
        sheet: 'Por mês',
        data: [
          header(['Mês', 'Entradas lançadas', 'Gastos lançados', 'Resultado', 'Lançamentos']),
          ...this.monthlyRows(),
        ],
        columns: widths([18, 18, 18, 18, 14]),
        stickyRowsCount: 1,
      },
    ]);
  }

  private monthlyRows(): Row[] {
    const byMonth = new Map<string, { income: number; expense: number; entries: number }>();

    for (const o of this.transactions.occurrences()) {
      const key = toMonthKey(o.date);
      const bucket = byMonth.get(key) ?? { income: 0, expense: 0, entries: 0 };
      bucket[o.transaction.type] += o.amount;
      bucket.entries++;
      byMonth.set(key, bucket);
    }

    return [...byMonth.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, m]) => [
        { value: fromDateKey(`${key}-01`), type: Date, format: MONTH },
        money(m.income),
        money(-m.expense),
        { ...money(m.income - m.expense), fontWeight: 'bold' },
        number(m.entries),
      ]);
  }

  private async download(name: string, sheets: Sheet<Blob>[]): Promise<void> {
    const { default: writeExcelFile } = await import('write-excel-file/universal');
    const blob = await writeExcelFile(sheets, { fontFamily: 'Calibri', fontSize: 11 }).toBlob();

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `meus-gastos-${name}-${toDateKey()}.xlsx`;
    link.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

/** Formato que a importação lê de volta: `[x] Arroz R$ 25,00`. */
function checklistToText(items: { text: string; amount: number | null; done: boolean }[]): string {
  return items
    .map((item) => {
      const box = item.done ? '[x]' : '[ ]';
      const value = item.amount === null ? '' : ` R$ ${item.amount.toFixed(2).replace('.', ',')}`;
      return `${box} ${item.text}${value}`;
    })
    .join('\n');
}

function header(labels: string[]): Row {
  return labels.map((label) => ({
    value: label,
    type: String,
    fontWeight: 'bold',
    textColor: HEADER_TEXT,
    backgroundColor: HEADER_BG,
    bottomBorderColor: BORDER,
    bottomBorderStyle: 'thin',
    alignVertical: 'center',
    height: 22,
  }));
}

function text(value: string): CellObject {
  return { value, type: String };
}

function account(id: string | null): CellObject | null {
  const found = findAccount(id);
  return found ? text(found.label) : null;
}

function bold(value: string): CellObject {
  return { value, type: String, fontWeight: 'bold' };
}

function number(value: number): CellObject {
  return { value, type: Number, align: 'center' };
}

function money(value: number): CellObject {
  return { value, type: Number, format: CURRENCY };
}

function date(dateKey: string): CellObject {
  return { value: fromDateKey(dateKey), type: Date, format: DATE };
}

function widths(list: number[]): { width: number }[] {
  return list.map((width) => ({ width }));
}
