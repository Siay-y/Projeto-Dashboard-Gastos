import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Note,
  NoteAttachment,
  NoteChecklistItem,
  NoteColor,
  NoteInput,
} from '../../../../core/domain/models';
import { checklistSummary, parseChecklistAmount } from '../../../../core/domain/note-checklist';
import { isNoteEmpty } from '../../../../core/domain/note-html';
import {
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_TYPES,
  AttachmentStore,
} from '../../../../core/services/attachment.store';
import { NoteDraftService } from '../../../../core/services/note-draft.service';
import { NoteService } from '../../../../core/services/note.service';
import {
  AccountPickerComponent,
  ButtonComponent,
  CategoryPickerComponent,
  DialogComponent,
  InputComponent,
  RichTextComponent,
} from '../../../../shared/ui';
import { AttachmentPreviews } from '../../attachment-previews';
import { NoteColorPickerComponent } from '../note-color-picker/note-color-picker.component';
import { TransactionPickerComponent } from '../transaction-picker/transaction-picker.component';

export interface NoteSubmit {
  id: string | null;
  input: NoteInput;
}

type Section = 'checklist' | 'reminder' | 'link' | 'attachments' | 'color';

const SECTIONS: readonly { id: Section; icon: string; label: string }[] = [
  { id: 'checklist', icon: 'checklist', label: 'Checklist' },
  { id: 'reminder', icon: 'alarm', label: 'Lembrete' },
  { id: 'link', icon: 'link', label: 'Vínculo' },
  { id: 'attachments', icon: 'attach_file', label: 'Anexo' },
  { id: 'color', icon: 'palette', label: 'Cor' },
];

const TITLE_MAX = 80;
const DRAFT_DELAY_MS = 600;

@Component({
  selector: 'app-note-editor',
  imports: [
    CurrencyPipe,
    FormsModule,
    DialogComponent,
    InputComponent,
    ButtonComponent,
    RichTextComponent,
    CategoryPickerComponent,
    AccountPickerComponent,
    TransactionPickerComponent,
    NoteColorPickerComponent,
  ],
  providers: [AttachmentPreviews],
  templateUrl: './note-editor.component.html',
  styleUrl: './note-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoteEditorComponent {
  private readonly store = inject(AttachmentStore);
  private readonly drafts = inject(NoteDraftService);
  private readonly notes = inject(NoteService);
  protected readonly previews = inject(AttachmentPreviews);

  private readonly dialog = viewChild.required<DialogComponent>('dlg');
  private readonly viewer = viewChild.required<DialogComponent>('viewerDialog');
  private readonly picker = viewChild.required(TransactionPickerComponent);
  private readonly fileInput = viewChild.required<{ nativeElement: HTMLInputElement }>('fileInput');

  readonly saved = output<NoteSubmit>();

  protected readonly sections = SECTIONS;
  protected readonly titleMax = TITLE_MAX;
  protected readonly accept = ATTACHMENT_TYPES.join(',');
  protected readonly canAttach = this.store.supported;

  protected readonly title = signal('');
  protected readonly content = signal('');
  protected readonly checklist = signal<NoteChecklistItem[]>([]);
  protected readonly remindOn = signal('');
  protected readonly categoryId = signal('');
  protected readonly bankId = signal<string | null>(null);
  protected readonly methodId = signal<string | null>(null);
  protected readonly color = signal<NoteColor>('none');
  protected readonly transactionId = signal<string | null>(null);
  protected readonly attachments = signal<NoteAttachment[]>([]);

  protected readonly submitted = signal(false);
  protected readonly restored = signal(false);
  protected readonly attachError = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly viewing = signal<{ name: string; url: string } | null>(null);

  private readonly shown = signal<ReadonlySet<Section>>(new Set());
  private readonly files = new Map<string, File>();
  private readonly editing = signal<Note | null>(null);
  private timer: ReturnType<typeof setTimeout> | null = null;

  protected readonly dialogTitle = computed(() =>
    this.editing() ? 'Editar anotação' : 'Nova anotação',
  );

  /** Anotação trancada não aceita anexo nem rascunho: os dois ficariam em claro. */
  protected readonly sealed = computed(() => this.editing()?.vault != null);

  protected readonly summary = computed(() => checklistSummary(this.checklist()));

  protected readonly empty = computed(
    () =>
      this.title().trim() === '' &&
      isNoteEmpty(this.content()) &&
      this.checklist().length === 0 &&
      this.attachments().length === 0,
  );

  protected readonly error = computed(() =>
    this.submitted() && this.empty() ? 'Escreva algo antes de salvar.' : undefined,
  );

  openNew(): void {
    this.load(null);
    this.dialog().open();
  }

  openEdit(note: Note): void {
    this.load(note);
    this.dialog().open();
  }

  protected onTitle(value: string): void {
    this.title.set(value);
    this.touch();
  }

  protected onContent(value: string): void {
    this.content.set(value);
    this.touch();
  }

  protected onRemind(value: string): void {
    this.remindOn.set(value);
    this.touch();
  }

  protected onCategory(value: string): void {
    this.categoryId.set(value);
    this.touch();
  }

  protected onBank(value: string | null): void {
    this.bankId.set(value);
    this.touch();
  }

  protected onMethod(value: string | null): void {
    this.methodId.set(value);
    this.touch();
  }

  protected onColor(value: NoteColor): void {
    this.color.set(value);
    this.touch();
  }

  protected isShown(section: Section): boolean {
    if (this.shown().has(section)) return true;

    switch (section) {
      case 'checklist':
        return this.checklist().length > 0;
      case 'reminder':
        return this.remindOn() !== '';
      case 'link':
        return (
          this.categoryId() !== '' ||
          this.bankId() !== null ||
          this.methodId() !== null ||
          this.transactionId() !== null
        );
      case 'attachments':
        return this.attachments().length > 0;
      case 'color':
        return this.color() !== 'none';
    }
  }

  protected reveal(section: Section): void {
    this.shown.update((current) => new Set([...current, section]));
    if (section === 'checklist' && this.checklist().length === 0) this.addItem();
  }

  protected addItem(): void {
    this.checklist.update((list) => [
      ...list,
      { id: crypto.randomUUID(), text: '', amount: null, done: false },
    ]);
    this.touch();
  }

  protected setItemText(id: string, text: string): void {
    this.patchItem(id, { text });
  }

  protected setItemAmount(id: string, raw: string): void {
    this.patchItem(id, { amount: parseChecklistAmount(raw) });
  }

  protected toggleItem(id: string): void {
    const item = this.checklist().find((i) => i.id === id);
    this.patchItem(id, { done: !item?.done });
  }

  protected removeItem(id: string): void {
    this.checklist.update((list) => list.filter((item) => item.id !== id));
    this.touch();
  }

  protected openPicker(): void {
    this.picker().open();
  }

  protected onTransactionPicked(id: string | null): void {
    this.transactionId.set(id);
    this.touch();
  }

  protected pickFiles(): void {
    this.fileInput().nativeElement.click();
  }

  protected async onFiles(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    this.attachError.set(null);

    for (const file of Array.from(input.files ?? [])) {
      if (!ATTACHMENT_TYPES.includes(file.type)) {
        this.attachError.set(`"${file.name}" não é imagem nem PDF.`);
        continue;
      }
      if (file.size > ATTACHMENT_MAX_BYTES) {
        this.attachError.set(`"${file.name}" passa de ${ATTACHMENT_MAX_BYTES / 1024 / 1024} MB.`);
        continue;
      }

      const meta: NoteAttachment = {
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type,
        size: file.size,
      };

      this.files.set(meta.id, file);
      this.previews.hold(meta.id, file);
      this.attachments.update((list) => [...list, meta]);
    }

    input.value = '';
    this.touch();
  }

  protected removeAttachment(id: string): void {
    this.files.delete(id);
    this.previews.release(id);
    this.attachments.update((list) => list.filter((item) => item.id !== id));
    this.touch();
  }

  protected view(attachment: NoteAttachment): void {
    const url = this.previews.urlOf(attachment.id);
    if (!url) return;

    this.viewing.set({ name: attachment.name, url });
    this.viewer().open();
  }

  protected sizeLabel(bytes: number): string {
    return bytes < 1024 * 1024
      ? `${Math.max(1, Math.round(bytes / 1024))} kB`
      : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  protected close(): void {
    this.dialog().close();
  }

  protected discardDraft(): void {
    this.drafts.clear();
    this.restored.set(false);
    this.load(null);
    this.close();
  }

  /** Marca que algo mudou: o rascunho é gravado pouco depois. */
  protected touch(): void {
    if (this.timer) clearTimeout(this.timer);
    // Rascunho de anotação trancada iria em claro para o localStorage.
    if (this.sealed()) return;

    this.timer = setTimeout(() => {
      this.timer = null;
      if (!this.empty()) this.drafts.save(this.editing()?.id ?? null, this.snapshot());
    }, DRAFT_DELAY_MS);
  }

  protected async save(): Promise<void> {
    this.submitted.set(true);
    if (this.empty() || this.saving()) return;

    this.saving.set(true);

    for (const [id, file] of this.files) {
      await this.store.put(id, file);
    }

    this.files.clear();
    if (this.timer) clearTimeout(this.timer);
    this.drafts.clear();

    this.saved.emit({ id: this.editing()?.id ?? null, input: this.snapshot() });
    this.saving.set(false);
    this.close();
  }

  private snapshot(): NoteInput {
    return {
      title: this.title(),
      content: this.content(),
      checklist: this.checklist(),
      attachments: this.attachments(),
      remindOn: this.remindOn() || null,
      categoryId: this.categoryId() || null,
      bankId: this.bankId(),
      methodId: this.methodId(),
      transactionId: this.transactionId(),
      color: this.color(),
    };
  }

  private load(note: Note | null): void {
    this.previews.releaseAll();
    this.files.clear();
    this.editing.set(note);

    // Anotação trancada só abre pelo conteúdo que a senha liberou nesta sessão.
    const revealed = note?.vault ? this.notes.revealedOf(note.id) : null;
    const draft = note?.vault ? null : this.drafts.forNote(note?.id ?? null);
    const source: NoteInput | Note = draft ?? (note ? { ...note, ...revealed } : blank());

    this.title.set(source.title);
    this.content.set(source.content);
    this.checklist.set([...source.checklist]);
    this.attachments.set([...source.attachments]);
    this.remindOn.set(source.remindOn ?? '');
    this.categoryId.set(source.categoryId ?? '');
    this.bankId.set(source.bankId);
    this.methodId.set(source.methodId);
    this.transactionId.set(source.transactionId);
    this.color.set(source.color);

    this.shown.set(new Set());
    this.submitted.set(false);
    this.attachError.set(null);
    this.restored.set(draft !== null);

    void this.previews.load(this.attachments());
  }

  private patchItem(id: string, changes: Partial<NoteChecklistItem>): void {
    this.checklist.update((list) =>
      list.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    );
    this.touch();
  }
}

function blank(): NoteInput {
  return {
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
  };
}
