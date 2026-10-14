import { NoteChecklistItem } from './models';

export interface ChecklistSummary {
  total: number;
  done: number;
  /** Soma dos itens marcados; é o que vira lançamento. */
  checkedAmount: number;
  amount: number;
}

export function checklistSummary(items: readonly NoteChecklistItem[]): ChecklistSummary {
  let done = 0;
  let checkedAmount = 0;
  let amount = 0;

  for (const item of items) {
    const value = item.amount ?? 0;
    amount += value;

    if (item.done) {
      done++;
      checkedAmount += value;
    }
  }

  return { total: items.length, done, checkedAmount: round(checkedAmount), amount: round(amount) };
}

export function sanitizeChecklist(items: readonly NoteChecklistItem[]): NoteChecklistItem[] {
  return items
    .map((item) => ({
      id: item.id,
      text: item.text.trim(),
      amount: normalizeAmount(item.amount),
      done: item.done === true,
    }))
    .filter((item) => item.text !== '');
}

/** Aceita `12,50` e `R$ 12.50`; devolve `null` quando não há valor. */
export function parseChecklistAmount(raw: string): number | null {
  const cleaned = raw.replace(/[^\d.,-]/g, '').trim();
  if (!cleaned) return null;

  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  const normalized =
    lastComma > lastDot ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned.replace(/,/g, '');

  return normalizeAmount(Number(normalized));
}

/** Lê o formato que a exportação escreve: `[x] Arroz R$ 25,00`. */
export function parseChecklistText(raw: string): NoteChecklistItem[] {
  return sanitizeChecklist(
    raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line !== '')
      .map((line) => {
        const box = /^\[\s*([xX]?)\s*\]\s*(.*)$/.exec(line);
        const rest = box ? box[2] : line;
        const money = /R\$\s*([\d.,]+)\s*$/.exec(rest);

        return {
          id: crypto.randomUUID(),
          text: (money ? rest.slice(0, money.index) : rest).trim(),
          amount: money ? parseChecklistAmount(money[1]) : null,
          done: box ? box[1].toLowerCase() === 'x' : false,
        };
      }),
  );
}

function normalizeAmount(value: number | null): number | null {
  if (value === null || !Number.isFinite(value)) return null;

  const rounded = round(Math.abs(value));
  return rounded > 0 ? rounded : null;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
