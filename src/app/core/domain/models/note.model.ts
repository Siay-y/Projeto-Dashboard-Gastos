import { Envelope } from '../../security/crypto';

export interface NoteChecklistItem {
  id: string;
  text: string;
  amount: number | null;
  done: boolean;
}

/** Os bytes ficam no IndexedDB; aqui só o que a lista precisa mostrar. */
export interface NoteAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
}

export type NoteColor = 'none' | 'mint' | 'sky' | 'lilac' | 'rose' | 'amber' | 'sand' | 'slate';

export interface NoteVersion {
  at: string;
  title: string;
  content: string;
  checklist: NoteChecklistItem[];
}

/**
 * Conteúdo selado com a senha da própria anotação, independente do PIN. O
 * AES-GCM é autenticado: decifrar já valida a senha, sem guardar conferência.
 */
export interface NoteVault {
  salt: string;
  payload: Envelope;
}

export interface Note {
  id: string;
  title: string;
  /** Vazio enquanto `vault` existe: o texto real está selado. */
  content: string;
  checklist: NoteChecklistItem[];
  attachments: NoteAttachment[];
  remindOn: string | null;
  categoryId: string | null;
  bankId: string | null;
  methodId: string | null;
  transactionId: string | null;
  color: NoteColor;
  history: NoteVersion[];
  vault: NoteVault | null;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export type NoteInput = Omit<
  Note,
  'id' | 'pinned' | 'createdAt' | 'updatedAt' | 'history' | 'vault'
>;

export interface NoteDraft extends NoteInput {
  /** `null` enquanto a anotação não existe: o rascunho é de uma nova. */
  noteId: string | null;
  savedAt: string;
}
