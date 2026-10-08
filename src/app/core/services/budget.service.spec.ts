import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { daysInMonth, toDateKey } from '../../shared/utils/date';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { BudgetService } from './budget.service';
import { RecurringExpenseService } from './recurring-expense.service';
import { TransactionService } from './transaction.service';

const now = new Date();
const day = now.getDate();
const days = daysInMonth(now);
const today = toDateKey(now);
const monthsAgo = (count: number, dayOfMonth = 10) =>
  toDateKey(new Date(now.getFullYear(), now.getMonth() - count, dayOfMonth));

function setup() {
  localStorage.clear();
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

  return {
    budget: TestBed.inject(BudgetService),
    transactions: TestBed.inject(TransactionService),
    recurring: TestBed.inject(RecurringExpenseService),
  };
}

const expense = (
  amount: number,
  categoryId: string,
  date: string,
  installments: number | null = null,
) => ({
  type: 'expense' as const,
  description: 'Teste',
  amount,
  categoryId,
  accountId: null,
  installments,
  date,
});

describe('BudgetService', () => {
  it('soma gastos fixos, parcelas e lançamentos variáveis da categoria', () => {
    const { budget, transactions, recurring } = setup();

    recurring.add({ description: 'Aluguel', amount: 1200, categoryId: 'housing', accountId: null, dueDay: 10 });
    transactions.add(expense(300, 'housing', today));
    transactions.add(expense(100, 'housing', monthsAgo(2), 12));

    budget.setLimit('housing', 2500);
    const [item] = budget.budgets();

    expect(item.spent).toBe(1600);
    expect(item.remaining).toBe(900);
    expect(item.status).toBe('ok');
  });

  it('ignora outras categorias e meses anteriores', () => {
    const { budget, transactions } = setup();

    transactions.add(expense(50, 'groceries', today));
    transactions.add(expense(999, 'leisure', today));
    transactions.add(expense(999, 'groceries', monthsAgo(1)));

    budget.setLimit('groceries', 500);

    expect(budget.budgets()[0].spent).toBe(50);
  });

  it('marca near a partir de 80% e over acima do limite', () => {
    const { budget, transactions } = setup();

    transactions.add(expense(80, 'food', today));
    budget.setLimit('food', 100);
    expect(budget.budgets()[0].status).toBe('near');

    budget.setLimit('food', 79);
    expect(budget.budgets()[0].status).toBe('over');
    expect(budget.over()).toHaveLength(1);

    budget.setLimit('food', 400);
    expect(budget.budgets()[0].status).toBe('ok');
  });

  it('projeta o variável pela média diária e avisa antes de estourar', () => {
    const { budget, transactions } = setup();

    transactions.add(expense(100, 'ifood', today));
    budget.setLimit('ifood', 1_000_000);

    const [probe] = budget.budgets();
    expect(probe.projected).toBeCloseTo((100 / day) * days, 6);

    // No último dia do mês não há o que projetar: a média já cobre o mês inteiro.
    if (probe.projected <= probe.spent) return;

    budget.setLimit('ifood', (probe.spent + probe.projected) / 2);
    const [item] = budget.budgets();

    expect(item.status).not.toBe('over');
    expect(item.willExceed).toBe(true);
    expect(budget.willExceed()).toHaveLength(1);
  });

  it('não projeta além do que já foi lançado para o mês', () => {
    const { budget, transactions } = setup();

    // Gasto futuro, ainda neste mês: entra no total, mas não infla a média diária.
    transactions.add(expense(500, 'travel', toDateKey(new Date(now.getFullYear(), now.getMonth(), days))));
    budget.setLimit('travel', 600);

    const [item] = budget.budgets();
    expect(item.spent).toBe(500);
    expect(item.projected).toBeGreaterThanOrEqual(500);
  });

  it('persiste os limites e descarta o que está inválido ao recarregar', async () => {
    const { budget } = setup();

    budget.setLimit('groceries', 600.456);
    await TestBed.tick();

    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.BUDGETS)!)).toEqual({ groceries: 600.46 });

    localStorage.setItem(
      STORAGE_KEYS.BUDGETS,
      JSON.stringify({ groceries: 600, inexistente: 10, food: -5, leisure: 'x' }),
    );
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    expect(TestBed.inject(BudgetService).limits()).toEqual({ groceries: 600 });
  });

  it('remove um limite', () => {
    const { budget } = setup();

    budget.setLimit('pets', 200);
    budget.setLimit('food', 300);
    budget.removeLimit('pets');

    expect(budget.limits()).toEqual({ food: 300 });
    expect(budget.hasLimits()).toBe(true);
  });
});
