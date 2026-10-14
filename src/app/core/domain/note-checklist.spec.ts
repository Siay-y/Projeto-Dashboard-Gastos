import { NoteChecklistItem } from './models';
import {
  checklistSummary,
  parseChecklistAmount,
  parseChecklistText,
  sanitizeChecklist,
} from './note-checklist';

const item = (text: string, amount: number | null = null, done = false): NoteChecklistItem => ({
  id: `id-${text}`,
  text,
  amount,
  done,
});

describe('checklistSummary', () => {
  it('conta marcados e soma só o que está marcado', () => {
    const summary = checklistSummary([
      item('Arroz', 25, true),
      item('Café', 18, true),
      item('Sabão', 7),
    ]);

    expect(summary).toEqual({ total: 3, done: 2, checkedAmount: 43, amount: 50 });
  });

  it('item sem valor não atrapalha a conta', () => {
    const summary = checklistSummary([item('Pão', null, true), item('Leite', 5.5, true)]);

    expect(summary.checkedAmount).toBe(5.5);
    expect(summary.done).toBe(2);
  });

  it('soma em centavos, sem ruído de ponto flutuante', () => {
    const summary = checklistSummary([item('a', 0.1, true), item('b', 0.2, true)]);

    expect(summary.checkedAmount).toBe(0.3);
  });

  it('lista vazia', () => {
    expect(checklistSummary([])).toEqual({ total: 0, done: 0, checkedAmount: 0, amount: 0 });
  });
});

describe('sanitizeChecklist', () => {
  it('apara o texto e descarta item vazio', () => {
    const items = sanitizeChecklist([item('  Arroz  '), item('   '), item('')]);

    expect(items).toHaveLength(1);
    expect(items[0].text).toBe('Arroz');
  });

  it('valor negativo vira positivo e zero vira nulo', () => {
    const items = sanitizeChecklist([item('a', -10), item('b', 0), item('c', 25.126)]);

    expect(items.map((i) => i.amount)).toEqual([10, null, 25.13]);
  });
});

describe('parseChecklistAmount', () => {
  it('lê o formato brasileiro', () => {
    expect(parseChecklistAmount('25,50')).toBe(25.5);
    expect(parseChecklistAmount('R$ 1.234,56')).toBe(1234.56);
  });

  it('lê o formato com ponto decimal', () => {
    expect(parseChecklistAmount('25.50')).toBe(25.5);
    expect(parseChecklistAmount('1,234.56')).toBe(1234.56);
  });

  it('texto sem número vira nulo', () => {
    expect(parseChecklistAmount('')).toBeNull();
    expect(parseChecklistAmount('abc')).toBeNull();
  });
});

describe('parseChecklistText', () => {
  it('lê o que a exportação escreveu', () => {
    const items = parseChecklistText('[x] Arroz R$ 25,00\n[ ] Café R$ 18,50\n[ ] Sabão');

    expect(items.map((i) => [i.text, i.amount, i.done])).toEqual([
      ['Arroz', 25, true],
      ['Café', 18.5, false],
      ['Sabão', null, false],
    ]);
  });

  it('linha sem caixa de marcar continua virando item', () => {
    const [first] = parseChecklistText('Comprar pão');

    expect(first.text).toBe('Comprar pão');
    expect(first.done).toBe(false);
  });

  it('só considera valor quando tem R$, para não comer número do texto', () => {
    const [first] = parseChecklistText('[ ] Arroz 5kg');
    const [second] = parseChecklistText('[ ] Pilha 2');

    expect(first.text).toBe('Arroz 5kg');
    expect(first.amount).toBeNull();
    expect(second.text).toBe('Pilha 2');
    expect(second.amount).toBeNull();
  });

  it('ignora linha em branco', () => {
    expect(parseChecklistText('\n\n[ ] Item\n\n')).toHaveLength(1);
    expect(parseChecklistText('')).toEqual([]);
  });
});
