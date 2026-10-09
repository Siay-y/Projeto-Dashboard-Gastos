import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { toDateKey, toMonthKey } from '../../shared/utils/date';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { FinanceSettingsService } from './finance-settings.service';
import { RecurringExpenseService } from './recurring-expense.service';
import { TransactionService } from './transaction.service';

const now = new Date();
const today = toDateKey(now);
const currentMonth = toMonthKey(now);

const shiftMonths = (count: number, day = 10) =>
  toDateKey(new Date(now.getFullYear(), now.getMonth() + count, day));

function setup() {
  localStorage.clear();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

  return {
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

const income = (amount: number, date: string) => ({
  type: 'income' as const,
  description: 'Freela',
  amount,
  categoryId: 'salary',
  accountId: null,
  installments: null,
  date,
});

describe('TransactionService', () => {
  describe('normalização na entrada', () => {
    it('apara a descrição e arredonda o valor em centavos', () => {
      const { transactions } = setup();

      const t = transactions.add({ ...expense(10.126, today), description: '  Café  ' });

      expect(t.description).toBe('Café');
      expect(t.amount).toBe(10.13);
    });

    it('guarda o valor sempre positivo', () => {
      const { transactions } = setup();

      expect(transactions.add(expense(-80, today)).amount).toBe(80);
    });

    it('conta vazia virá nula, nunca string vazia', () => {
      const { transactions } = setup();

      expect(transactions.add({ ...expense(10, today), accountId: '' }).accountId).toBeNull();
    });

    it('parcelamento só vale para gasto e a partir de duas parcelas', () => {
      const { transactions } = setup();

      expect(transactions.add(expense(10, today, 1)).installments).toBeNull();
      expect(transactions.add(expense(10, today, 0)).installments).toBeNull();
      expect(transactions.add(expense(10, today, 3)).installments).toBe(3);
      expect(transactions.add({ ...income(10, today), installments: 6 }).installments).toBeNull();
    });

    it('arredonda uma quantidade de parcelas fracionada', () => {
      const { transactions } = setup();

      expect(transactions.add(expense(10, today, 3.6)).installments).toBe(4);
    });
  });

  describe('ocorrências', () => {
    it('um lançamento simples gera uma única ocorrência', () => {
      const { transactions } = setup();

      transactions.add(expense(50, today));
      const [occurrence, ...rest] = transactions.occurrences();

      expect(rest).toHaveLength(0);
      expect(occurrence.amount).toBe(50);
      expect(occurrence.installment).toBeNull();
    });

    it('a compra parcelada gera uma ocorrência por mês, até o mês atual', () => {
      const { transactions } = setup();

      transactions.add(expense(100, shiftMonths(-2), 12));

      const dates = transactions.occurrences().map((o) => o.date);
      expect(dates).toEqual([shiftMonths(-2), shiftMonths(-1), shiftMonths(0)]);
    });

    it('cada mês soma só a parcela que vence nele, não a compra inteira', () => {
      const { transactions } = setup();

      transactions.add(expense(100, shiftMonths(-2), 12));

      expect(transactions.monthlyVariableExpenses()).toBe(100);
      expect(transactions.monthOccurrences()).toHaveLength(1);
    });

    it('numera a parcela e marca como paga a que já venceu', () => {
      const { transactions } = setup();

      transactions.add(expense(100, shiftMonths(-2), 12));
      const current = transactions.monthOccurrences()[0];

      expect(current.installment).toEqual({ number: 3, count: 12, paid: current.date <= today });
    });

    it('um lançamento de mês futuro não entra no mês atual', () => {
      const { transactions } = setup();

      transactions.add(expense(500, shiftMonths(1)));

      expect(transactions.occurrences()).toHaveLength(1);
      expect(transactions.monthOccurrences()).toHaveLength(0);
      expect(transactions.monthlyVariableExpenses()).toBe(0);
    });
  });

  describe('totais do mês', () => {
    it('soma a renda fixa com as entradas extras do mês', () => {
      const { transactions, settings } = setup();

      settings.setMonthlyIncome(3000);
      transactions.add(income(500, today));
      transactions.add(income(999, shiftMonths(-1)));

      expect(transactions.monthlyFixedIncome()).toBe(3000);
      expect(transactions.monthlyExtraIncome()).toBe(500);
      expect(transactions.monthlyIncome()).toBe(3500);
    });

    it('soma gastos fixos com os variáveis do mês', () => {
      const { transactions, recurring } = setup();

      recurring.add({
        description: 'Aluguel',
        amount: 1200,
        categoryId: 'housing',
        accountId: null,
        dueDay: 10,
      });
      transactions.add(expense(300, today));

      expect(transactions.monthlyFixedExpenses()).toBe(1200);
      expect(transactions.monthlyVariableExpenses()).toBe(300);
      expect(transactions.monthlyExpenses()).toBe(1500);
    });

    it('conta quantos lançamentos de cada tipo o mês tem', () => {
      const { transactions } = setup();

      transactions.add(expense(10, today));
      transactions.add(expense(20, today));
      transactions.add(income(30, today));

      expect(transactions.monthlyExpenseCount()).toBe(2);
      expect(transactions.monthlyIncomeCount()).toBe(1);
    });

    it('trocar o mês de referência muda os totais', () => {
      const { transactions } = setup();

      transactions.add(expense(70, shiftMonths(-1)));
      expect(transactions.monthlyVariableExpenses()).toBe(0);

      transactions.referenceMonth.set(toMonthKey(shiftMonths(-1)));
      expect(transactions.monthlyVariableExpenses()).toBe(70);
    });
  });

  describe('lista e persistência', () => {
    it('ordena do mais recente para o mais antigo', () => {
      const { transactions } = setup();

      transactions.add({ ...expense(1, shiftMonths(-1)), description: 'Antigo' });
      transactions.add({ ...expense(2, today), description: 'Hoje' });

      expect(transactions.transactions().map((t) => t.description)).toEqual(['Hoje', 'Antigo']);
    });

    it('atualiza e remove pelo id', () => {
      const { transactions } = setup();

      const t = transactions.add(expense(10, today));
      transactions.update(t.id, { ...expense(90, today), description: 'Trocado' });

      expect(transactions.transactions()[0]).toMatchObject({
        id: t.id,
        description: 'Trocado',
        amount: 90,
      });

      transactions.remove(t.id);
      expect(transactions.hasTransactions()).toBe(false);
    });

    it('grava no storage e completa campos ausentes ao recarregar', async () => {
      const { transactions } = setup();

      transactions.add(expense(25, today));
      await TestBed.tick();

      expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)!)).toHaveLength(1);

      localStorage.setItem(
        STORAGE_KEYS.TRANSACTIONS,
        JSON.stringify([
          {
            id: 'antigo',
            type: 'expense',
            description: 'Sem campos novos',
            amount: 40,
            categoryId: 'shopping',
            date: today,
            createdAt: new Date().toISOString(),
          },
        ]),
      );

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const [restored] = TestBed.inject(TransactionService).transactions();

      expect(restored.accountId).toBeNull();
      expect(restored.installments).toBeNull();
    });
  });

  it('o mês de referência começa no mês corrente', () => {
    const { transactions } = setup();

    expect(transactions.referenceMonth()).toBe(currentMonth);
  });
});
