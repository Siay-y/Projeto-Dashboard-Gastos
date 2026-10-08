import { Injectable, computed, inject } from '@angular/core';
import { daysInMonth, toDateKey, toMonthKey } from '../../shared/utils/date';
import { FinanceSettingsService } from './finance-settings.service';
import { RecurringExpenseService } from './recurring-expense.service';
import { TransactionService } from './transaction.service';

export type ForecastStatus = 'ok' | 'tight' | 'over';

export interface Forecast {
  day: number;
  daysInMonth: number;
  daysLeft: number;
  monthProgress: number;

  fixed: number;
  installments: number;
  variableToDate: number;
  dailyAverage: number;
  projectedVariable: number;

  spentToDate: number;
  projectedExpenses: number;
  income: number;
  projectedBalance: number;
  status: ForecastStatus;
}

const TIGHT_RATIO = 0.1;

@Injectable({ providedIn: 'root' })
export class ForecastService {
  private readonly transactions = inject(TransactionService);
  private readonly settings = inject(FinanceSettingsService);
  private readonly recurring = inject(RecurringExpenseService);

  private readonly now = new Date();
  private readonly today = toDateKey(this.now);
  private readonly currentMonth = toMonthKey(this.now);

  readonly forecast = computed<Forecast>(() => {
    const day = this.now.getDate();
    const total = daysInMonth(this.now);

    let installments = 0;
    let variableToDate = 0;
    let variableAll = 0;

    for (const o of this.transactions.occurrences()) {
      if (o.transaction.type !== 'expense' || toMonthKey(o.date) !== this.currentMonth) continue;

      if (o.installment) {
        installments += o.amount;
      } else {
        variableAll += o.amount;
        if (o.date <= this.today) variableToDate += o.amount;
      }
    }

    const fixed = this.recurring.monthlyTotal();
    const dailyAverage = variableToDate / day;
    const projectedVariable = Math.max(variableAll, dailyAverage * total);

    const spentToDate = fixed + installments + variableAll;
    const projectedExpenses = fixed + installments + projectedVariable;

    const income = this.settings.monthlyIncome() + this.extraIncome();
    const projectedBalance = income - projectedExpenses;

    return {
      day,
      daysInMonth: total,
      daysLeft: total - day,
      monthProgress: day / total,
      fixed,
      installments,
      variableToDate,
      dailyAverage,
      projectedVariable,
      spentToDate,
      projectedExpenses,
      income,
      projectedBalance,
      status: this.status(income, projectedBalance),
    };
  });

  private extraIncome(): number {
    return this.transactions
      .occurrences()
      .filter((o) => o.transaction.type === 'income' && toMonthKey(o.date) === this.currentMonth)
      .reduce((sum, o) => sum + o.amount, 0);
  }

  private status(income: number, balance: number): ForecastStatus {
    if (balance < 0) return 'over';
    if (income > 0 && balance < income * TIGHT_RATIO) return 'tight';
    return 'ok';
  }
}
