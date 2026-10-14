import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ImportError, ImportService } from './import.service';
import { NoteService } from './note.service';
import { RecurringExpenseService } from './recurring-expense.service';
import { TransactionService } from './transaction.service';

const { readXlsxFile } = vi.hoisted(() => ({ readXlsxFile: vi.fn() }));
vi.mock('read-excel-file/browser', () => ({ default: readXlsxFile }));

type Cell = string | number | Date | null;

function setup() {
  localStorage.clear();
  readXlsxFile.mockReset();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

  return {
    importer: TestBed.inject(ImportService),
    transactions: TestBed.inject(TransactionService),
    recurring: TestBed.inject(RecurringExpenseService),
  };
}

function sheets(...list: { sheet: string; data: Cell[][] }[]): void {
  readXlsxFile.mockResolvedValue(list);
}

const file = (name = 'planilha.xlsx') => new File([''], name);

const HISTORY_HEADER = ['Data', 'Descrição', 'Categoria', 'Conta', 'Valor', 'Parcelas', 'Tipo'];

function history(...rows: Cell[][]): void {
  sheets({ sheet: 'Histórico', data: [HISTORY_HEADER, ...rows] });
}

const row = (
  date: Cell,
  description: string,
  value: Cell,
  extra: Partial<{ category: Cell; account: Cell; installments: Cell; type: Cell }> = {},
): Cell[] => [
  date,
  description,
  extra.category ?? null,
  extra.account ?? null,
  value,
  extra.installments ?? null,
  extra.type ?? null,
];

describe('ImportService', () => {
  describe('arquivo e cabeçalho', () => {
    it('recusa o que não é .xlsx', async () => {
      const { importer } = setup();

      await expect(importer.parseHistory(file('gastos.csv'))).rejects.toThrow(ImportError);
      expect(readXlsxFile).not.toHaveBeenCalled();
    });

    it('recusa planilha vazia', async () => {
      const { importer } = setup();
      sheets({ sheet: 'Histórico', data: [] });

      await expect(importer.parseHistory(file())).rejects.toThrow(/vazia/i);
    });

    it('recusa quando não acha Descrição e Valor', async () => {
      const { importer } = setup();
      sheets({ sheet: 'Histórico', data: [['Coluna A', 'Coluna B']] });

      await expect(importer.parseHistory(file())).rejects.toThrow(/Descrição/);
    });

    it('o histórico exige a coluna Data', async () => {
      const { importer } = setup();
      sheets({
        sheet: 'Histórico',
        data: [
          ['Descrição', 'Valor'],
          ['Café', 10],
        ],
      });

      await expect(importer.parseHistory(file())).rejects.toThrow(/"Data"/);
    });

    it('acha o cabeçalho abaixo de linhas de título', async () => {
      const { importer } = setup();
      sheets({
        sheet: 'Histórico',
        data: [
          ['Meus Gastos', null],
          ['Exportado em 09/10/2026', null],
          [],
          HISTORY_HEADER,
          row('2026-10-01', 'Café', 10),
        ],
      });

      const preview = await importer.parseHistory(file());
      expect(preview.items).toHaveLength(1);
    });

    it('escolhe a aba pelo nome, não a primeira', async () => {
      const { importer } = setup();
      sheets(
        {
          sheet: 'Resumo',
          data: [
            ['Descrição', 'Valor', 'Data'],
            ['Lixo', 1, '2026-10-01'],
          ],
        },
        { sheet: 'Histórico', data: [HISTORY_HEADER, row('2026-10-02', 'Certo', 20)] },
      );

      const preview = await importer.parseHistory(file());

      expect(preview.sheet).toBe('Histórico');
      expect(preview.items[0].description).toBe('Certo');
    });

    it('aceita nomes alternativos de coluna', async () => {
      const { importer } = setup();
      sheets({
        sheet: 'Histórico',
        data: [
          ['date', 'item', 'amount'],
          ['2026-10-01', 'Café', 10],
        ],
      });

      const preview = await importer.parseHistory(file());
      expect(preview.items[0]).toMatchObject({ description: 'Café', amount: 10 });
    });
  });

  describe('valores', () => {
    const amountOf = async (value: Cell) => {
      const { importer } = setup();
      history(row('2026-10-01', 'Item', value));
      const preview = await importer.parseHistory(file());
      return preview.items[0]?.amount;
    };

    it('lê número puro', async () => {
      expect(await amountOf(12.5)).toBe(12.5);
    });

    it('lê moeda em pt-BR', async () => {
      expect(await amountOf('R$ 1.234,56')).toBe(1234.56);
      expect(await amountOf('1.234,56')).toBe(1234.56);
      expect(await amountOf('0,99')).toBe(0.99);
    });

    it('lê o formato com ponto decimal', async () => {
      expect(await amountOf('1,234.56')).toBe(1234.56);
      expect(await amountOf('99.90')).toBe(99.9);
    });

    it('guarda negativo como positivo', async () => {
      expect(await amountOf('-80,00')).toBe(80);
      expect(await amountOf('(50,00)')).toBe(50);
      expect(await amountOf('−30,00')).toBe(30);
      expect(await amountOf(-15)).toBe(15);
    });

    it('arredonda em centavos', async () => {
      expect(await amountOf(10.126)).toBe(10.13);
    });

    it('valor zerado ou ilegível vira problema, não lançamento', async () => {
      const { importer } = setup();
      history(
        row('2026-10-01', 'Zero', 0),
        row('2026-10-01', 'Vazio', null),
        row('2026-10-01', 'Texto', 'abc'),
        row('2026-10-01', 'Válido', 10),
      );

      const preview = await importer.parseHistory(file());

      expect(preview.items).toHaveLength(1);
      expect(preview.issues).toHaveLength(3);
      expect(preview.issues[0]).toEqual({ row: 2, message: '"Zero": valor inválido.' });
    });
  });

  describe('datas', () => {
    const dateOf = async (value: Cell) => {
      const { importer } = setup();
      history(row(value, 'Item', 10));
      const preview = await importer.parseHistory(file());
      return preview.items[0]?.date;
    };

    it('lê objeto Date', async () => {
      expect(await dateOf(new Date(2026, 9, 7))).toBe('2026-10-07');
    });

    it('lê o número serial do Excel', async () => {
      expect(await dateOf(45000)).toBe('2023-03-15');
    });

    it('lê dia/mês/ano', async () => {
      expect(await dateOf('31/12/2026')).toBe('2026-12-31');
      expect(await dateOf('7.3.2026')).toBe('2026-03-07');
      expect(await dateOf('05/01/26')).toBe('2026-01-05');
    });

    it('lê ano-mês-dia', async () => {
      expect(await dateOf('2026-02-28')).toBe('2026-02-28');
    });

    it('data que não existe no calendário vira problema', async () => {
      const { importer } = setup();
      history(row('31/02/2026', 'Fevereiro 31', 10), row('2026-13-01', 'Mês 13', 10));

      const preview = await importer.parseHistory(file());

      expect(preview.items).toHaveLength(0);
      expect(preview.issues).toHaveLength(2);
      expect(preview.issues[0].message).toContain('data inválida');
    });
  });

  describe('classificação', () => {
    it('reconhece entrada pelas palavras de ganho', async () => {
      const { importer } = setup();
      history(
        row('2026-10-01', 'Salário', 100, { type: 'Ganho' }),
        row('2026-10-01', 'Extra', 100, { type: 'receita' }),
        row('2026-10-01', 'Mercado', 100, { type: 'Gasto' }),
        row('2026-10-01', 'Sem tipo', 100),
      );

      const preview = await importer.parseHistory(file());

      expect(preview.items.map((i) => i.type)).toEqual(['income', 'income', 'expense', 'expense']);
    });

    it('casa categoria por rótulo e por id', async () => {
      const { importer } = setup();
      history(
        row('2026-10-01', 'A', 10, { category: 'Mercado' }),
        row('2026-10-01', 'B', 10, { category: 'groceries' }),
        row('2026-10-01', 'C', 10, { category: 'MERCADO' }),
      );

      const preview = await importer.parseHistory(file());
      expect(preview.items.map((i) => i.categoryId)).toEqual([
        'groceries',
        'groceries',
        'groceries',
      ]);
    });

    it('categoria desconhecida ou de outro tipo cai em Outros', async () => {
      const { importer } = setup();
      history(
        row('2026-10-01', 'A', 10, { category: 'Inexistente' }),
        row('2026-10-01', 'B', 10, { category: 'Salário' }),
        row('2026-10-01', 'C', 10),
      );

      const preview = await importer.parseHistory(file());
      expect(preview.items.map((i) => i.categoryId)).toEqual(['other', 'other', 'other']);
    });

    it('planilha antiga tem uma coluna só: cada valor cai no campo do seu grupo', async () => {
      const { importer } = setup();
      history(
        row('2026-10-01', 'A', 10, { account: 'Nubank' }),
        row('2026-10-01', 'B', 10, { account: 'cartao de credito' }),
        row('2026-10-01', 'C', 10, { account: 'Banco Inexistente' }),
        row('2026-10-01', 'D', 10, { account: '-' }),
      );

      const preview = await importer.parseHistory(file());

      expect(preview.items.map((i) => [i.bankId, i.methodId])).toEqual([
        ['nubank', null],
        [null, 'credit'],
        [null, null],
        [null, null],
      ]);
    });

    it('planilha nova traz banco e forma de pagamento juntos', async () => {
      const { importer } = setup();
      sheets({
        sheet: 'Histórico',
        data: [
          ['Data', 'Descrição', 'Categoria', 'Banco', 'Forma de pagamento', 'Valor'],
          ['2026-10-01', 'Mercado', 'Mercado', 'Nubank', 'Pix', 100],
          ['2026-10-01', 'Trocado', 'Mercado', 'Pix', 'Nubank', 100],
        ],
      });

      const preview = await importer.parseHistory(file());

      expect(preview.items.map((i) => [i.bankId, i.methodId])).toEqual([
        ['nubank', 'pix'],
        [null, null],
      ]);
    });

    it('parcelas valem só para gasto e a partir de duas', async () => {
      const { importer } = setup();
      history(
        row('2026-10-01', 'A', 10, { installments: 12 }),
        row('2026-10-01', 'B', 10, { installments: 1 }),
        row('2026-10-01', 'C', 10, { installments: '6x' }),
        row('2026-10-01', 'D', 10, { installments: 3, type: 'Ganho' }),
      );

      const preview = await importer.parseHistory(file());
      expect(preview.items.map((i) => i.installments)).toEqual([12, null, 6, null]);
    });
  });

  describe('linhas ignoradas', () => {
    it('pula linha de total e linha sem descrição, sem registrar problema', async () => {
      const { importer } = setup();
      history(
        row('2026-10-01', 'Total', 999),
        row('2026-10-01', 'Subtotal do mês', 999),
        row('2026-10-01', '', 999),
        row('2026-10-01', 'Café', 10),
      );

      const preview = await importer.parseHistory(file());

      expect(preview.items).toHaveLength(1);
      expect(preview.issues).toHaveLength(0);
    });

    it('conta como duplicado o que já existe, comparando sem acento nem caixa', async () => {
      const { importer, transactions } = setup();

      transactions.add({
        type: 'expense',
        description: 'Café da manhã',
        amount: 10,
        categoryId: 'groceries',
        bankId: null,
        methodId: null,
        installments: null,
        date: '2026-10-01',
      });

      history(row('2026-10-01', 'CAFÉ DA MANHÃ', 10), row('2026-10-01', 'Outro', 10));
      const preview = await importer.parseHistory(file());

      expect(preview.duplicates).toBe(1);
      expect(preview.items).toHaveLength(1);
      expect(preview.items[0].description).toBe('Outro');
    });

    it('mesma descrição em data diferente não é duplicado', async () => {
      const { importer, transactions } = setup();

      transactions.add({
        type: 'expense',
        description: 'Café',
        amount: 10,
        categoryId: 'groceries',
        bankId: null,
        methodId: null,
        installments: null,
        date: '2026-10-01',
      });

      history(row('2026-10-02', 'Café', 10));
      const preview = await importer.parseHistory(file());

      expect(preview.duplicates).toBe(0);
      expect(preview.items).toHaveLength(1);
    });
  });

  describe('gastos fixos', () => {
    const RECURRING_HEADER = ['Descrição', 'Categoria', 'Conta', 'Valor mensal', 'Dia', 'Situação'];

    const recurringSheet = (...rows: Cell[][]) =>
      sheets({ sheet: 'Gastos fixos', data: [RECURRING_HEADER, ...rows] });

    it('não exige coluna de data', async () => {
      const { importer } = setup();
      recurringSheet(['Aluguel', 'Moradia', 'Pix', 1200, 10, null]);

      const preview = await importer.parseRecurring(file());

      expect(preview.items[0]).toMatchObject({
        description: 'Aluguel',
        amount: 1200,
        categoryId: 'housing',
        bankId: null,
        methodId: 'pix',
        dueDay: 10,
        active: true,
      });
    });

    it('descarta dia de cobrança fora de 1 a 31', async () => {
      const { importer } = setup();
      recurringSheet(
        ['A', null, null, 10, 0, null],
        ['B', null, null, 10, 32, null],
        ['C', null, null, 10, 31, null],
        ['D', null, null, 10, null, null],
      );

      const preview = await importer.parseRecurring(file());
      expect(preview.items.map((i) => i.dueDay)).toEqual([null, null, 31, null]);
    });

    it('lê a situação pausada', async () => {
      const { importer } = setup();
      recurringSheet(
        ['A', null, null, 10, 5, 'Pausado'],
        ['B', null, null, 10, 5, 'inativa'],
        ['C', null, null, 10, 5, 'Ativo'],
        ['D', null, null, 10, 5, null],
      );

      const preview = await importer.parseRecurring(file());
      expect(preview.items.map((i) => i.active)).toEqual([false, false, true, true]);
    });

    it('duplicado de fixo compara descrição e valor, sem data', async () => {
      const { importer, recurring } = setup();

      recurring.add({
        description: 'Netflix',
        amount: 39.9,
        categoryId: 'netflix',
        bankId: null,
        methodId: null,
        dueDay: 15,
      });

      recurringSheet(
        ['netflix', null, null, 39.9, 15, null],
        ['Spotify', null, null, 21.9, 5, null],
      );
      const preview = await importer.parseRecurring(file());

      expect(preview.duplicates).toBe(1);
      expect(preview.items).toHaveLength(1);
      expect(preview.items[0].description).toBe('Spotify');
    });
  });

  describe('anotações', () => {
    const NOTES_HEADER = ['Título', 'Conteúdo', 'Checklist', 'Lembrete', 'Categoria', 'Conta'];

    const notesSheet = (...rows: Cell[][]) =>
      sheets({ sheet: 'Anotações', data: [NOTES_HEADER, ...rows] });

    it('lê título, conteúdo e vínculos', async () => {
      const { importer } = setup();
      notesSheet(['Mercado', 'Arroz\nFeijão', '', '2026-12-31', 'Mercado', 'Pix']);

      const [note] = (await importer.parseNotes(file())).items;

      expect(note.title).toBe('Mercado');
      expect(note.content).toBe('<div>Arroz</div><div>Feijão</div>');
      expect(note.remindOn).toBe('2026-12-31');
      expect(note.categoryId).toBe('groceries');
      expect(note.methodId).toBe('pix');
      expect(note.bankId).toBeNull();
    });

    it('escapa marcação vinda da planilha em vez de interpretá-la', async () => {
      const { importer } = setup();
      notesSheet(['Teste', '<script>alert(1)</script>', '', null, null, null]);

      const [note] = (await importer.parseNotes(file())).items;

      expect(note.content).toContain('&lt;script&gt;');
      expect(note.content).not.toContain('<script>');
    });

    it('lê a checklist de volta', async () => {
      const { importer } = setup();
      notesSheet(['Lista', '', '[x] Arroz R$ 25,00\n[ ] Café', null, null, null]);

      const [note] = (await importer.parseNotes(file())).items;

      expect(note.checklist.map((i) => [i.text, i.amount, i.done])).toEqual([
        ['Arroz', 25, true],
        ['Café', null, false],
      ]);
    });

    it('lembrete inválido vira problema, mas a anotação entra', async () => {
      const { importer } = setup();
      notesSheet(['Teste', 'texto', '', 'qualquer coisa', null, null]);

      const preview = await importer.parseNotes(file());

      expect(preview.items).toHaveLength(1);
      expect(preview.items[0].remindOn).toBeNull();
      expect(preview.issues[0].message).toContain('lembrete');
    });

    it('categoria desconhecida fica sem vínculo, não cai em Outros', async () => {
      const { importer } = setup();
      notesSheet(['Teste', 'texto', '', null, 'Inexistente', null]);

      expect((await importer.parseNotes(file())).items[0].categoryId).toBeNull();
    });

    it('conta como duplicada a que já existe com o mesmo texto', async () => {
      const { importer } = setup();
      const notes = TestBed.inject(NoteService);

      notes.add({
        title: 'Mercado',
        content: '<div>Arroz</div>',
        checklist: [],
        attachments: [],
        remindOn: null,
        categoryId: null,
        bankId: null,
        methodId: null,
        transactionId: null,
        color: 'none',
      });

      notesSheet(
        ['Mercado', 'Arroz', '', null, null, null],
        ['Outra', 'Texto', '', null, null, null],
      );
      const preview = await importer.parseNotes(file());

      expect(preview.duplicates).toBe(1);
      expect(preview.items).toHaveLength(1);
      expect(preview.items[0].title).toBe('Outra');
    });

    it('linha totalmente vazia é ignorada sem virar problema', async () => {
      const { importer } = setup();
      notesSheet([null, null, null, null, null, null], ['Válida', 'texto', '', null, null, null]);

      const preview = await importer.parseNotes(file());

      expect(preview.items).toHaveLength(1);
      expect(preview.issues).toHaveLength(0);
    });

    it('sem coluna de título, recusa o arquivo', async () => {
      const { importer } = setup();
      sheets({
        sheet: 'Anotações',
        data: [
          ['Coluna A', 'Coluna B'],
          ['x', 'y'],
        ],
      });

      await expect(importer.parseNotes(file())).rejects.toThrow(/Descrição/);
    });
  });
});
