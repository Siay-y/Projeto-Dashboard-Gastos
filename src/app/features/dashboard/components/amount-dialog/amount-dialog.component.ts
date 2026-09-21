import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonComponent, DialogComponent, InputComponent } from '../../../../shared/ui';

/**
 * Dialog genérico para informar um único valor monetário
 * (usado em "Ajustar saldo" e "Renda mensal").
 */
@Component({
  selector: 'app-amount-dialog',
  imports: [FormsModule, DialogComponent, InputComponent, ButtonComponent],
  templateUrl: './amount-dialog.component.html',
  styleUrl: './amount-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AmountDialogComponent {
  readonly title = input.required<string>();
  readonly label = input.required<string>();
  readonly description = input<string>();
  readonly allowNegative = input(false);

  readonly saved = output<number>();

  private readonly dialog = viewChild.required(DialogComponent);

  protected readonly raw = signal('');
  protected readonly submitted = signal(false);

  protected readonly parsed = computed(() => Number(this.raw().replace(',', '.')));

  protected readonly isValid = computed(() => {
    const value = this.parsed();
    if (this.raw().trim() === '' || !Number.isFinite(value)) return false;
    return this.allowNegative() || value >= 0;
  });

  protected readonly error = computed(() => {
    if (!this.submitted() || this.isValid()) return undefined;
    return this.allowNegative() ? 'Informe um valor válido.' : 'Informe um valor igual ou maior que zero.';
  });

  open(currentValue: number): void {
    this.submitted.set(false);
    this.raw.set(currentValue ? String(currentValue) : '');
    this.dialog().open();
  }

  close(): void {
    this.dialog().close();
  }

  protected submit(): void {
    this.submitted.set(true);
    if (!this.isValid()) return;

    this.saved.emit(Math.round(this.parsed() * 100) / 100);
    this.close();
  }
}
