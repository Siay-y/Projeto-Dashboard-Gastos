import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  forwardRef,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

let nextId = 0;

/**
 * Campo de texto no estilo "outlined" do Material.
 *
 * Implementa ControlValueAccessor, então funciona com `[(ngModel)]`,
 * `formControl` e `formControlName` sem adaptação.
 */
@Component({
  selector: 'app-input',
  templateUrl: './input.component.html',
  styleUrl: './input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true,
    },
  ],
})
export class InputComponent implements ControlValueAccessor {
  readonly label = input<string>();
  readonly placeholder = input('');
  readonly type = input<'text' | 'number' | 'date' | 'email'>('text');
  readonly icon = input<string>();
  readonly hint = input<string>();
  readonly error = input<string>();
  readonly maxlength = input<number>();
  readonly autofocus = input(false);
  readonly autocomplete = input('off');
  /** Texto fixo antes do valor (ex.: "R$"). */
  readonly prefix = input<string>();
  readonly inputmode = input<'text' | 'decimal' | 'numeric'>();
  readonly step = input<string>();
  readonly min = input<string>();

  readonly id = `app-input-${nextId++}`;

  protected readonly value = signal('');
  protected readonly disabled = signal(false);
  protected readonly focused = signal(false);

  protected readonly hasError = computed(() => !!this.error());

  private readonly inputRef = viewChild.required<ElementRef<HTMLInputElement>>('inputEl');

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  constructor() {
    // `autofocus` nativo não dispara em componentes lazy; foca após o render.
    // O atributo é mantido no <input> porque `<dialog>.showModal()` o usa
    // para decidir qual elemento recebe o foco ao abrir.
    afterNextRender(() => {
      if (this.autofocus()) this.inputRef().nativeElement.focus();
    });
  }

  // ---- Eventos do <input> nativo ----
  protected handleInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.value.set(value);
    this.onChange(value);
  }

  protected handleBlur(): void {
    this.focused.set(false);
    this.onTouched();
  }

  // ---- ControlValueAccessor ----
  writeValue(value: string | null): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}
