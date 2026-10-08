import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RECOVERY_CODE_LENGTH, normalizeRecoveryCode } from '../../core/security/crypto';
import { PIN_LENGTH, SecurityService } from '../../core/services/security.service';
import { StorageService } from '../../core/services/storage.service';
import { FadeInUpDirective } from '../../shared/directives/fade-in-up.directive';
// Sem o barril `shared/ui`: esta tela é eager e o barril traria os ícones de marcas.
import { ButtonComponent } from '../../shared/ui/button/button.component';
import { CardComponent } from '../../shared/ui/card/card.component';
import { DialogComponent } from '../../shared/ui/dialog/dialog.component';
import { PinInputComponent } from '../../shared/ui/pin-input/pin-input.component';

@Component({
  selector: 'app-lock',
  imports: [ButtonComponent, CardComponent, DialogComponent, PinInputComponent, FadeInUpDirective],
  templateUrl: './lock.component.html',
  styleUrl: './lock.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LockComponent {
  private readonly security = inject(SecurityService);
  private readonly storage = inject(StorageService);

  private readonly pinInput = viewChild.required(PinInputComponent);
  private readonly resetDialog = viewChild.required(DialogComponent);

  protected readonly pinLength = PIN_LENGTH;
  protected readonly codeLength = RECOVERY_CODE_LENGTH;
  protected readonly supported = this.security.supported;
  protected readonly recoverable = this.security.recoverable;
  protected readonly checking = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly code = signal('');
  protected readonly codeError = signal<string | null>(null);
  protected readonly recovering = signal(false);
  protected readonly recovered = signal<string | null>(null);
  protected readonly codeReady = computed(
    () => normalizeRecoveryCode(this.code()).length >= RECOVERY_CODE_LENGTH,
  );

  protected async submit(pin: string): Promise<void> {
    if (this.checking()) return;

    this.checking.set(true);
    this.error.set(null);

    const ok = await this.security.unlock(pin);
    this.checking.set(false);

    if (!ok) {
      this.error.set('PIN incorreto');
      this.pinInput().clear();
    }
  }

  protected openReset(): void {
    this.resetDialog().open();
  }

  protected onCode(event: Event): void {
    this.code.set((event.target as HTMLInputElement).value);
    this.codeError.set(null);
  }

  protected async submitCode(): Promise<void> {
    if (this.recovering() || !this.codeReady()) return;

    this.recovering.set(true);
    const pin = await this.security.recover(this.code());
    this.recovering.set(false);

    if (!pin) {
      this.codeError.set('Código não reconhecido');
      return;
    }
    this.recovered.set(pin);
  }

  protected async enterRecovered(): Promise<void> {
    const pin = this.recovered();
    if (!pin) return;

    this.resetDialog().close();
    await this.submit(pin);
  }

  protected clearRecovery(): void {
    this.code.set('');
    this.codeError.set(null);
    this.recovered.set(null);
  }

  protected reset(): void {
    this.storage.clear();
    location.reload();
  }
}
