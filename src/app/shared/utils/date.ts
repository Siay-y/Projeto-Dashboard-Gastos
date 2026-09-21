/** Chave de mês no formato `YYYY-MM`, usada para agrupar/filtrar transações. */
export function toMonthKey(date: Date | string): string {
  if (typeof date === 'string') return date.slice(0, 7);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/** Data local no formato `YYYY-MM-DD` (sem o deslocamento do `toISOString`). */
export function toDateKey(date: Date = new Date()): string {
  const day = String(date.getDate()).padStart(2, '0');
  return `${toMonthKey(date)}-${day}`;
}

/**
 * Soma `months` meses a uma data `YYYY-MM-DD`, mantendo o dia quando possível.
 * Se o mês de destino for mais curto (ex.: 31 → fevereiro), cai no último dia.
 */
export function addMonthsClamped(dateKey: string, months: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const target = new Date(year, month - 1 + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  return toDateKey(target);
}

export function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
