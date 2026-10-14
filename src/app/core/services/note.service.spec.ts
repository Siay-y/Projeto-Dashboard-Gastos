import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Note, NoteColor, NoteInput } from '../domain/models';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { NoteDraftService } from './note-draft.service';
import { HISTORY_MAX, NoteService } from './note.service';

const input = (changes: Partial<NoteInput> = {}): NoteInput => ({
  title: '',
  content: '',
  checklist: [],
  attachments: [],
  remindOn: null,
  categoryId: null,
  bankId: null,
  methodId: null,
  transactionId: null,
  color: 'none',
  ...changes,
});

const item = (text: string, amount: number | null = null, done = false) => ({
  id: crypto.randomUUID(),
  text,
  amount,
  done,
});

function setup(): NoteService {
  localStorage.clear();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

  return TestBed.inject(NoteService);
}

function reload(stored: Partial<Note>[]): NoteService {
  localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(stored));
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

  return TestBed.inject(NoteService);
}

const wait = () => new Promise((resolve) => setTimeout(resolve, 2));

describe('NoteService', () => {
  describe('criação', () => {
    it('guarda título e conteúdo', () => {
      const notes = setup();

      const note = notes.add(input({ title: '  Mercado  ', content: '<div>Arroz</div>' }));

      expect(note.title).toBe('Mercado');
      expect(note.content).toBe('<div>Arroz</div>');
      expect(note.pinned).toBe(false);
      expect(notes.count()).toBe(1);
    });

    it('sanitiza o conteúdo antes de guardar', () => {
      const notes = setup();

      const note = notes.add(
        input({ title: 'x', content: '<script>alert(1)</script><b onclick="x()">ok</b>' }),
      );

      expect(note.content).toBe('<b>ok</b>');
    });

    it('sem título, usa a primeira linha do conteúdo', () => {
      const notes = setup();

      const note = notes.add(input({ content: '<div>Senha do cofrinho</div><div>1234</div>' }));

      expect(note.title).toBe('Senha do cofrinho');
    });

    it('sem conteúdo, o título vem do primeiro item da checklist', () => {
      const notes = setup();

      const note = notes.add(input({ checklist: [item('Comprar arroz')] }));

      expect(note.title).toBe('Comprar arroz');
    });

    it('sem nada, fica "Sem título"', () => {
      const notes = setup();

      expect(notes.add(input()).title).toBe('Sem título');
      expect(notes.add(input({ title: '   ', content: '<div><br></div>' })).title).toBe(
        'Sem título',
      );
    });
  });

  describe('checklist', () => {
    it('descarta item sem texto e normaliza o valor', () => {
      const notes = setup();

      const note = notes.add(
        input({ checklist: [item('  Arroz  ', 25.126), item('   '), item('Café', -10)] }),
      );

      expect(note.checklist.map((i) => i.text)).toEqual(['Arroz', 'Café']);
      expect(note.checklist[0].amount).toBe(25.13);
      expect(note.checklist[1].amount).toBe(10);
    });

    it('marcar e desmarcar um item', () => {
      const notes = setup();
      const note = notes.add(input({ checklist: [item('Arroz', 25)] }));
      const [first] = note.checklist;

      notes.toggleChecklistItem(note.id, first.id);
      expect(notes.notes()[0].checklist[0].done).toBe(true);

      notes.toggleChecklistItem(note.id, first.id);
      expect(notes.notes()[0].checklist[0].done).toBe(false);
    });
  });

  describe('lembrete e vínculos', () => {
    it('aceita data no formato do app', () => {
      const notes = setup();

      expect(notes.add(input({ remindOn: '2026-12-31' })).remindOn).toBe('2026-12-31');
    });

    it('descarta lembrete em formato inválido', () => {
      const notes = setup();

      expect(notes.add(input({ remindOn: '31/12/2026' })).remindOn).toBeNull();
      expect(notes.add(input({ remindOn: '' })).remindOn).toBeNull();
    });

    it('lista só as anotações com lembrete', () => {
      const notes = setup();

      notes.add(input({ title: 'Com', remindOn: '2026-12-31' }));
      notes.add(input({ title: 'Sem' }));

      expect(notes.reminders().map((n) => n.title)).toEqual(['Com']);
    });

    it('descarta categoria e conta que não existem', () => {
      const notes = setup();

      const note = notes.add(
        input({ categoryId: 'inexistente', bankId: 'inexistente', methodId: 'inexistente' }),
      );

      expect(note.categoryId).toBeNull();
      expect(note.bankId).toBeNull();
      expect(note.methodId).toBeNull();
    });

    it('guarda banco e forma de pagamento ao mesmo tempo', () => {
      const notes = setup();

      const note = notes.add(
        input({ title: 'Mercado', categoryId: 'groceries', bankId: 'nubank', methodId: 'pix' }),
      );

      expect(note.categoryId).toBe('groceries');
      expect(note.bankId).toBe('nubank');
      expect(note.methodId).toBe('pix');
      expect(notes.forCategory('groceries').map((n) => n.id)).toEqual([note.id]);
      expect(notes.forCategory('leisure')).toEqual([]);
    });

    it('não aceita forma de pagamento no campo de banco, nem o contrário', () => {
      const notes = setup();

      const note = notes.add(input({ bankId: 'pix', methodId: 'nubank' }));

      expect(note.bankId).toBeNull();
      expect(note.methodId).toBeNull();
    });

    it('acha a anotação de um lançamento', () => {
      const notes = setup();

      const note = notes.add(input({ title: 'Dividido com o João', transactionId: 'tx-1' }));

      expect(notes.forTransaction('tx-1')?.id).toBe(note.id);
      expect(notes.forTransaction('tx-2')).toBeUndefined();
    });
  });

  describe('edição', () => {
    it('atualiza o conteúdo e a data de alteração', async () => {
      const notes = setup();
      const note = notes.add(input({ title: 'A', content: '<div>antes</div>' }));

      await wait();
      await notes.update(note.id, input({ title: 'B', content: '<div>depois</div>' }));

      const [updated] = notes.notes();
      expect(updated.title).toBe('B');
      expect(updated.content).toBe('<div>depois</div>');
      expect(updated.updatedAt > note.updatedAt).toBe(true);
      expect(updated.createdAt).toBe(note.createdAt);
    });

    it('sanitiza também na edição', async () => {
      const notes = setup();
      const note = notes.add(input({ title: 'A' }));

      await notes.update(
        note.id,
        input({ title: 'A', content: '<img src=x onerror="alert(1)">texto' }),
      );

      expect(notes.notes()[0].content).toBe('texto');
    });

    it('fixar não conta como edição', async () => {
      const notes = setup();
      const note = notes.add(input({ title: 'A', content: '<div>a</div>' }));

      await wait();
      notes.togglePinned(note.id);

      const [pinned] = notes.notes();
      expect(pinned.pinned).toBe(true);
      expect(pinned.updatedAt).toBe(note.updatedAt);
    });

    it('remove pelo id', () => {
      const notes = setup();
      const note = notes.add(input({ title: 'A' }));

      notes.remove(note.id);

      expect(notes.hasNotes()).toBe(false);
    });
  });

  describe('ordem', () => {
    it('fixadas primeiro, depois a mais recente', async () => {
      const notes = setup();

      notes.add(input({ title: 'Primeira' }));
      await wait();
      notes.add(input({ title: 'Segunda' }));
      await wait();
      const terceira = notes.add(input({ title: 'Terceira' }));

      expect(notes.notes().map((n) => n.title)).toEqual(['Terceira', 'Segunda', 'Primeira']);

      notes.togglePinned(terceira.id);
      expect(notes.notes()[0].title).toBe('Terceira');

      const [, segunda] = notes.notes();
      notes.togglePinned(segunda.id);

      expect(
        notes
          .notes()
          .slice(0, 2)
          .map((n) => n.pinned),
      ).toEqual([true, true]);
      expect(notes.notes()[2].title).toBe('Primeira');
      expect(notes.pinnedCount()).toBe(2);
    });
  });

  describe('cor', () => {
    it('guarda a cor escolhida e descarta valor estranho', () => {
      const notes = setup();

      expect(notes.add(input({ color: 'mint' })).color).toBe('mint');
      expect(notes.add(input({ color: 'arco-iris' as NoteColor })).color).toBe('none');
    });

    it('trocar a cor não conta como edição', async () => {
      const notes = setup();
      const note = notes.add(input({ title: 'A' }));

      await wait();
      notes.setColor(note.id, 'sky');

      const [changed] = notes.notes();
      expect(changed.color).toBe('sky');
      expect(changed.updatedAt).toBe(note.updatedAt);
    });

    it('lista as cores em uso', () => {
      const notes = setup();
      notes.add(input({ title: 'A', color: 'rose' }));
      notes.add(input({ title: 'B' }));

      expect([...notes.usedColors()].sort()).toEqual(['none', 'rose']);
    });
  });

  describe('histórico de versões', () => {
    it('guarda o estado anterior ao editar o texto', async () => {
      const notes = setup();
      const note = notes.add(input({ title: 'A', content: '<div>antes</div>' }));

      await wait();
      await notes.update(note.id, input({ title: 'B', content: '<div>depois</div>' }));

      const [updated] = notes.notes();
      expect(updated.history).toHaveLength(1);
      expect(updated.history[0].title).toBe('A');
      expect(updated.history[0].content).toBe('<div>antes</div>');
      expect(updated.history[0].at).toBe(note.updatedAt);
    });

    it('mexer só no vínculo não gera versão', async () => {
      const notes = setup();
      const note = notes.add(input({ title: 'A', content: '<div>a</div>' }));

      await wait();
      await notes.update(
        note.id,
        input({ title: 'A', content: '<div>a</div>', categoryId: 'groceries' }),
      );

      expect(notes.notes()[0].history).toEqual([]);
      expect(notes.notes()[0].categoryId).toBe('groceries');
    });

    it('guarda no máximo as últimas versões', async () => {
      const notes = setup();
      const note = notes.add(input({ title: 'v0' }));

      for (let i = 1; i <= HISTORY_MAX + 2; i++) {
        await wait();
        await notes.update(note.id, input({ title: `v${i}` }));
      }

      const [updated] = notes.notes();
      expect(updated.title).toBe(`v${HISTORY_MAX + 2}`);
      expect(updated.history).toHaveLength(HISTORY_MAX);
      expect(updated.history[0].title).toBe(`v${HISTORY_MAX + 1}`);
      expect(updated.history.at(-1)?.title).toBe('v2');
    });

    it('restaurar volta o texto e deixa desfazer de novo', async () => {
      const notes = setup();
      const note = notes.add(input({ title: 'A', content: '<div>antes</div>' }));

      await wait();
      await notes.update(note.id, input({ title: 'B', content: '<div>depois</div>' }));

      const version = notes.notes()[0].history[0];
      expect(notes.restore(note.id, version.at)).toBe(true);

      const [restored] = notes.notes();
      expect(restored.title).toBe('A');
      expect(restored.content).toBe('<div>antes</div>');
      expect(restored.history[0].title).toBe('B');
    });

    it('restaurar versão que não existe devolve falso', () => {
      const notes = setup();
      const note = notes.add(input({ title: 'A' }));

      expect(notes.restore(note.id, 'nunca')).toBe(false);
    });
  });

  describe('senha própria da anotação', () => {
    const SENHA = 'cofre123';

    it('trancar esconde o texto no disco e mantém a anotação aberta na sessão', async () => {
      const notes = setup();
      const note = notes.add(
        input({ title: 'Documentos', content: '<div>RG 123</div>', checklist: [item('Xerox')] }),
      );

      expect(await notes.lock(note.id, SENHA)).toBe(true);

      const [locked] = notes.notes();
      expect(locked.vault).not.toBeNull();
      expect(locked.content).toBe('');
      expect(locked.checklist).toEqual([]);
      expect(locked.title).toBe('Documentos');

      expect(notes.isRevealed(note.id)).toBe(true);
      expect(notes.revealedOf(note.id)?.content).toBe('<div>RG 123</div>');
    });

    it('depois de recarregar, o texto não volta sem a senha', async () => {
      const first = setup();
      const note = first.add(input({ title: 'Documentos', content: '<div>RG 123</div>' }));
      await first.lock(note.id, SENHA);
      await TestBed.tick();

      const stored = localStorage.getItem(STORAGE_KEYS.NOTES)!;
      expect(stored).not.toContain('RG 123');

      const notes = reload(JSON.parse(stored));
      expect(notes.isRevealed(note.id)).toBe(false);
      expect(notes.revealedOf(note.id)).toBeNull();
      expect(notes.search('RG')).toEqual([]);
      expect(notes.search('Documentos')).toHaveLength(1);
    });

    it('a senha certa abre e a errada não', async () => {
      const first = setup();
      const note = first.add(input({ title: 'A', content: '<div>segredo</div>' }));
      await first.lock(note.id, SENHA);
      await TestBed.tick();

      const notes = reload(JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTES)!));

      expect(await notes.reveal(note.id, 'errada')).toBe(false);
      expect(notes.isRevealed(note.id)).toBe(false);

      expect(await notes.reveal(note.id, SENHA)).toBe(true);
      expect(notes.revealedOf(note.id)?.content).toBe('<div>segredo</div>');

      notes.hide(note.id);
      expect(notes.isRevealed(note.id)).toBe(false);
    });

    it('salvar anotação trancada que não foi aberta não passa', async () => {
      const first = setup();
      const note = first.add(input({ title: 'A', content: '<div>segredo</div>' }));
      await first.lock(note.id, SENHA);
      await TestBed.tick();

      const notes = reload(JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTES)!));

      expect(await notes.update(note.id, input({ title: 'B' }))).toBe(false);
      expect(notes.notes()[0].title).toBe('A');
    });

    it('editar uma anotação aberta sela o texto novo', async () => {
      const notes = setup();
      const note = notes.add(input({ title: 'A', content: '<div>antes</div>' }));
      await notes.lock(note.id, SENHA);

      expect(await notes.update(note.id, input({ title: 'A', content: '<div>depois</div>' }))).toBe(
        true,
      );

      expect(notes.notes()[0].content).toBe('');
      expect(notes.revealedOf(note.id)?.content).toBe('<div>depois</div>');

      await TestBed.tick();
      expect(localStorage.getItem(STORAGE_KEYS.NOTES)).not.toContain('depois');
    });

    it('tirar a senha devolve o texto em claro', async () => {
      const notes = setup();
      const note = notes.add(input({ title: 'A', content: '<div>segredo</div>' }));
      await notes.lock(note.id, SENHA);

      expect(await notes.unlock(note.id, 'errada')).toBe(false);
      expect(await notes.unlock(note.id, SENHA)).toBe(true);

      const [open] = notes.notes();
      expect(open.vault).toBeNull();
      expect(open.content).toBe('<div>segredo</div>');
      expect(notes.isRevealed(note.id)).toBe(false);
    });

    it('trancar apaga o histórico, que guardava o texto de antes', async () => {
      const notes = setup();
      const note = notes.add(input({ title: 'A', content: '<div>antes</div>' }));
      await wait();
      await notes.update(note.id, input({ title: 'A', content: '<div>depois</div>' }));
      expect(notes.notes()[0].history).toHaveLength(1);

      await notes.lock(note.id, SENHA);
      expect(notes.notes()[0].history).toEqual([]);
    });

    it('trancar apaga o rascunho em claro daquela anotação', async () => {
      const notes = setup();
      const drafts = TestBed.inject(NoteDraftService);
      const note = notes.add(input({ title: 'A', content: '<div>a</div>' }));

      drafts.save(note.id, input({ title: 'A', content: '<div>segredo em rascunho</div>' }));
      await notes.lock(note.id, SENHA);
      await TestBed.tick();

      expect(drafts.forNote(note.id)).toBeNull();
      expect(localStorage.getItem(STORAGE_KEYS.NOTE_DRAFT)).toBeNull();
    });

    it('não tranca anotação com comprovante anexado', async () => {
      const notes = setup();
      const note = notes.add(
        input({
          title: 'A',
          content: '<div>a</div>',
          attachments: [{ id: 'x', name: 'nota.png', type: 'image/png', size: 10 }],
        }),
      );

      expect(await notes.lock(note.id, SENHA)).toBe(false);
      expect(notes.notes()[0].vault).toBeNull();
    });
  });

  describe('busca', () => {
    it('acha por título e por conteúdo, ignorando acento e caixa', () => {
      const notes = setup();

      notes.add(input({ title: 'Férias', content: '<div>Reservar hotel</div>' }));
      notes.add(input({ title: 'Mercado', content: '<div>Comprar arroz</div>' }));

      expect(notes.search('ferias').map((n) => n.title)).toEqual(['Férias']);
      expect(notes.search('arroz').map((n) => n.title)).toEqual(['Mercado']);
    });

    it('acha pelo texto de um item da checklist', () => {
      const notes = setup();
      notes.add(input({ title: 'Lista', checklist: [item('Detergente')] }));

      expect(notes.search('detergente')).toHaveLength(1);
    });

    it('não casa com a marcação, só com o texto', () => {
      const notes = setup();
      notes.add(input({ title: 'A', content: '<b>negrito</b>' }));

      expect(notes.search('negrito')).toHaveLength(1);
      expect(notes.search('<b>')).toHaveLength(0);
    });

    it('busca vazia devolve tudo', () => {
      const notes = setup();
      notes.add(input({ title: 'A' }));
      notes.add(input({ title: 'B' }));

      expect(notes.search('   ')).toHaveLength(2);
    });
  });

  describe('persistência', () => {
    it('grava no storage', async () => {
      const notes = setup();
      notes.add(input({ title: 'A', content: '<div>a</div>' }));
      await TestBed.tick();

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTES)!);
      expect(stored).toHaveLength(1);
      expect(stored[0].title).toBe('A');
    });

    it('completa campos ausentes de um registro antigo', () => {
      const notes = reload([{ id: 'velha', content: '<div>Conteúdo</div>' }]);
      const [note] = notes.notes();

      expect(note.title).toBe('Conteúdo');
      expect(note.pinned).toBe(false);
      expect(note.checklist).toEqual([]);
      expect(note.attachments).toEqual([]);
      expect(note.remindOn).toBeNull();
      expect(note.updatedAt).toBe(note.createdAt);
    });

    it('sanitiza o que vem do disco, não só o que o editor manda', () => {
      const notes = reload([
        { id: 'x', title: 'A', content: '<script>alert(1)</script><b>ok</b>' },
      ]);

      expect(notes.notes()[0].content).toBe('<b>ok</b>');
    });

    it('leva o campo antigo de conta para o grupo certo', () => {
      const notes = reload([
        { id: 'a', title: 'A', accountId: 'nubank' } as Partial<Note>,
        { id: 'b', title: 'B', accountId: 'pix' } as Partial<Note>,
      ]);

      const a = notes.notes().find((n) => n.id === 'a')!;
      const b = notes.notes().find((n) => n.id === 'b')!;

      expect([a.bankId, a.methodId]).toEqual(['nubank', null]);
      expect([b.bankId, b.methodId]).toEqual([null, 'pix']);
    });

    it('descarta lembrete inválido vindo do disco', () => {
      const notes = reload([{ id: 'x', title: 'A', remindOn: 'ontem' }]);

      expect(notes.notes()[0].remindOn).toBeNull();
    });
  });
});
