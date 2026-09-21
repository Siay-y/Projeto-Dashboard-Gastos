import { formatCurrency } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  LOCALE_ID,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { categoriesFor } from '../../../../core/constants/categories';
import { Transaction, TransactionType } from '../../../../core/domain/models';
import { TransactionInput } from '../../../../core/services/transaction.service';
import { ButtonComponent, InputComponent } from '../../../../shared/ui';
import { toDateKey } from '../../../../shared/utils/date';
import { AccountPickerComponent } from '../account-picker/account-picker.component';
import { CategoryPickerComponent } from '../category-picker/category-picker.component';

const MAX_DESCRIPTION = 60;
const MIN_INSTALLMENTS = 2;
const MAX_INSTALLMENTS = 48;

/** Converte "12,50" / "12.50" em número; NaN se inválido. */
function parseAmount(raw: string): number {
  return Number(String(raw).replace(',', '.'));
}

function amountValidator(control: AbstractControl<string>): ValidationErrors | null {
  const value = parseAmount(control.value);
  return Number.isFinite(value) && value > 0 ? null : { amount: true };
}

function installmentsValidator(control: AbstractControl<string>): ValidationErrors | null {
  const value = Number(control.value);
  return Number.isInteger(value) && value >= MIN_INSTALLMENTS && value <= MAX_INSTALLMENTS
    ? null
    : { installments: true };
}

/**
 * Formulário de criação/edição de transação (Reactive Forms).
 * Não persiste nada: emite `saved` com os dados normalizados.
 */
@Component({
  selector: 'app-transaction-form',
  imports: [
    ReactiveFormsModule,
    InputComponent,
    ButtonComponent,
    CategoryPickerComponent,
    AccountPickerComponent,
  ],
  templateUrl: './transaction-form.component.html',
  styleUrl: './transaction-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly locale = inject(LOCALE_ID);

  readonly saved = output<TransactionInput>();
  readonly cancelled = output<void>();

  protected readonly maxDescription = MAX_DESCRIPTION;
  protected readonly minInstallments = MIN_INSTALLMENTS;
  protected readonly maxInstallments = MAX_INSTALLMENTS;
  protected readonly submitted = signal(false);

  /** Espelhos em Signal dos campos que a UI precisa observar. */
  protected readonly type = signal<TransactionType>('expense');
  protected readonly categoryId = signal('');
  protected readonly accountId = signal<string | null>(null);
  protected readonly installed = signal(false);
  protected readonly amountRaw = signal('');
  protected readonly installmentsRaw = signal('');

  protected readonly form = this.fb.nonNullable.group({
    type: ['expense' as TransactionType, Validators.required],
    amount: ['', [Validators.required, amountValidator]],
    description: ['', [Validators.required, Validators.maxLength(MAX_DESCRIPTION)]],
    date: [toDateKey(), Validators.required],
    categoryId: ['', Validators.required],
    accountId: [null as string | null],
    installments: [''],
  });

  /** Resumo "10× de R$ 100,00 = R$ 1.000,00" enquanto preenche. */
  protected readonly installmentSummary = computed(() => {
    const count = Number(this.installmentsRaw());
    const amount = parseAmount(this.amountRaw());
    if (!this.installed() || !Number.isInteger(count) || count < MIN_INSTALLMENTS) return null;
    if (!Number.isFinite(amount) || amount <= 0) return null;

    const each = formatCurrency(amount, this.locale, 'R$');
    const total = formatCurrency(amount * count, this.locale, 'R$');
    return `${count}× de ${each} = ${total} no total`;
  });

  constructor() {
    this.form.controls.amount.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((v) => this.amountRaw.set(v));
    this.form.controls.installments.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((v) => this.installmentsRaw.set(v));
  }

  /** Carrega uma transação para edição, ou limpa para criação. */
  load(transaction: Transaction | null): void {
    this.submitted.set(false);

    this.form.reset({
      type: transaction?.type ?? 'expense',
      amount: transaction ? String(transaction.amount) : '',
      description: transaction?.description ?? '',
      date: transaction?.date ?? toDateKey(),
      categoryId: transaction?.categoryId ?? '',
      accountId: transaction?.accountId ?? null,
      installments: transaction?.installments ? String(transaction.installments) : '',
    });

    this.type.set(this.form.controls.type.value);
    this.categoryId.set(this.form.controls.categoryId.value);
    this.accountId.set(this.form.controls.accountId.value);
    this.setInstalled(!!transaction?.installments);
  }

  protected setType(type: TransactionType): void {
    if (type === this.type()) return;

    this.type.set(type);
    this.form.controls.type.setValue(type);

    // Parcelamento só existe para gastos.
    if (type === 'income') this.setInstalled(false);

    // Categoria atual pode não existir no outro tipo — limpa se for o caso.
    const stillValid = categoriesFor(type).some((c) => c.id === this.categoryId());
    if (!stillValid) this.setCategory('');
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

  /** Liga/desliga o parcelamento, ajustando a validação do campo de parcelas. */
  protected setInstalled(value: boolean): void {
    this.installed.set(value);
    const control = this.form.controls.installments;

    if (value) {
      control.setValidators([Validators.required, installmentsValidator]);
    } else {
      control.clearValidators();
      control.setValue('');
    }
    control.updateValueAndValidity();
  }

  protected errorFor(field: keyof typeof this.form.controls): string | undefined {
    const control = this.form.controls[field];
    if (control.valid || !(control.touched || this.submitted())) return undefined;

    if (control.hasError('required')) return 'Campo obrigatório.';
    if (control.hasError('amount')) return 'Informe um valor maior que zero.';
    if (control.hasError('installments')) {
      return `Entre ${MIN_INSTALLMENTS} e ${MAX_INSTALLMENTS} parcelas.`;
    }
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
      type: value.type,
      amount: parseAmount(value.amount),
      description: value.description,
      date: value.date,
      categoryId: value.categoryId,
      accountId: value.accountId,
      installments: this.installed() ? Number(value.installments) : null,
    });
  }
}
