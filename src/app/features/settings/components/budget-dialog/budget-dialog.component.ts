import { ChangeDetectionStrategy, Component, computed, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { findCategory } from '../../../../core/constants/categories';
import {
  ButtonComponent,
  CategoryPickerComponent,
  DialogComponent,
  InputComponent,
  TileIconComponent,
} from '../../../../shared/ui';

export interface BudgetLimit {
  categoryId: string;
  limit: number;
}

@Component({
  selector: 'app-budget-dialog',
  imports: [
    FormsModule,
    DialogComponent,
    InputComponent,
    ButtonComponent,
    CategoryPickerComponent,
    TileIconComponent,
  ],
  templateUrl: './budget-dialog.component.html',
  styleUrl: './budget-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BudgetDialogComponent {
  readonly saved = output<BudgetLimit>();

  private readonly dialog = viewChild.required(DialogComponent);

  protected readonly editing = signal(false);
  protected readonly categoryId = signal('');
  protected readonly raw = signal('');
  protected readonly submitted = signal(false);

  protected readonly category = computed(() =>
    this.categoryId() ? findCategory(this.categoryId()) : null,
  );

  protected readonly title = computed(() =>
    this.editing() ? `Limite de ${this.category()?.label}` : 'Novo limite',
  );

  private readonly parsed = computed(() => Number(this.raw().replace(',', '.')));

  private readonly valid = computed(
    () => this.raw().trim() !== '' && Number.isFinite(this.parsed()) && this.parsed() > 0,
  );

  protected readonly amountError = computed(() =>
    this.submitted() && !this.valid() ? 'Informe um valor maior que zero.' : undefined,
  );

  protected readonly categoryError = computed(() =>
    this.submitted() && !this.categoryId() ? 'Escolha uma categoria.' : undefined,
  );

  open(categoryId = '', limit = 0): void {
    this.editing.set(!!categoryId);
    this.categoryId.set(categoryId);
    this.raw.set(limit ? String(limit) : '');
    this.submitted.set(false);
    this.dialog().open();
  }

  close(): void {
    this.dialog().close();
  }

  protected submit(): void {
    this.submitted.set(true);
    if (!this.valid() || !this.categoryId()) return;

    this.saved.emit({
      categoryId: this.categoryId(),
      limit: Math.round(this.parsed() * 100) / 100,
    });
    this.close();
  }
}
