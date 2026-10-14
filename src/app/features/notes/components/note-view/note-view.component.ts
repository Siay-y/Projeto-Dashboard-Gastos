import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { findAccount } from '../../../../core/constants/accounts';
import { findCategory } from '../../../../core/constants/categories';
import {
  Category,
  Note,
  NoteAttachment,
  NoteChecklistItem,
  NoteColor,
  NoteVersion,
} from '../../../../core/domain/models';
import { checklistSummary } from '../../../../core/domain/note-checklist';
import { noteExcerpt } from '../../../../core/domain/note-html';
import { NoteService } from '../../../../core/services/note.service';
import {
  ButtonComponent,
  DialogComponent,
  InputComponent,
  TileIconComponent,
} from '../../../../shared/ui';
import { AttachmentPreviews } from '../../attachment-previews';
import { NoteColorPickerComponent } from '../note-color-picker/note-color-picker.component';

/** Painel de senha aberto no momento. */
type Prompt = 'none' | 'lock' | 'remove';

interface ViewChip {
  /** Rótulo não serve de chave: a categoria "Outros" e a forma "Outros" colidem. */
  id: string;
  icon: string;
  label: string;
  category?: Category;
}

const PASSWORD_MIN = 4;

@Component({
  selector: 'app-note-view',
  imports: [
    CurrencyPipe,
    DatePipe,
    FormsModule,
    ButtonComponent,
    DialogComponent,
    InputComponent,
    TileIconComponent,
    NoteColorPickerComponent,
  ],
  providers: [AttachmentPreviews],
  templateUrl: './note-view.component.html',
  styleUrl: './note-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoteViewComponent {
  protected readonly service = inject(NoteService);
  protected readonly previews = inject(AttachmentPreviews);

  readonly edit = output<Note>();
  readonly launch = output<Note>();

  private readonly dialog = viewChild.required<DialogComponent>('dlg');
  private readonly viewer = viewChild.required<DialogComponent>('viewerDialog');

  private readonly id = signal<string | null>(null);

  protected readonly passwordMin = PASSWORD_MIN;
  protected readonly canLock = this.service.canLock;

  // Lida da lista, não copiada: trancar, restaurar e marcar item refletem na hora.
  protected readonly note = computed(
    () => this.service.notes().find((n) => n.id === this.id()) ?? null,
  );

  protected readonly sealed = computed(() => {
    const note = this.note();
    return note !== null && note.vault !== null && !this.service.isRevealed(note.id);
  });

  /** Texto em claro: da anotação comum, ou o que foi aberto com a senha. */
  private readonly body = computed(() => {
    const note = this.note();
    if (!note) return null;

    return note.vault
      ? this.service.revealedOf(note.id)
      : { content: note.content, checklist: note.checklist };
  });

  /**
   * Vai para `[innerHTML]`, que passa pelo sanitizador do Angular. Nada de
   * `bypassSecurityTrust`: a lista de tags da anotação é subconjunto do que ele
   * permite, então a formatação sobrevive sem abrir brecha.
   */
  protected readonly content = computed(() => this.body()?.content ?? '');
  protected readonly checklist = computed<NoteChecklistItem[]>(() => this.body()?.checklist ?? []);
  protected readonly summary = computed(() => checklistSummary(this.checklist()));

  protected readonly category = computed(() => {
    const id = this.note()?.categoryId;
    return id ? findCategory(id) : null;
  });

  protected readonly chips = computed<ViewChip[]>(() => {
    const note = this.note();
    if (!note) return [];

    const list: ViewChip[] = [];
    if (note.remindOn) {
      list.push({ id: 'remind', icon: 'alarm', label: formatDay(note.remindOn) });
    }

    const category = this.category();
    if (category) list.push({ id: 'category', icon: '', label: category.label, category });

    const bank = findAccount(note.bankId);
    if (bank) list.push({ id: 'bank', icon: 'account_balance', label: bank.label });

    const method = findAccount(note.methodId);
    if (method) list.push({ id: 'method', icon: 'payments', label: method.label });

    if (note.transactionId) {
      list.push({ id: 'transaction', icon: 'receipt_long', label: 'Lançamento vinculado' });
    }

    return list;
  });

  protected readonly prompt = signal<Prompt>('none');
  protected readonly password = signal('');
  protected readonly confirm = signal('');
  protected readonly error = signal<string | null>(null);
  protected readonly working = signal(false);
  protected readonly showHistory = signal(false);
  protected readonly viewing = signal<{ name: string; url: string } | null>(null);

  open(note: Note): void {
    this.id.set(note.id);
    this.prompt.set('none');
    this.showHistory.set(false);
    this.clearForm();

    void this.previews.load(note.attachments);
    this.dialog().open();
  }

  protected close(): void {
    this.dialog().close();
  }

  protected onEdit(): void {
    const note = this.note();
    if (!note) return;

    this.close();
    this.edit.emit(note);
  }

  protected onLaunch(): void {
    const note = this.note();
    if (!note) return;

    this.close();
    this.launch.emit(note);
  }

  protected setColor(color: NoteColor): void {
    const note = this.note();
    if (note) this.service.setColor(note.id, color);
  }

  protected togglePinned(): void {
    const note = this.note();
    if (note) this.service.togglePinned(note.id);
  }

  protected toggleItem(itemId: string): void {
    const note = this.note();
    if (note) this.service.toggleChecklistItem(note.id, itemId);
  }

  protected async reveal(): Promise<void> {
    const note = this.note();
    if (!note || this.working()) return;

    this.working.set(true);
    const ok = await this.service.reveal(note.id, this.password());
    this.working.set(false);

    if (!ok) {
      this.error.set('Senha incorreta.');
      return;
    }

    this.clearForm();
    void this.previews.load(note.attachments);
  }

  protected hide(): void {
    const note = this.note();
    if (!note) return;

    this.service.hide(note.id);
    this.prompt.set('none');
    this.clearForm();
  }

  protected startPrompt(prompt: Prompt): void {
    this.prompt.set(prompt);
    this.clearForm();
  }

  protected async lock(): Promise<void> {
    const note = this.note();
    if (!note || this.working()) return;

    if (this.password().length < PASSWORD_MIN) {
      this.error.set(`Use pelo menos ${PASSWORD_MIN} caracteres.`);
      return;
    }
    if (this.password() !== this.confirm()) {
      this.error.set('As senhas não são iguais.');
      return;
    }

    this.working.set(true);
    const ok = await this.service.lock(note.id, this.password());
    this.working.set(false);

    if (!ok) {
      this.error.set('Não foi possível trancar esta anotação.');
      return;
    }

    this.prompt.set('none');
    this.clearForm();
  }

  protected async removeLock(): Promise<void> {
    const note = this.note();
    if (!note || this.working()) return;

    this.working.set(true);
    const ok = await this.service.unlock(note.id, this.password());
    this.working.set(false);

    if (!ok) {
      this.error.set('Senha incorreta.');
      return;
    }

    this.prompt.set('none');
    this.clearForm();
  }

  protected restore(at: string): void {
    const note = this.note();
    if (note) this.service.restore(note.id, at);
  }

  protected view(attachment: NoteAttachment): void {
    const url = this.previews.urlOf(attachment.id);
    if (!url) return;

    this.viewing.set({ name: attachment.name, url });
    this.viewer().open();
  }

  protected excerptOf(version: NoteVersion): string {
    return noteExcerpt(version.content, 90) || '(sem texto)';
  }

  protected sizeLabel(bytes: number): string {
    return bytes < 1024 * 1024
      ? `${Math.max(1, Math.round(bytes / 1024))} kB`
      : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  private clearForm(): void {
    this.password.set('');
    this.confirm.set('');
    this.error.set(null);
  }
}

function formatDay(dateKey: string): string {
  const [year, month, day] = dateKey.split('-');
  return `${day}/${month}/${year}`;
}
