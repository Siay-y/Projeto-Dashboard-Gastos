import { CurrencyPipe, formatDate } from '@angular/common';
import { ChangeDetectionStrategy, Component, LOCALE_ID, computed, inject, signal } from '@angular/core';
import { CalendarEventKind, CalendarService } from '../../core/services/calendar.service';
import { FadeInUpDirective } from '../../shared/directives/fade-in-up.directive';
import { ButtonComponent, CardComponent, TileIconComponent } from '../../shared/ui';
import { capitalizeFirst, fromDateKey, toDateKey, toMonthKey } from '../../shared/utils/date';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/** Rótulos da legenda, na ordem em que aparecem. */
const KINDS: readonly { kind: CalendarEventKind; label: string }[] = [
  { kind: 'fixed', label: 'Gasto fixo' },
  { kind: 'installment', label: 'Parcela' },
  { kind: 'expense', label: 'Gasto' },
  { kind: 'income', label: 'Ganho' },
];

/** Quantos eventos aparecem como chip dentro da célula (desktop). */
const CHIPS_PER_DAY = 2;

/**
 * Calendário: grade do mês com vencimentos e lançamentos marcados por dia,
 * e a agenda do dia selecionado ao lado.
 */
@Component({
  selector: 'app-calendar-page',
  imports: [CurrencyPipe, ButtonComponent, CardComponent, TileIconComponent, FadeInUpDirective],
  templateUrl: './calendar.page.html',
  styleUrl: './calendar.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarPage {
  private readonly locale = inject(LOCALE_ID);
  private readonly calendar = inject(CalendarService);

  private readonly today = toDateKey();
  private readonly currentMonth = toMonthKey(new Date());

  protected readonly weekdays = WEEKDAYS;
  protected readonly kinds = KINDS;
  protected readonly chipsPerDay = CHIPS_PER_DAY;

  /** Mês exibido (`YYYY-MM`). */
  protected readonly month = signal(this.currentMonth);
  /** Dia selecionado (`YYYY-MM-DD`). */
  protected readonly selected = signal(this.today);

  protected readonly days = computed(() => this.calendar.gridFor(this.month()));
  protected readonly isCurrentMonth = computed(() => this.month() === this.currentMonth);

  /** Ex.: "Setembro de 2026" */
  protected readonly monthLabel = computed(() =>
    capitalizeFirst(formatDate(`${this.month()}-01`, "MMMM 'de' y", this.locale)),
  );

  protected readonly selectedDay = computed(
    () => this.days().find((d) => d.date === this.selected()) ?? null,
  );

  /** Ex.: "Segunda-feira, 21 de setembro" */
  protected readonly selectedLabel = computed(() =>
    capitalizeFirst(formatDate(fromDateKey(this.selected()), "EEEE, d 'de' MMMM", this.locale)),
  );

  /** Totais do mês exibido, só com o que está no calendário. */
  protected readonly totals = computed(() => {
    const events = this.days()
      .filter((d) => d.inMonth)
      .flatMap((d) => d.events);
    const sum = (...kinds: CalendarEventKind[]) =>
      events.filter((e) => kinds.includes(e.kind)).reduce((s, e) => s + e.amount, 0);

    return {
      committed: sum('fixed', 'installment'),
      spent: sum('expense'),
      income: sum('income'),
      count: events.length,
    };
  });

  protected readonly selectedOutflow = computed(() => this.selectedDay()?.outflow ?? 0);
  protected readonly selectedInflow = computed(() => this.selectedDay()?.inflow ?? 0);

  // ---- Navegação ----

  protected shiftMonth(delta: number): void {
    const [year, month] = this.month().split('-').map(Number);
    this.goTo(toMonthKey(new Date(year, month - 1 + delta, 1)));
  }

  protected goToToday(): void {
    this.month.set(this.currentMonth);
    this.selected.set(this.today);
  }

  private goTo(month: string): void {
    this.month.set(month);
    // Hoje, se estiver no mês; senão o dia 1.
    this.selected.set(month === this.currentMonth ? this.today : `${month}-01`);
  }

  protected select(date: string): void {
    // Clicar num dia de "enchimento" leva ao mês dele.
    const month = toMonthKey(date);
    if (month !== this.month()) this.month.set(month);
    this.selected.set(date);
  }
}
