import { Injectable, inject } from '@angular/core';
import type { CellValue, Row } from 'read-excel-file/browser';
import { ACCOUNTS } from '../constants/accounts';
import { CATEGORIES, FALLBACK_CATEGORY } from '../constants/categories';
import { TransactionType } from '../domain/models';
import { toDateKey } from '../../shared/utils/date';
import { RecurringExpenseInput, RecurringExpenseService } from './recurring-expense.service';
import { TransactionInput, TransactionService } from './transaction.service';

export interface ImportIssue {
  /** Número da linha na planilha (como o Excel mostra). */
  row: number;
  message: string;
}

export interface ImportPreview<T> {
  /** Nome da aba lida. */
  sheet: string;
  /** Prontos para importar. */
  items: T[];
  /** Linhas iguais a registros já existentes — serão ignoradas. */
  duplicates: number;
  /** Linhas que não puderam ser lidas. */
  issues: ImportIssue[];
}

/** Gasto fixo importado: o input normal + se entra ativo ou pausado. */
export type RecurringImportItem = RecurringExpenseInput & { active: boolean };

/** Erro amigável quando o arquivo não serve. */
export class ImportError extends Error {}

type Cell = CellValue | null | undefined;

/** Nomes de coluna aceitos (normalizados: minúsculas, sem acento). */
const COLUMNS = {
  description: ['descricao', 'nome', 'item', 'description'],
  amount: ['valor', 'valor (parcela)', 'valor parcela', 'valor mensal', 'amount'],
  date: ['data', 'date'],
  type: ['tipo', 'type'],
  category: ['categoria', 'category'],
  account: ['conta', 'cartao', 'account'],
  installments: ['parcelas', 'installments'],
  dueDay: ['dia de cobranca', 'dia', 'vencimento', 'due day'],
  status: ['situacao', 'status'],
} as const;

type ColumnKey = keyof typeof COLUMNS;
type ColumnIndex = Partial<Record<ColumnKey, number>>;

const INCOME_WORDS = ['ganho', 'entrada', 'receita', 'income'];
const PAUSED_WORDS = ['pausado', 'pausada', 'inativo', 'inativa', 'paused'];

/**
 * Lê planilhas `.xlsx` (de preferência as exportadas pelo próprio app) e
 * prepara os registros para importação, apontando linhas com problema.
 * A biblioteca é carregada sob demanda.
 */
@Injectable({ providedIn: 'root' })
export class ImportService {
  private readonly transactions = inject(TransactionService);
  private readonly recurring = inject(RecurringExpenseService);

  async parseHistory(file: File): Promise<ImportPreview<TransactionInput>> {
    const { sheet, rows, columns, firstRow } = await this.read(file, 'Histórico');

    if (columns.date === undefined) {
      throw new ImportError('A planilha precisa de uma coluna "Data".');
    }

    const existing = new Set(
      this.transactions
        .transactions()
        .map((t) => fingerprint(t.date, t.description, t.amount, t.type)),
    );

    const items: TransactionInput[] = [];
    const issues: ImportIssue[] = [];
    let duplicates = 0;

    rows.forEach((row, i) => {
      const line = firstRow + i;
      const get = (key: ColumnKey) => cell(row, columns[key]);

      const description = text(get('description'));
      if (!description || isTotalRow(description)) return;

      const rawAmount = parseAmount(get('amount'));
      if (rawAmount === null || rawAmount === 0) {
        issues.push({ row: line, message: `"${description}": valor inválido.` });
        return;
      }

      const date = parseDate(get('date'));
      if (!date) {
        issues.push({ row: line, message: `"${description}": data inválida.` });
        return;
      }

      const type = parseType(get('type'));
      const amount = Math.abs(rawAmount);
      const installmentsRaw = parseInteger(get('installments'));
      const installments = type === 'expense' && installmentsRaw && installmentsRaw >= 2 ? installmentsRaw : null;

      if (existing.has(fingerprint(date, description, amount, type))) {
        duplicates++;
        return;
      }

      items.push({
        type,
        description,
        amount,
        date,
        categoryId: matchCategory(get('category'), type),
        accountId: matchAccount(get('account')),
        installments,
      });
    });

    return { sheet, items, duplicates, issues };
  }

  async parseRecurring(file: File): Promise<ImportPreview<RecurringImportItem>> {
    const { sheet, rows, columns, firstRow } = await this.read(file, 'Gastos fixos');

    const existing = new Set(
      this.recurring.items().map((r) => fingerprint('', r.description, r.amount, 'expense')),
    );

    const items: RecurringImportItem[] = [];
    const issues: ImportIssue[] = [];
    let duplicates = 0;

    rows.forEach((row, i) => {
      const line = firstRow + i;
      const get = (key: ColumnKey) => cell(row, columns[key]);

      const description = text(get('description'));
      if (!description || isTotalRow(description)) return;

      const rawAmount = parseAmount(get('amount'));
      if (rawAmount === null || rawAmount === 0) {
        issues.push({ row: line, message: `"${description}": valor inválido.` });
        return;
      }
      const amount = Math.abs(rawAmount);

      if (existing.has(fingerprint('', description, amount, 'expense'))) {
        duplicates++;
        return;
      }

      const dueDayRaw = parseInteger(get('dueDay'));
      const dueDay = dueDayRaw && dueDayRaw >= 1 && dueDayRaw <= 31 ? dueDayRaw : null;
      items.push({
        description,
        amount,
        categoryId: matchCategory(get('category'), 'expense'),
        accountId: matchAccount(get('account')),
        dueDay,
        active: !PAUSED_WORDS.includes(normalize(text(get('status')))),
      });
    });

    return { sheet, items, duplicates, issues };
  }

  // ---- Leitura ----

  /**
   * Abre o arquivo, escolhe a aba (`preferred` se existir, senão a primeira)
   * e localiza o cabeçalho. Devolve as linhas de dados abaixo dele.
   */
  private async read(file: File, preferred: string) {
    if (!/\.xlsx$/i.test(file.name)) {
      throw new ImportError('Escolha um arquivo .xlsx (Excel).');
    }

    const { default: readXlsxFile } = await import('read-excel-file/browser');

    let sheets: { sheet: string; data: Row[] }[];
    try {
      sheets = await readXlsxFile(file);
    } catch {
      throw new ImportError('Não foi possível ler o arquivo. Ele está corrompido ou não é um .xlsx.');
    }

    const chosen =
      sheets.find((s) => normalize(s.sheet) === normalize(preferred)) ?? sheets[0];
    if (!chosen || chosen.data.length === 0) {
      throw new ImportError('A planilha está vazia.');
    }

    // Cabeçalho = primeira linha (entre as 10 primeiras) que tenha "Descrição" e "Valor".
    for (let i = 0; i < Math.min(10, chosen.data.length); i++) {
      const columns = mapColumns(chosen.data[i]);
      if (columns.description !== undefined && columns.amount !== undefined) {
        return {
          sheet: chosen.sheet,
          columns,
          rows: chosen.data.slice(i + 1),
          firstRow: i + 2, // linhas do Excel começam em 1; dados começam após o cabeçalho
        };
      }
    }

    throw new ImportError(
      'Não encontrei as colunas "Descrição" e "Valor". Use o arquivo exportado como modelo.',
    );
  }
}

// ---- Auxiliares de parsing ----

function mapColumns(header: Row): ColumnIndex {
  const index: ColumnIndex = {};
  header.forEach((value, i) => {
    const name = normalize(text(value));
    if (!name) return;
    for (const key of Object.keys(COLUMNS) as ColumnKey[]) {
      if (index[key] === undefined && (COLUMNS[key] as readonly string[]).includes(name)) {
        index[key] = i;
      }
    }
  });
  return index;
}

/** Rodapés como "Total" / "Total dos ativos por mês" não são registros. */
function isTotalRow(description: string): boolean {
  return /^(sub)?total\b/.test(normalize(description));
}

function cell(row: Row, index: number | undefined): Cell {
  return index === undefined ? null : row[index];
}

/** Minúsculas, sem acentos, sem espaços nas pontas. */
function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

function text(value: Cell): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return toDateKey(value);
  return String(value).trim();
}

/** Aceita número, "1.234,56", "R$ 35,90", "-35.9", "(35,90)". */
function parseAmount(value: Cell): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? round(value) : null;

  let s = text(value);
  if (!s) return null;

  const negative = /^\(.*\)$/.test(s) || s.includes('-') || s.includes('−');
  s = s.replace(/[^\d.,]/g, '');

  // Decide o separador decimal pelo último símbolo: "1.234,56" → vírgula; "1,234.56" → ponto.
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(/,/g, '');

  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return round(negative ? -n : n);
}

function parseInteger(value: Cell): number | null {
  if (typeof value === 'number') return Number.isInteger(value) ? value : Math.round(value);
  const s = text(value).replace(/\D/g, '');
  return s ? Number(s) : null;
}

/** Aceita `Date`, "dd/mm/aaaa", "aaaa-mm-dd" e número serial do Excel. */
function parseDate(value: Cell): string | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : toDateKey(value);

  if (typeof value === 'number') {
    // Serial do Excel: dias desde 30/12/1899.
    const ms = Math.round((value - 25569) * 86_400_000);
    const d = new Date(ms);
    return toDateKey(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }

  const s = text(value);
  let m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (m) {
    const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    return validDate(year, Number(m[2]), Number(m[1]));
  }
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return validDate(Number(m[1]), Number(m[2]), Number(m[3]));

  return null;
}

function validDate(year: number, month: number, day: number): string | null {
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return toDateKey(d);
}

/**
 * Só a coluna "Tipo" define um ganho ("Ganho", "Entrada", "Receita"…).
 * Sem ela — ou com a célula vazia — a linha é um gasto, o caso comum.
 * O sinal do valor não é usado: o app exporta gastos negativos, mas quem
 * monta a planilha à mão costuma digitar tudo positivo.
 */
function parseType(value: Cell): TransactionType {
  const word = normalize(text(value));
  return INCOME_WORDS.some((w) => word.startsWith(w)) ? 'income' : 'expense';
}

function matchCategory(value: Cell, type: TransactionType): string {
  const key = normalize(text(value));
  if (!key) return FALLBACK_CATEGORY.id;

  const found = CATEGORIES.find(
    (c) => (c.type === type || c.type === 'both') && (normalize(c.label) === key || c.id === key),
  );
  return found?.id ?? FALLBACK_CATEGORY.id;
}

function matchAccount(value: Cell): string | null {
  const key = normalize(text(value));
  if (!key || key === '-') return null;

  const found = ACCOUNTS.find((a) => normalize(a.label) === key || a.id === key);
  return found?.id ?? null;
}

function fingerprint(date: string, description: string, amount: number, type: string): string {
  return `${date}|${normalize(description)}|${round(amount)}|${type}`;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
