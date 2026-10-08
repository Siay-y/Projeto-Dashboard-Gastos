export function toMonthKey(date: Date | string): string {
  if (typeof date === 'string') return date.slice(0, 7);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function toDateKey(date: Date = new Date()): string {
  const day = String(date.getDate()).padStart(2, '0');
  return `${toMonthKey(date)}-${day}`;
}

export function addMonthsClamped(dateKey: string, months: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const target = new Date(year, month - 1 + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  return toDateKey(target);
}

export function fromDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function daysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function daysBetween(from: string, to: string): number {
  const ms = fromDateKey(to).getTime() - fromDateKey(from).getTime();
  return Math.round(ms / 86_400_000);
}

export function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
