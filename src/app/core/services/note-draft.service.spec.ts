import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NoteInput } from '../domain/models';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { NoteDraftService } from './note-draft.service';

const input = (changes: Partial<NoteInput> = {}): NoteInput => ({
  title: '',
  content: '',
  checklist: [],
  attachments: [],
  remindOn: null,
  categoryId: null,
  bankId: null,
  methodId: null,
  color: 'none',
  transactionId: null,
  ...changes,
});

function setup(): NoteDraftService {
  localStorage.clear();
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

  return TestBed.inject(NoteDraftService);
}

describe('NoteDraftService', () => {
  it('sem rascunho, não devolve nada', () => {
    const drafts = setup();

    expect(drafts.draft()).toBeNull();
    expect(drafts.forNote(null)).toBeNull();
  });

  it('guarda o rascunho da anotação nova', () => {
    const drafts = setup();

    drafts.save(null, input({ title: 'Em andamento' }));

    expect(drafts.forNote(null)?.title).toBe('Em andamento');
    expect(drafts.forNote('outra')).toBeNull();
  });

  it('guarda o rascunho de uma anotação existente', () => {
    const drafts = setup();

    drafts.save('nota-1', input({ content: '<div>meio escrito</div>' }));

    expect(drafts.forNote('nota-1')?.content).toBe('<div>meio escrito</div>');
    expect(drafts.forNote(null)).toBeNull();
  });

  it('só existe um rascunho por vez: o último vence', () => {
    const drafts = setup();

    drafts.save(null, input({ title: 'Primeiro' }));
    drafts.save('nota-1', input({ title: 'Segundo' }));

    expect(drafts.forNote(null)).toBeNull();
    expect(drafts.forNote('nota-1')?.title).toBe('Segundo');
  });

  it('limpar apaga da memória e do disco', () => {
    const drafts = setup();

    drafts.save(null, input({ title: 'x' }));
    drafts.clear();

    expect(drafts.draft()).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.NOTE_DRAFT)).toBeNull();
  });

  it('sobrevive ao recarregar a página', () => {
    const drafts = setup();
    drafts.save('nota-1', input({ title: 'Não perdi' }));

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    expect(TestBed.inject(NoteDraftService).forNote('nota-1')?.title).toBe('Não perdi');
  });

  it('registra quando foi salvo', () => {
    const drafts = setup();

    drafts.save(null, input({ title: 'x' }));

    expect(Date.parse(drafts.draft()!.savedAt)).not.toBeNaN();
  });
});
