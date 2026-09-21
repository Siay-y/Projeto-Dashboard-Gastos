import { formatCurrency, formatDate } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  LOCALE_ID,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { APP_ROUTES } from '../../../core/constants/routes';
import { AlertAction, AlertService } from '../../../core/services/alert.service';
import { FinanceSettingsService } from '../../../core/services/finance-settings.service';
import { RecurringExpenseService } from '../../../core/services/recurring-expense.service';
import { TransactionService } from '../../../core/services/transaction.service';
import { UpcomingService } from '../../../core/services/upcoming.service';
import { UserService } from '../../../core/services/user.service';
import { FadeInUpDirective } from '../../../shared/directives/fade-in-up.directive';
import { ButtonComponent, EmptyStateComponent } from '../../../shared/ui';
import { capitalizeFirst, daysBetween, toDateKey } from '../../../shared/utils/date';
import { getGreeting } from '../../../shared/utils/greeting';
import { AlertListComponent } from '../components/alert-list/alert-list.component';
import { BalanceHeroComponent } from '../components/balance-hero/balance-hero.component';
import { AmountDialogComponent } from '../components/amount-dialog/amount-dialog.component';
import { SummaryCardComponent } from '../components/summary-card/summary-card.component';

type AdjustMode = 'balance' | 'income';

const ADJUST_COPY: Record<AdjustMode, { title: string; label: string; description: string }> = {
  balance: {
    title: 'Saldo total',
    label: 'Quanto você tem guardado',
    description:
      'Informe o total que você tem no banco. Os lançamentos não alteram esse valor; atualize sempre que quiser.',
  },
  income: {
    title: 'Renda mensal',
    label: 'Renda fixa por mês',
    description:
      'Valor que entra todo mês, como salário. Ele soma automaticamente nos ganhos do mês. Entradas extras podem ser lançadas em Transações.',
  },
};

/**
 * Visão geral: saudação, indicadores do mês e avisos.
 * Saldo e renda mensal podem ser ajustados direto nos cards.
 */
@Component({
  selector: 'app-overview-page',
  imports: [
    RouterLink,
    ButtonComponent,
    EmptyStateComponent,
    SummaryCardComponent,
    AmountDialogComponent,
    AlertListComponent,
    BalanceHeroComponent,
    FadeInUpDirective,
  ],
  templateUrl: './overview.page.html',
  styleUrl: './overview.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OverviewPage {
  private readonly locale = inject(LOCALE_ID);
  private readonly router = inject(Router);
  private readonly recurring = inject(RecurringExpenseService);
  protected readonly settings = inject(FinanceSettingsService);
  protected readonly user = inject(UserService);
  protected readonly transactions = inject(TransactionService);
  protected readonly alerts = inject(AlertService);
  protected readonly upcoming = inject(UpcomingService);

  private readonly amountDialog = viewChild.required(AmountDialogComponent);

  protected readonly routes = APP_ROUTES;
  protected readonly greeting = getGreeting();

  /** Ex.: "Segunda-feira, 21 de setembro" */
  protected readonly today = capitalizeFirst(formatDate(new Date(), "EEEE, d 'de' MMMM", this.locale));

  /** Ex.: "setembro" — nome do mês de referência dos totais. */
  protected readonly monthName = computed(() =>
    formatDate(`${this.transactions.referenceMonth()}-01`, 'MMMM', this.locale),
  );

  /** Há algo para prever? Sem lançamentos nem gastos fixos, mostra o convite. */
  protected readonly hasData = computed(
    () => this.transactions.hasTransactions() || this.recurring.activeCount() > 0,
  );

  protected readonly adjustMode = signal<AdjustMode>('balance');
  protected readonly adjustCopy = computed(() => ADJUST_COPY[this.adjustMode()]);

  protected readonly balanceHint = computed(() => {
    const updatedAt = this.settings.balanceUpdatedAt();
    if (!updatedAt) return 'Toque no lápis para informar quanto você tem';

    const age = daysBetween(updatedAt, toDateKey());
    if (age === 0) return 'Informado hoje';
    if (age === 1) return 'Informado ontem';
    return `Informado em ${formatDate(updatedAt, 'd/MM', this.locale)}`;
  });

  protected readonly incomeHint = computed(() => {
    const count = this.transactions.monthlyIncomeCount();

    if (this.transactions.monthlyFixedIncome() > 0) {
      if (count === 0) return 'Renda fixa mensal';
      return `Renda fixa + ${count} ${count === 1 ? 'entrada' : 'entradas'}`;
    }
    return this.countHint(count, 'entrada', 'entradas');
  });

  protected readonly expenseHint = computed(() => {
    const count = this.transactions.monthlyExpenseCount();
    const fixed = this.transactions.monthlyFixedExpenses();

    if (fixed > 0) {
      const fixedLabel = `${formatCurrency(fixed, this.locale, 'R$')} fixos`;
      if (count === 0) return fixedLabel;
      return `${fixedLabel} + ${count} ${count === 1 ? 'saída' : 'saídas'}`;
    }
    return this.countHint(count, 'saída', 'saídas');
  });

  protected openAdjust(mode: AdjustMode): void {
    this.adjustMode.set(mode);
    const current =
      mode === 'balance' ? this.settings.totalBalance() : this.settings.monthlyIncome();
    this.amountDialog().open(current);
  }

  protected saveAdjust(value: number): void {
    if (this.adjustMode() === 'balance') this.settings.setTotalBalance(value);
    else this.settings.setMonthlyIncome(value);
  }

  protected handleAlert(action: AlertAction): void {
    switch (action) {
      case 'set-balance':
        this.openAdjust('balance');
        break;
      case 'set-income':
        this.openAdjust('income');
        break;
      case 'view-fixed':
        void this.router.navigate([this.routes.TRANSACTIONS], { queryParams: { secao: 'fixos' } });
        break;
      case 'view-history':
        void this.router.navigate([this.routes.TRANSACTIONS], { queryParams: { secao: 'historico' } });
        break;
    }
  }

  private countHint(count: number, singular: string, plural: string): string {
    if (count === 0) return `Nenhuma ${singular} em ${this.monthName()}`;
    return `${count} ${count === 1 ? singular : plural} em ${this.monthName()}`;
  }
}
