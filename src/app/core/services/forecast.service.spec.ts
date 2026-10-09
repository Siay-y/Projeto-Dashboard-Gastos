import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { daysInMonth, toDateKey } from '../../shared/utils/date';
import { FinanceSettingsService } from './finance-settings.service';
import { ForecastService } from './forecast.service';
import { RecurringExpenseService } from './recurring-expense.service';
import { TransactionService } from './transaction.service';

const now = new Date();
const day = now.getDate();
const days = daysInMonth(now);
const today = toDateKey(now);

const shiftMonths = (count: number, dayOfMonth = 10) =>
  toDateKey(new Date(now.getFullYear(), now.getMonth() + count, dayOfMonth));

function setup() {
  localStorage.clear();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

  return {
    forecast: TestBed.inject(ForecastService),
    transactions: TestBed.inject(TransactionService),
    recurring: TestBed.inject(RecurringExpenseService),
    settings: TestBed.inject(FinanceSettingsService),
  };
}

const expense = (amount: number, date: string, installments: number | null = null) => ({
  type: 'expense' as const,
  description: 'Compra',
  amount,
  categoryId: 'shopping',
  accountId: null,
  installments,
  date,
});

const fixed = (amount: number) => ({
  description: 'Aluguel',
  amount,
  categoryId: 'housing',
  accountId: null,
  dueDay: 10,
});

describe('ForecastService', () => {
  it('descreve a posição no mês', () => {
    const { forecast } = setup();
    const f = forecast.forecast();

    expect(f.day).toBe(day);
    expect(f.daysInMonth).toBe(days);
    expect(f.daysLeft).toBe(days - day);
    expect(f.monthProgress).toBeCloseTo(day / days, 10);
  });

  it('projeta o variável pela média diária até o fim do mês', () => {
    const { forecast, transactions } = setup();

    transactions.add(expense(90, today));
    const f = forecast.forecast();

    expect(f.variableToDate).toBe(90);
    expect(f.dailyAverage).toBeCloseTo(90 / day, 10);
    expect(f.projectedVariable).toBeCloseTo(Math.max(90, (90 / day) * days), 10);
  });

  it('nunca projeta menos do que já foi lançado para o mês', () => {
    const { forecast, transactions } = setup();

    transactions.add(expense(400, toDateKey(new Date(now.getFullYear(), now.getMonth(), days))));
    const f = forecast.forecast();

    expect(f.projectedVariable).toBeGreaterThanOrEqual(400);
    expect(f.spentToDate).toBeGreaterThanOrEqual(400);
  });

  it('gasto fixo e parcela entram como certos, sem projeção', () => {
    const { forecast, recurring, transactions } = setup();

    recurring.add(fixed(1200));
    transactions.add(expense(100, shiftMonths(-2), 12));

    const f = forecast.forecast();

    expect(f.fixed).toBe(1200);
    expect(f.installments).toBe(100);
    expect(f.projectedVariable).toBe(0);
    expect(f.projectedExpenses).toBe(1300);
  });

  it('ignora gasto fixo pausado', () => {
    const { forecast, recurring } = setup();

    const item = recurring.add(fixed(800));
    recurring.setActive(item.id, false);

    expect(forecast.forecast().fixed).toBe(0);
  });

  it('soma renda fixa e entradas extras do mês', () => {
    const { forecast, settings, transactions } = setup();

    settings.setMonthlyIncome(4000);
    transactions.add({
      type: 'income',
      description: 'Freela',
      amount: 600,
      categoryId: 'salary',
      accountId: null,
      installments: null,
      date: today,
    });

    expect(forecast.forecast().income).toBe(4600);
  });

  it('status over quando a projeção fecha no vermelho', () => {
    const { forecast, settings, recurring } = setup();

    settings.setMonthlyIncome(1000);
    recurring.add(fixed(1100));

    const f = forecast.forecast();
    expect(f.projectedBalance).toBe(-100);
    expect(f.status).toBe('over');
  });

  it('status tight quando sobra menos de 10% da renda', () => {
    const { forecast, settings, recurring } = setup();

    settings.setMonthlyIncome(1000);
    recurring.add(fixed(950));

    const f = forecast.forecast();
    expect(f.projectedBalance).toBe(50);
    expect(f.status).toBe('tight');
  });

  it('status ok com folga', () => {
    const { forecast, settings, recurring } = setup();

    settings.setMonthlyIncome(1000);
    recurring.add(fixed(500));

    expect(forecast.forecast().status).toBe('ok');
  });

  it('sem renda informada, sobra positiva ainda é ok', () => {
    const { forecast } = setup();

    const f = forecast.forecast();
    expect(f.income).toBe(0);
    expect(f.projectedBalance).toBe(0);
    expect(f.status).toBe('ok');
  });

  it('ignora gasto de outro mês', () => {
    const { forecast, transactions } = setup();

    transactions.add(expense(999, shiftMonths(-1)));

    expect(forecast.forecast().projectedExpenses).toBe(0);
  });
});
