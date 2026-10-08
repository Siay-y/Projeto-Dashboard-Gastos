import { ChangeDetectionStrategy, Component, computed, output, signal, viewChild } from '@angular/core';
import { PIN_LENGTH } from '../../../../core/services/security.service';
import { DialogComponent, PinInputComponent } from '../../../../shared/ui';

export type PinMode = 'create' | 'verify';

const COPY: Record<PinMode, { title: string; label: string; hint: string }> = {
  create: {
    title: 'Definir PIN',
    label: `Escolha ${PIN_LENGTH} dígitos`,
    hint: 'Você vai digitá-lo ao abrir o painel. Em seguida mostramos um código de recuperação.',
  },
  verify: {
    title: 'Confirme seu PIN',
    label: 'Digite seu PIN atual',
    hint: 'Precisamos dele para confirmar que é você.',
  },
};

/** Em `create`, pede duas vezes e compara antes de emitir. */
@Component({
  selector: 'app-pin-dialog',
  imports: [DialogComponent, PinInputComponent],
  templateUrl: './pin-dialog.component.html',
  styleUrl: './pin-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PinDialogComponent {
  readonly confirmed = output<string>();

  private readonly dialog = viewChild.required(DialogComponent);
  private readonly pinInput = viewChild.required(PinInputComponent);

  protected readonly pinLength = PIN_LENGTH;
  protected readonly mode = signal<PinMode>('create');
  protected readonly confirming = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  private first = '';

  protected readonly copy = computed(() => COPY[this.mode()]);

  protected readonly label = computed(() =>
    this.confirming() ? 'Repita o PIN' : this.copy().label,
  );

  open(mode: PinMode): void {
    this.mode.set(mode);
    this.reset();
    this.dialog().open();
  }

  close(): void {
    this.dialog().close();
  }

  /** O pai chama quando a validação assíncrona falha. */
  fail(message: string): void {
    this.busy.set(false);
    this.error.set(message);
    this.reset(message);
  }

  protected submit(pin: string): void {
    this.error.set(null);

    if (this.mode() === 'verify') {
      this.busy.set(true);
      this.confirmed.emit(pin);
      return;
    }

    if (!this.confirming()) {
      this.first = pin;
      this.confirming.set(true);
      this.pinInput().clear();
      return;
    }

    if (pin !== this.first) {
      this.fail('Os PINs não coincidem');
      return;
    }

    this.busy.set(true);
    this.confirmed.emit(pin);
  }

  protected onClosed(): void {
    this.reset();
  }

  private reset(error: string | null = null): void {
    this.first = '';
    this.confirming.set(false);
    this.busy.set(false);
    this.error.set(error);
    this.pinInput().clear();
  }
}
