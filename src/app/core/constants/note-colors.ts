import { NoteColor } from '../domain/models';

export const NOTE_COLORS: readonly { id: NoteColor; label: string }[] = [
  { id: 'none', label: 'Sem cor' },
  { id: 'mint', label: 'Verde' },
  { id: 'sky', label: 'Azul' },
  { id: 'lilac', label: 'Lilás' },
  { id: 'rose', label: 'Rosa' },
  { id: 'amber', label: 'Âmbar' },
  { id: 'sand', label: 'Areia' },
  { id: 'slate', label: 'Cinza' },
];

const IDS = new Set<string>(NOTE_COLORS.map((c) => c.id));

export function isNoteColor(value: unknown): value is NoteColor {
  return typeof value === 'string' && IDS.has(value);
}

export function noteColorLabel(id: NoteColor): string {
  return NOTE_COLORS.find((c) => c.id === id)?.label ?? 'Sem cor';
}
