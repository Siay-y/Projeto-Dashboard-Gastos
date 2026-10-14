import {
  ChangeDetectionStrategy,
  Component,
  computed,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { NoteInput } from '../../../../core/domain/models';
import { ImportPreview } from '../../../../core/services/import.service';
import { ButtonComponent, DialogComponent } from '../../../../shared/ui';

const TITLE_LIMIT = 6;
const ISSUE_LIMIT = 8;

@Component({
  selector: 'app-note-import-dialog',
  imports: [ButtonComponent, DialogComponent],
  templateUrl: './note-import-dialog.component.html',
  styleUrl: './note-import-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoteImportDialogComponent {
  readonly confirmed = output<void>();

  private readonly dialog = viewChild.required(DialogComponent);

  protected readonly preview = signal<ImportPreview<NoteInput> | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly issueLimit = ISSUE_LIMIT;

  protected readonly count = computed(() => this.preview()?.items.length ?? 0);

  protected readonly titles = computed(() =>
    (this.preview()?.items ?? []).slice(0, TITLE_LIMIT).map((item) => item.title || 'Sem título'),
  );

  protected readonly rest = computed(() => Math.max(0, this.count() - TITLE_LIMIT));

  show(preview: ImportPreview<NoteInput> | null, error: string | null = null): void {
    this.preview.set(preview);
    this.error.set(error);
    this.dialog().open();
  }

  protected confirm(): void {
    this.confirmed.emit();
    this.dialog().close();
  }

  protected plural(n: number, singular: string, plural: string): string {
    return `${n} ${n === 1 ? singular : plural}`;
  }
}
