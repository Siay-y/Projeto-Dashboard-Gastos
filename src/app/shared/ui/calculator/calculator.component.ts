import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { CalculatorKey, caretAt, caretDepth, display, pending } from './calculator-engine';
import { CalculatorService, Point } from './calculator.service';

interface Key {
  label: string;
  key: CalculatorKey;
  variant?: 'operator' | 'action' | 'equals';
}

interface Drag {
  from: Point;
  start: Point;
  min: Point;
  max: Point;
}

const KEYS: readonly Key[] = [
  { label: 'C', key: { kind: 'clear' }, variant: 'action' },
  { label: '⌫', key: { kind: 'backspace' }, variant: 'action' },
  { label: '%', key: { kind: 'percent' }, variant: 'action' },
  { label: '÷', key: { kind: 'operator', value: '/' }, variant: 'operator' },

  { label: '7', key: { kind: 'digit', value: '7' } },
  { label: '8', key: { kind: 'digit', value: '8' } },
  { label: '9', key: { kind: 'digit', value: '9' } },
  { label: '×', key: { kind: 'operator', value: '*' }, variant: 'operator' },

  { label: '4', key: { kind: 'digit', value: '4' } },
  { label: '5', key: { kind: 'digit', value: '5' } },
  { label: '6', key: { kind: 'digit', value: '6' } },
  { label: '−', key: { kind: 'operator', value: '-' }, variant: 'operator' },

  { label: '1', key: { kind: 'digit', value: '1' } },
  { label: '2', key: { kind: 'digit', value: '2' } },
  { label: '3', key: { kind: 'digit', value: '3' } },
  { label: '+', key: { kind: 'operator', value: '+' }, variant: 'operator' },

  { label: '+/−', key: { kind: 'sign' } },
  { label: '0', key: { kind: 'digit', value: '0' } },
  { label: ',', key: { kind: 'decimal' } },
  { label: '=', key: { kind: 'equals' }, variant: 'equals' },
];

const KEY_BY_SHORTCUT: Record<string, CalculatorKey> = {
  '+': { kind: 'operator', value: '+' },
  '-': { kind: 'operator', value: '-' },
  '*': { kind: 'operator', value: '*' },
  '/': { kind: 'operator', value: '/' },
  '=': { kind: 'equals' },
  Enter: { kind: 'equals' },
  Backspace: { kind: 'backspace' },
  Delete: { kind: 'clear' },
  '%': { kind: 'percent' },
  ',': { kind: 'decimal' },
  '.': { kind: 'decimal' },
};

const MATH_KEYS = new Set<CalculatorKey['kind']>(['operator', 'equals', 'percent']);

const DESKTOP = '(min-width: 1024px)';
const EDGE = 8;

@Component({
  selector: 'app-calculator',
  templateUrl: './calculator.component.html',
  styleUrl: './calculator.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'onEscape()',
  },
})
export class CalculatorComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly store = inject(CalculatorService);
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');
  private readonly entry = viewChild<ElementRef<HTMLInputElement>>('entry');

  /**
   * `embedded` roda dentro do diálogo de item, que fica na top layer do
   * navegador: é o único jeito de a calculadora ficar acima dele e clicável.
   */
  readonly variant = input<'floating' | 'embedded'>('floating');
  readonly active = input(true);

  private readonly query = typeof matchMedia === 'function' ? matchMedia(DESKTOP) : null;

  protected readonly keys = KEYS;
  protected readonly copied = this.store.copied;

  protected readonly isDesktop = signal(this.query?.matches ?? false);

  /** Só um host desenha a calculadora: o diálogo tem prioridade sobre o shell. */
  protected readonly visible = computed(() =>
    this.variant() === 'embedded' ? this.takesOver() : !this.store.embedded(),
  );

  private readonly takesOver = computed(() => this.active() && this.isDesktop());

  protected readonly isOpen = computed(() => this.visible() && this.store.open());

  private drag: Drag | null = null;
  private attached = false;
  private focusedAt = this.store.openedAt();

  protected readonly display = computed(() => display(this.store.state()));
  protected readonly pending = computed(() => pending(this.store.state()));
  protected readonly error = computed(() => this.store.state().error);

  protected readonly transform = computed(() => {
    const { x, y } = this.store.offset();
    return `translate(${x}px, ${y}px)`;
  });

  constructor() {
    this.query?.addEventListener('change', (event) => {
      this.isDesktop.set(event.matches);
      if (!event.matches) this.store.offset.set({ x: 0, y: 0 });
    });

    effect(() => {
      const shouldAttach = this.variant() === 'embedded' && this.takesOver();
      if (shouldAttach === this.attached) return;

      this.attached = shouldAttach;
      shouldAttach ? this.store.attach() : this.store.detach();
    });

    // Foca ao abrir, não ao trocar de host: senão o diálogo de item perderia o
    // foco do primeiro campo para a calculadora que já estava aberta.
    effect(() => {
      const panel = this.panel()?.nativeElement;
      const openedAt = this.store.openedAt();
      if (!panel || openedAt === this.focusedAt) return;

      this.focusedAt = openedAt;
      panel.focus();
    });

    effect(() => {
      const input = this.entry()?.nativeElement;
      const text = this.display();
      if (input && input.value !== text) input.value = text;
    });

    inject(DestroyRef).onDestroy(() => {
      if (this.attached) this.store.detach();
    });
  }

  toggle(): void {
    this.store.toggle();
  }

  close(): void {
    this.store.close();
  }

  protected tap(key: CalculatorKey): void {
    if (!this.editAtCaret(key)) this.store.press(key);
  }

  protected keepFocus(event: Event): void {
    event.preventDefault();
  }

  protected onEntryInput(): void {
    const input = this.entry()?.nativeElement;
    if (!input) return;

    const depth = caretDepth(input.value, input.selectionStart ?? input.value.length);
    this.store.setEntry(input.value);
    this.render(input, depth);
  }

  protected onKeydown(event: KeyboardEvent): void {
    // Enter e espaço pertencem ao botão em foco, senão a tecla vale duas vezes.
    const target = event.target as HTMLElement;
    if (target.tagName === 'BUTTON' && (event.key === 'Enter' || event.key === ' ')) return;

    const key: CalculatorKey | undefined = /^[0-9]$/.test(event.key)
      ? { kind: 'digit', value: event.key }
      : KEY_BY_SHORTCUT[event.key];

    if (!key) return;

    if (target === this.entry()?.nativeElement && !MATH_KEYS.has(key.kind) && event.key !== '.') {
      return;
    }

    event.preventDefault();
    this.tap(key);
  }

  private editAtCaret(key: CalculatorKey): boolean {
    const input = this.entry()?.nativeElement;
    if (!input || document.activeElement !== input || this.store.state().replacing) return false;

    if (key.kind === 'digit') return this.insert(input, key.value);
    if (key.kind === 'decimal') return this.insert(input, ',');
    if (key.kind === 'backspace') return this.erase(input);

    return false;
  }

  private insert(input: HTMLInputElement, text: string): boolean {
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    const depth = caretDepth(input.value, start) + text.length;

    this.store.setEntry(input.value.slice(0, start) + text + input.value.slice(end));
    this.render(input, depth);

    return true;
  }

  private erase(input: HTMLInputElement): boolean {
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;

    if (start !== end) {
      const depth = caretDepth(input.value, start);
      this.store.setEntry(input.value.slice(0, start) + input.value.slice(end));
      this.render(input, depth);

      return true;
    }

    const depth = caretDepth(input.value, start);
    if (depth === 0) return true;

    // Apagar pulando o ponto de milhar: ele não é um caractere que o usuário digitou.
    const at = caretAt(input.value, depth) - 1;
    this.store.setEntry(input.value.slice(0, at) + input.value.slice(at + 1));
    this.render(input, depth - 1);

    return true;
  }

  private render(input: HTMLInputElement, depth: number): void {
    input.value = this.display();
    const at = caretAt(input.value, depth);
    input.setSelectionRange(at, at);
  }

  protected startDrag(event: PointerEvent): void {
    const panel = this.panel()?.nativeElement;
    if (!this.isDesktop() || !panel) return;

    const rect = panel.getBoundingClientRect();
    const start = this.store.offset();

    // Os limites saem da posição atual: o painel não pode sair da tela.
    this.drag = {
      from: { x: event.clientX, y: event.clientY },
      start,
      min: { x: start.x - rect.left + EDGE, y: start.y - rect.top + EDGE },
      max: {
        x: start.x + (window.innerWidth - EDGE - rect.right),
        y: start.y + (window.innerHeight - EDGE - rect.bottom),
      },
    };

    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  protected onDrag(event: PointerEvent): void {
    if (!this.drag) return;

    const { from, start, min, max } = this.drag;
    this.store.offset.set({
      x: clamp(start.x + event.clientX - from.x, min.x, max.x),
      y: clamp(start.y + event.clientY - from.y, min.y, max.y),
    });
  }

  protected endDrag(): void {
    this.drag = null;
  }

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.display());
      this.store.copied.set(true);
    } catch {
      // Sem permissão: o valor está na tela para copiar à mão.
    }
  }

  protected onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (this.isDesktop() || !this.isOpen() || this.host.nativeElement.contains(target)) return;

    // O gatilho da barra superior fica fora deste componente.
    if (target.closest('[data-calc-trigger]')) return;

    this.close();
  }

  protected onEscape(): void {
    if (!this.isDesktop() && this.isOpen()) this.close();
  }

  protected isActiveOperator(key: CalculatorKey): boolean {
    const { operator, replacing } = this.store.state();
    return key.kind === 'operator' && replacing && operator === key.value;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
