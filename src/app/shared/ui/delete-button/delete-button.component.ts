import { ChangeDetectionStrategy, Component, OnDestroy, input, output, signal } from '@angular/core';

const CONFIRM_TIMEOUT_MS = 4000;

@Component({
  selector: 'app-delete-button',
  templateUrl: './delete-button.component.html',
  styleUrl: './delete-button.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.confirming]': 'confirming()',
  },
})
export class DeleteButtonComponent implements OnDestroy {
  readonly itemLabel = input.required<string>();
  readonly confirmed = output<void>();

  readonly confirmingChange = output<boolean>();

  protected readonly confirming = signal(false);
  private timer: ReturnType<typeof setTimeout> | null = null;

  protected ask(): void {
    this.setConfirming(true);
    this.timer = setTimeout(() => this.setConfirming(false), CONFIRM_TIMEOUT_MS);
  }

  protected cancel(): void {
    this.setConfirming(false);
  }

  protected confirm(): void {
    this.setConfirming(false);
    this.confirmed.emit();
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  private setConfirming(value: boolean): void {
    this.clearTimer();
    this.confirming.set(value);
    this.confirmingChange.emit(value);
  }

  private clearTimer(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}
