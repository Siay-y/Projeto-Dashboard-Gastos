import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { hasCategory } from '../constants/categories';
import { isNoteColor } from '../constants/note-colors';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { readAccountSlots } from '../domain/account-slots';
import { Note, NoteChecklistItem, NoteInput, NoteVersion } from '../domain/models';
import { sanitizeChecklist } from '../domain/note-checklist';
import { deriveNoteTitle, noteToText, sanitizeNoteHtml } from '../domain/note-html';
import { deriveKey, isCryptoAvailable, randomSalt, seal, unseal } from '../security/crypto';
import { AttachmentStore } from './attachment.store';
import { NoteDraftService } from './note-draft.service';
import { StorageService } from './storage.service';

const UNTITLED = 'Sem título';
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** Teto do histórico: anotação vive no localStorage, que tem poucos megabytes. */
export const HISTORY_MAX = 5;

/** O que a senha da anotação protege. */
interface VaultContent {
  content: string;
  checklist: NoteChecklistItem[];
}

/**
 * Anotação aberta nesta sessão. Guarda a chave derivada, não a senha: dá para
 * re-selar ao salvar e nada reutilizável sobra na memória. Recarregar perde.
 */
interface RevealedNote extends VaultContent {
  key: CryptoKey;
}

@Injectable({ providedIn: 'root' })
export class NoteService {
  private readonly storage = inject(StorageService);
  private readonly attachments = inject(AttachmentStore);
  private readonly drafts = inject(NoteDraftService);

  private readonly _notes = signal<Note[]>(
    (this.storage.get<Partial<Note>[]>(STORAGE_KEYS.NOTES) ?? []).map(migrate),
  );

  private readonly _revealed = signal<ReadonlyMap<string, RevealedNote>>(new Map());

  readonly canLock = isCryptoAvailable();

  readonly notes = computed(() =>
    [...this._notes()].sort(
      (a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt),
    ),
  );

  readonly hasNotes = computed(() => this._notes().length > 0);
  readonly count = computed(() => this._notes().length);
  readonly pinnedCount = computed(() => this._notes().filter((n) => n.pinned).length);

  readonly reminders = computed(() => this._notes().filter((n) => n.remindOn !== null));

  readonly usedColors = computed(() => new Set(this._notes().map((n) => n.color)));

  private readonly byCategory = computed(() => {
    const map = new Map<string, Note[]>();

    for (const note of this.notes()) {
      if (!note.categoryId) continue;
      map.set(note.categoryId, [...(map.get(note.categoryId) ?? []), note]);
    }
    return map;
  });

  private readonly byTransaction = computed(
    () => new Map(this.notes().flatMap((n) => (n.transactionId ? [[n.transactionId, n]] : []))),
  );

  constructor() {
    effect(() => {
      this.storage.set(STORAGE_KEYS.NOTES, this._notes());
    });
  }

  add(input: NoteInput): Note {
    const now = new Date().toISOString();
    const note: Note = {
      ...normalize(input),
      id: crypto.randomUUID(),
      history: [],
      vault: null,
      pinned: false,
      createdAt: now,
      updatedAt: now,
    };

    this._notes.update((list) => [...list, note]);
    return note;
  }

  /** Falso quando a anotação está trancada e não foi aberta nesta sessão. */
  async update(id: string, input: NoteInput): Promise<boolean> {
    const current = this._notes().find((n) => n.id === id);
    if (!current) return false;

    const changes = normalize(input);
    const removed = this.attachmentsMissingFrom(current, changes.attachments);

    if (current.vault) {
      const open = this._revealed().get(id);
      if (!open) return false;

      const payload = await seal(open.key, {
        content: changes.content,
        checklist: changes.checklist,
      });

      this.remember(id, { key: open.key, content: changes.content, checklist: changes.checklist });
      this.write(id, {
        ...changes,
        ...sealedFields(),
        vault: { salt: current.vault.salt, payload },
      });
    } else {
      this.write(id, { ...changes, history: nextHistory(current, changes) });
    }

    void this.attachments.remove(removed);
    return true;
  }

  remove(id: string): void {
    const note = this._notes().find((n) => n.id === id);

    this._notes.update((list) => list.filter((n) => n.id !== id));
    this.forget(id);

    if (note) void this.attachments.remove(note.attachments.map((a) => a.id));
  }

  // Fixar não é edição: a data de alteração fica como estava.
  togglePinned(id: string): void {
    this._notes.update((list) =>
      list.map((note) => (note.id === id ? { ...note, pinned: !note.pinned } : note)),
    );
  }

  setColor(id: string, color: Note['color']): void {
    this.patch(id, { color });
  }

  toggleChecklistItem(noteId: string, itemId: string): void {
    const open = this._revealed().get(noteId);

    if (open) {
      void this.saveRevealedChecklist(noteId, open, toggle(open.checklist, itemId));
      return;
    }

    this._notes.update((list) =>
      list.map((note) =>
        note.id === noteId ? { ...note, checklist: toggle(note.checklist, itemId) } : note,
      ),
    );
  }

  restore(id: string, at: string): boolean {
    const current = this._notes().find((n) => n.id === id);
    const version = current?.history.find((v) => v.at === at);
    if (!current || !version || current.vault) return false;

    // Restaurar também é edição: o estado de agora entra no histórico e dá para voltar.
    this.write(id, {
      title: version.title,
      content: version.content,
      checklist: version.checklist,
      history: nextHistory(current, version),
    });
    return true;
  }

  /**
   * Tranca a anotação com uma senha própria, que não passa pelo PIN. O histórico
   * é apagado: ele guarda o texto em claro de antes e anularia a proteção.
   */
  async lock(id: string, password: string): Promise<boolean> {
    const note = this._notes().find((n) => n.id === id);
    if (!note || note.vault || !this.canLock || note.attachments.length > 0) return false;

    const salt = randomSalt();
    const key = await deriveKey(password, salt);
    const payload = await seal(key, { content: note.content, checklist: note.checklist });

    this.remember(id, { key, content: note.content, checklist: note.checklist });
    this.patch(id, { ...sealedFields(), vault: { salt, payload } });
    this.drafts.clearFor(id);
    return true;
  }

  /** Abre para leitura nesta sessão; o disco continua selado. */
  async reveal(id: string, password: string): Promise<boolean> {
    const note = this._notes().find((n) => n.id === id);
    if (!note?.vault || !this.canLock) return false;

    try {
      const key = await deriveKey(password, note.vault.salt);
      const content = await unseal<VaultContent>(key, note.vault.payload);

      this.remember(id, {
        key,
        content: sanitizeNoteHtml(content.content ?? ''),
        checklist: sanitizeChecklist(content.checklist ?? []),
      });
      return true;
    } catch {
      return false;
    }
  }

  hide(id: string): void {
    this.forget(id);
  }

  /** Tira a senha de vez: o texto volta a ficar em claro no disco. */
  async unlock(id: string, password: string): Promise<boolean> {
    if (!(await this.reveal(id, password))) return false;

    const open = this._revealed().get(id)!;
    this.patch(id, { content: open.content, checklist: open.checklist, vault: null });
    this.forget(id);
    return true;
  }

  isRevealed(id: string): boolean {
    return this._revealed().has(id);
  }

  revealedOf(id: string): VaultContent | null {
    const open = this._revealed().get(id);
    return open ? { content: open.content, checklist: open.checklist } : null;
  }

  search(query: string): Note[] {
    const term = normalizeTerm(query);
    if (!term) return this.notes();

    return this.notes().filter((note) => normalizeTerm(haystack(note)).includes(term));
  }

  forCategory(categoryId: string): Note[] {
    return this.byCategory().get(categoryId) ?? [];
  }

  forTransaction(transactionId: string): Note | undefined {
    return this.byTransaction().get(transactionId);
  }

  private async saveRevealedChecklist(
    id: string,
    open: RevealedNote,
    checklist: NoteChecklistItem[],
  ): Promise<void> {
    const note = this._notes().find((n) => n.id === id);
    if (!note?.vault) return;

    const payload = await seal(open.key, { content: open.content, checklist });

    this.remember(id, { ...open, checklist });
    this.patch(id, { vault: { salt: note.vault.salt, payload } });
  }

  /** Edição de conteúdo: mexe na data de alteração. */
  private write(id: string, changes: Partial<Note>): void {
    this.patch(id, { ...changes, updatedAt: new Date().toISOString() });
  }

  /** Mudança que não é edição, como cor, proteção ou item marcado. */
  private patch(id: string, changes: Partial<Note>): void {
    this._notes.update((list) =>
      list.map((note) => (note.id === id ? { ...note, ...changes } : note)),
    );
  }

  private remember(id: string, open: RevealedNote): void {
    this._revealed.update((current) => new Map(current).set(id, open));
  }

  private forget(id: string): void {
    this._revealed.update((current) => {
      const next = new Map(current);
      next.delete(id);
      return next;
    });
  }

  private attachmentsMissingFrom(note: Note, kept: Note['attachments']): string[] {
    const ids = new Set(kept.map((a) => a.id));
    return note.attachments.filter((a) => !ids.has(a.id)).map((a) => a.id);
  }
}

function normalize(input: NoteInput): NoteInput {
  const content = sanitizeNoteHtml(input.content);
  const checklist = sanitizeChecklist(input.checklist);
  const title = input.title.trim();

  return {
    content,
    checklist,
    attachments: input.attachments,
    title: title || deriveNoteTitle(content) || checklist[0]?.text || UNTITLED,
    remindOn: DATE_KEY.test(input.remindOn ?? '') ? input.remindOn : null,
    categoryId: hasCategory(input.categoryId) ? input.categoryId : null,
    ...readAccountSlots(input),
    transactionId: input.transactionId || null,
    color: isNoteColor(input.color) ? input.color : 'none',
  };
}

/** Campos que ficam vazios no disco enquanto a anotação está trancada. */
function sealedFields(): Pick<Note, 'content' | 'checklist' | 'attachments' | 'history'> {
  return { content: '', checklist: [], attachments: [], history: [] };
}

function nextHistory(
  current: Note,
  changes: Pick<Note, 'title' | 'content' | 'checklist'>,
): NoteVersion[] {
  if (!textChanged(current, changes)) return current.history;

  const version: NoteVersion = {
    at: current.updatedAt,
    title: current.title,
    content: current.content,
    checklist: current.checklist,
  };

  return [version, ...current.history.filter((v) => v.at !== version.at)].slice(0, HISTORY_MAX);
}

// Mexer só no vínculo ou na cor não gera versão: o histórico é do texto.
function textChanged(
  a: Pick<Note, 'title' | 'content' | 'checklist'>,
  b: Pick<Note, 'title' | 'content' | 'checklist'>,
): boolean {
  return (
    a.title !== b.title ||
    a.content !== b.content ||
    JSON.stringify(a.checklist) !== JSON.stringify(b.checklist)
  );
}

function toggle(items: NoteChecklistItem[], itemId: string): NoteChecklistItem[] {
  return items.map((item) => (item.id === itemId ? { ...item, done: !item.done } : item));
}

function migrate(raw: Partial<Note>): Note {
  const now = new Date().toISOString();
  const content = sanitizeNoteHtml(raw.content ?? '');
  const checklist = sanitizeChecklist(raw.checklist ?? []);

  return {
    id: raw.id ?? crypto.randomUUID(),
    title: raw.title?.trim() || deriveNoteTitle(content) || checklist[0]?.text || UNTITLED,
    content,
    checklist,
    attachments: raw.attachments ?? [],
    remindOn: DATE_KEY.test(raw.remindOn ?? '') ? raw.remindOn! : null,
    categoryId: raw.categoryId ?? null,
    ...readAccountSlots(raw),
    transactionId: raw.transactionId ?? null,
    color: isNoteColor(raw.color) ? raw.color : 'none',
    history: (raw.history ?? []).slice(0, HISTORY_MAX).map(migrateVersion),
    vault: raw.vault ?? null,
    pinned: raw.pinned ?? false,
    createdAt: raw.createdAt ?? now,
    updatedAt: raw.updatedAt ?? raw.createdAt ?? now,
  };
}

function migrateVersion(raw: Partial<NoteVersion>): NoteVersion {
  return {
    at: raw.at ?? '',
    title: raw.title ?? '',
    content: sanitizeNoteHtml(raw.content ?? ''),
    checklist: sanitizeChecklist(raw.checklist ?? []),
  };
}

function haystack(note: Note): string {
  return [note.title, noteToText(note.content), ...note.checklist.map((i) => i.text)].join('\n');
}

function normalizeTerm(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
