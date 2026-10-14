import {
  ChangeDetectionStrategy,
  Component,
  computed,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Note } from '../../../../core/domain/models';
import { toDateKey } from '../../../../shared/utils/date';
import {
  AccountPickerComponent,
  ButtonComponent,
  CategoryPickerComponent,
  DialogComponent,
  InputComponent,
} from '../../../../shared/ui';

export interface LaunchResult {
  description: string;
  amount: number;
  categoryId: string;
  bankId: string | null;
  methodId: string | null;
  date: string;
}

@Component({
  selector: 'app-launch-dialog',
  imports: [
    CurrencyPipe,
    FormsModule,
    DialogComponent,
    InputComponent,
    ButtonComponent,
    CategoryPickerComponent,
    AccountPickerComponent,
  ],
  templateUrl: './launch-dialog.component.html',
  styleUrl: './launch-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LaunchDialogComponent {
  readonly launched = output<LaunchResult>();

  private readonly dialog = viewChild.required(DialogComponent);

  protected readonly description = signal('');
  protected readonly categoryId = signal('');
  protected readonly bankId = signal<string | null>(null);
  protected readonly methodId = signal<string | null>(null);
  protected readonly date = signal(toDateKey());
  protected readonly amount = signal(0);
  protected readonly submitted = signal(false);
  protected readonly itemCount = signal(0);

  protected readonly descriptionError = computed(() =>
    this.submitted() && this.description().trim() === '' ? 'Informe uma descrição.' : undefined,
  );

  protected readonly categoryError = computed(() =>
    this.submitted() && !this.categoryId() ? 'Escolha uma categoria.' : undefined,
  );

  open(note: Note, amount: number, itemCount: number): void {
    this.description.set(note.title);
    this.categoryId.set(note.categoryId ?? '');
    this.bankId.set(note.bankId);
    this.methodId.set(note.methodId);
    this.date.set(toDateKey());
    this.amount.set(amount);
    this.itemCount.set(itemCount);
    this.submitted.set(false);

    this.dialog().open();
  }

  protected submit(): void {
    this.submitted.set(true);
    if (this.descriptionError() || this.categoryError() || this.amount() <= 0) return;

    this.launched.emit({
      description: this.description().trim(),
      amount: this.amount(),
      categoryId: this.categoryId(),
      bankId: this.bankId(),
      methodId: this.methodId(),
      date: this.date(),
    });

    this.dialog().close();
  }
}
