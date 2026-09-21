import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { RecurringExpense } from '../../../../core/domain/models';
import { RecurringExpenseInput } from '../../../../core/services/recurring-expense.service';
import { ButtonComponent, InputComponent } from '../../../../shared/ui';
import { AccountPickerComponent } from '../account-picker/account-picker.component';
import { CategoryPickerComponent } from '../category-picker/category-picker.component';

const MAX_DESCRIPTION = 60;

function parseAmount(raw: string): number {
  return Number(String(raw).replace(',', '.'));
}

function amountValidator(control: AbstractControl<string>): ValidationErrors | null {
  const value = parseAmount(control.value);
  return Number.isFinite(value) && value > 0 ? null : { amount: true };
}

/** Vazio é permitido; se preenchido, precisa ser um dia entre 1 e 31. */
function dueDayValidator(control: AbstractControl<string>): ValidationErrors | null {
  const raw = control.value.trim();
  if (raw === '') return null;
  const day = Number(raw);
  return Number.isInteger(day) && day >= 1 && day <= 31 ? null : { dueDay: true };
}

/**
 * Formulário de gasto fixo: descrição, valor, dia de cobrança e categoria.
 * Emite `saved` com os dados normalizados; não persiste.
 */
@Component({
  selector: 'app-recurring-form',
  imports: [
    ReactiveFormsModule,
    InputComponent,
    ButtonComponent,
    CategoryPickerComponent,
    AccountPickerComponent,
  ],
  templateUrl: './recurring-form.component.html',
  styleUrl: './recurring-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecurringFormComponent {
  private readonly fb = inject(FormBuilder);

  readonly saved = output<RecurringExpenseInput>();
  readonly cancelled = output<void>();

  protected readonly maxDescription = MAX_DESCRIPTION;
  protected readonly submitted = signal(false);
  protected readonly categoryId = signal('');
  protected readonly accountId = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    description: ['', [Validators.required, Validators.maxLength(MAX_DESCRIPTION)]],
    amount: ['', [Validators.required, amountValidator]],
    dueDay: ['', dueDayValidator],
    categoryId: ['', Validators.required],
    accountId: [null as string | null],
  });

  load(item: RecurringExpense | null): void {
    this.submitted.set(false);
    this.form.reset({
      description: item?.description ?? '',
      amount: item ? String(item.amount) : '',
      dueDay: item?.dueDay ? String(item.dueDay) : '',
      categoryId: item?.categoryId ?? '',
      accountId: item?.accountId ?? null,
    });
    this.categoryId.set(this.form.controls.categoryId.value);
    this.accountId.set(this.form.controls.accountId.value);
  }

  protected setCategory(id: string): void {
    this.categoryId.set(id);
    this.form.controls.categoryId.setValue(id);
    this.form.controls.categoryId.markAsTouched();
  }

  protected setAccount(id: string | null): void {
    this.accountId.set(id);
    this.form.controls.accountId.setValue(id);
  }

  protected errorFor(field: keyof typeof this.form.controls): string | undefined {
    const control = this.form.controls[field];
    if (control.valid || !(control.touched || this.submitted())) return undefined;

    if (control.hasError('required')) return 'Campo obrigatório.';
    if (control.hasError('amount')) return 'Informe um valor maior que zero.';
    if (control.hasError('dueDay')) return 'Use um dia entre 1 e 31.';
    if (control.hasError('maxlength')) return `Máximo de ${MAX_DESCRIPTION} caracteres.`;
    return 'Valor inválido.';
  }

  protected submit(): void {
    this.submitted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.saved.emit({
      description: value.description,
      amount: parseAmount(value.amount),
      dueDay: value.dueDay.trim() ? Number(value.dueDay) : null,
      categoryId: value.categoryId,
      accountId: value.accountId,
    });
  }
}
