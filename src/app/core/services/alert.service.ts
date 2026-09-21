import { formatCurrency } from '@angular/common';
import { Injectable, LOCALE_ID, computed, inject } from '@angular/core';
import { daysBetween, toDateKey } from '../../shared/utils/date';
import { FinanceSettingsService } from './finance-settings.service';
import { ForecastService } from './forecast.service';
import { RecurringExpenseService } from './recurring-expense.service';
import { TransactionService } from './transaction.service';
import { UpcomingItem, UpcomingService } from './upcoming.service';

export type AlertTone = 'info' | 'warning' | 'danger';

/** Ações que a tela pode executar a partir de um alerta. */
export type AlertAction = 'set-income' | 'set-balance' | 'view-fixed' | 'view-history';

export interface Alert {
  id: string;
  tone: AlertTone;
  /** Material Symbol. */
  icon: string;
  title: string;
  description: string;
  action?: { label: string; id: AlertAction };
}

/** Vencimentos até este número de dias à frente viram alerta. */
const DUE_WINDOW_DAYS = 3;

/** Depois de tanto tempo sem atualizar o saldo, sugere conferir. */
const STALE_BALANCE_DAYS = 30;

/**
 * Avisos da visão geral: contas vencendo, mês no vermelho, saldo desatualizado…
 * Tudo derivado — nada é persistido.
 */
@Injectable({ providedIn: 'root' })
export class AlertService {
  private readonly locale = inject(LOCALE_ID);
  private readonly transactions = inject(TransactionService);
  private readonly settings = inject(FinanceSettingsService);
  private readonly recurring = inject(RecurringExpenseService);
  private readonly forecastService = inject(ForecastService);
  private readonly upcoming = inject(UpcomingService);

  private readonly today = toDateKey();

  readonly alerts = computed<Alert[]>(() => {
    const list: Alert[] = [];

    this.pushBudgetAlert(list);
    this.pushDueAlert(list, 'fixed');
    this.pushDueAlert(list, 'installment');
    this.pushSetupAlerts(list);

    return list;
  });

  readonly hasAlerts = computed(() => this.alerts().length > 0);

  // ---- Orçamento do mês ----

  private pushBudgetAlert(list: Alert[]): void {
    const f = this.forecastService.forecast();
    if (f.income <= 0) return;

    if (f.spentToDate > f.income) {
      list.push({
        id: 'over-budget',
        tone: 'danger',
        icon: 'error',
        title: 'Os gastos passaram os ganhos do mês',
        description: `Já saiu ${this.money(f.spentToDate - f.income)} a mais do que entrou, e ainda faltam ${this.days(f.daysLeft)}.`,
        action: { label: 'Ver histórico', id: 'view-history' },
      });
      return;
    }

    if (f.status === 'over') {
      list.push({
        id: 'forecast-over',
        tone: 'warning',
        icon: 'trending_down',
        title: 'No ritmo atual, o mês fecha no vermelho',
        description: `Previsão de ${this.money(f.projectedExpenses)} em gastos contra ${this.money(f.income)} de ganhos. Faltariam ${this.money(-f.projectedBalance)}.`,
      });
    }
  }

  // ---- Vencimentos ----

  private pushDueAlert(list: Alert[], kind: UpcomingItem['kind']): void {
    const items = this.upcoming
      .items()
      .filter((i) => i.kind === kind)
      .map((i) => ({ ...i, label: i.detail ? `${i.detail} de ${i.label}` : i.label }));
    const due = items
      .filter((i) => i.days >= 0 && i.days <= DUE_WINDOW_DAYS)
      .sort((a, b) => a.days - b.days);

    if (due.length === 0) return;

    const isFixed = kind === 'fixed';
    const action = isFixed
      ? { label: 'Ver gastos fixos', id: 'view-fixed' as const }
      : { label: 'Ver histórico', id: 'view-history' as const };

    if (due.length === 1) {
      const [item] = due;
      list.push({
        id: `due-${kind}-single`,
        tone: item.days === 0 ? 'warning' : 'info',
        icon: isFixed ? 'event' : 'credit_card',
        title: `${item.label} vence ${this.when(item.days)}`,
        description: this.money(item.amount),
        action,
      });
      return;
    }

    const total = due.reduce((sum, i) => sum + i.amount, 0);
    const names = due.map((i) => i.label);

    list.push({
      id: `due-${kind}-many`,
      tone: due[0].days === 0 ? 'warning' : 'info',
      icon: isFixed ? 'event' : 'credit_card',
      title: isFixed
        ? `${due.length} gastos fixos vencem nos próximos dias`
        : `${due.length} parcelas vencem nos próximos dias`,
      description: `${joinNames(names)} · ${this.money(total)} no total`,
      action,
    });
  }

  // ---- Configuração ----

  private pushSetupAlerts(list: Alert[]): void {
    const hasData = this.transactions.hasTransactions() || this.recurring.activeCount() > 0;

    if (hasData && this.settings.monthlyIncome() === 0) {
      list.push({
        id: 'no-income',
        tone: 'info',
        icon: 'payments',
        title: 'Defina sua renda mensal',
        description: 'Com ela, a previsão do mês mostra quanto deve sobrar (ou faltar) até o fim do mês.',
        action: { label: 'Definir renda', id: 'set-income' },
      });
    }

    const updatedAt = this.settings.balanceUpdatedAt();
    if (updatedAt) {
      const age = daysBetween(updatedAt, this.today);
      if (age >= STALE_BALANCE_DAYS) {
        list.push({
          id: 'stale-balance',
          tone: 'info',
          icon: 'account_balance',
          title: 'Seu saldo pode estar desatualizado',
          description: `Foi informado há ${this.days(age)}. Vale conferir no banco e atualizar.`,
          action: { label: 'Atualizar saldo', id: 'set-balance' },
        });
      }
    }
  }

  // ---- Texto ----

  private money(value: number): string {
    return formatCurrency(value, this.locale, 'R$');
  }

  private days(n: number): string {
    return `${n} ${n === 1 ? 'dia' : 'dias'}`;
  }

  private when(days: number): string {
    if (days === 0) return 'hoje';
    if (days === 1) return 'amanhã';
    return `em ${days} dias`;
  }
}

/** "A, B e C" */
function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;
}
