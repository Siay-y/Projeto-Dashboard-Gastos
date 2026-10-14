import { Injectable, inject, signal } from '@angular/core';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { NoteDraft, NoteInput } from '../domain/models';
import { StorageService } from './storage.service';

/**
 * Guarda o que está sendo escrito mas ainda não foi salvo, para fechar o
 * diálogo sem querer (ou perder a aba) não apagar o texto.
 */
@Injectable({ providedIn: 'root' })
export class NoteDraftService {
  private readonly storage = inject(StorageService);

  private readonly _draft = signal<NoteDraft | null>(
    this.storage.get<NoteDraft>(STORAGE_KEYS.NOTE_DRAFT),
  );

  readonly draft = this._draft.asReadonly();

  save(noteId: string | null, input: NoteInput): void {
    const record: NoteDraft = { ...input, noteId, savedAt: new Date().toISOString() };

    this._draft.set(record);
    this.storage.set(STORAGE_KEYS.NOTE_DRAFT, record);
  }

  clear(): void {
    this._draft.set(null);
    this.storage.remove(STORAGE_KEYS.NOTE_DRAFT);
  }

  /** Usado ao trancar: um rascunho em claro anularia a senha da anotação. */
  clearFor(noteId: string): void {
    if (this._draft()?.noteId === noteId) this.clear();
  }

  /** Rascunho da anotação informada, ou da nova quando `noteId` é nulo. */
  forNote(noteId: string | null): NoteDraft | null {
    const draft = this._draft();
    return draft?.noteId === noteId ? draft : null;
  }
}
