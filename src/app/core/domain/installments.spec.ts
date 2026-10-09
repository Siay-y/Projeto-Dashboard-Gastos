import { Transaction } from './models';
import { getInstallmentProgress } from './installments';

const purchase = (date: string, installments: number | null, amount = 100): Transaction => ({
  id: 'tx-1',
  type: 'expense',
  description: 'Notebook',
  amount,
  categoryId: 'shopping',
  accountId: null,
  installments,
  date,
  createdAt: '2026-01-10T12:00:00.000Z',
});

const progress = (date: string, installments: number, today: string, amount = 100) =>
  getInstallmentProgress(purchase(date, installments, amount), today)!;

describe('progresso de parcelas', () => {
  it('só é parcelado a partir de duas parcelas', () => {
    expect(getInstallmentProgress(purchase('2026-01-10', null), '2026-06-01')).toBeNull();
    expect(getInstallmentProgress(purchase('2026-01-10', 1), '2026-06-01')).toBeNull();
    expect(getInstallmentProgress(purchase('2026-01-10', 2), '2026-06-01')).not.toBeNull();
  });

  it('conta uma parcela por mês já vencido', () => {
    const p = progress('2026-01-10', 12, '2026-05-15');

    expect(p.paid).toBe(5);
    expect(p.count).toBe(12);
    expect(p.remaining).toBe(7);
    expect(p.nextDate).toBe('2026-06-10');
  });

  it('a parcela que vence hoje já conta como paga', () => {
    expect(progress('2026-01-10', 3, '2026-01-10').paid).toBe(1);
    expect(progress('2026-01-10', 3, '2026-01-09').paid).toBe(0);
  });

  it('com nada vencido, a próxima data é a primeira parcela', () => {
    const p = progress('2026-03-05', 6, '2026-01-20');

    expect(p.paid).toBe(0);
    expect(p.remaining).toBe(6);
    expect(p.nextDate).toBe('2026-03-05');
  });

  it('dia 31 cai no último dia do mês curto e volta ao 31 depois', () => {
    const p = progress('2026-01-31', 4, '2026-02-28');

    expect(p.paid).toBe(2);
    expect(p.nextDate).toBe('2026-03-31');
  });

  it('quitado não tem próxima data', () => {
    const p = progress('2026-01-10', 3, '2027-01-01');

    expect(p.paid).toBe(3);
    expect(p.remaining).toBe(0);
    expect(p.nextDate).toBeNull();
  });

  it('o total multiplica a parcela e arredonda em centavos', () => {
    expect(progress('2026-01-10', 3, '2026-01-10', 33.33).total).toBe(99.99);
    expect(progress('2026-01-10', 3, '2026-01-10', 0.1).total).toBe(0.3);
    expect(progress('2026-01-10', 7, '2026-01-10', 142.85).total).toBe(999.95);
  });
});
