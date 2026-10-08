import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  input,
  output,
  signal,
  viewChildren,
} from '@angular/core';

@Component({
  selector: 'app-pin-input',
  templateUrl: './pin-input.component.html',
  styleUrl: './pin-input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.is-error]': '!!error()' },
})
export class PinInputComponent {
  readonly length = input(4);
  readonly label = input<string>();
  readonly error = input<string>();
  readonly disabled = input(false);
  readonly autofocus = input(true);

  readonly completed = output<string>();

  private readonly boxes = viewChildren<ElementRef<HTMLInputElement>>('box');
  protected readonly digits = signal<string[]>([]);
  protected readonly slots = computed(() => Array.from({ length: this.length() }, (_, i) => i));

  constructor() {
    afterNextRender(() => {
      if (this.autofocus()) this.focus();
    });
  }

  focus(): void {
    this.boxes()[0]?.nativeElement.focus();
  }

  clear(): void {
    this.digits.set([]);
    for (const box of this.boxes()) box.nativeElement.value = '';
    this.focus();
  }

  protected onInput(index: number, event: Event): void {
    const el = event.target as HTMLInputElement;
    const digit = el.value.replace(/\D/g, '').slice(-1);
    el.value = digit;

    const next = [...this.digits()];
    next[index] = digit;
    this.digits.set(next);

    if (digit && index < this.length() - 1) this.boxes()[index + 1]?.nativeElement.focus();
    this.emitIfComplete();
  }

  protected onKeydown(index: number, event: KeyboardEvent): void {
    if (event.key !== 'Backspace') return;

    const el = event.target as HTMLInputElement;
    if (el.value) return;

    event.preventDefault();
    const previous = this.boxes()[index - 1]?.nativeElement;
    if (!previous) return;

    previous.value = '';
    const next = [...this.digits()];
    next[index - 1] = '';
    this.digits.set(next);
    previous.focus();
  }

  protected onPaste(event: ClipboardEvent): void {
    const text = event.clipboardData?.getData('text').replace(/\D/g, '') ?? '';
    if (!text) return;

    event.preventDefault();
    const digits = text.slice(0, this.length()).split('');
    this.digits.set(digits);

    this.boxes().forEach((box, i) => (box.nativeElement.value = digits[i] ?? ''));
    this.boxes()[Math.min(digits.length, this.length() - 1)]?.nativeElement.focus();
    this.emitIfComplete();
  }

  private emitIfComplete(): void {
    const pin = this.digits().join('');
    if (pin.length === this.length()) this.completed.emit(pin);
  }
}
