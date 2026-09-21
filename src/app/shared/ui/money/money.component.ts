import { formatCurrency } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  LOCALE_ID,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';

/** Duração da contagem animada. */
const COUNT_UP_MS = 700;

/**
 * Valor em reais com os centavos menores ("R$ 1.234" + ",56").
 * Ao mudar, conta do valor anterior até o novo (count-up); na primeira
 * renderização, parte do zero. Respeita `prefers-reduced-motion`.
 *
 *   <app-money [value]="1234.56" />           → R$ 1.234,56
 *   <app-money [value]="35" sign="−" />       → −R$ 35,00
 */
@Component({
  selector: 'app-money',
  template: `{{ prefix() }}{{ parts().integer }}<span class="cents">{{ parts().cents }}</span>`,
  styles: `
    :host {
      display: inline;
      font-family: var(--font-display);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    .cents {
      font-size: 0.62em;
      font-weight: 600;
      letter-spacing: 0;
      opacity: 0.72;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MoneyComponent {
  private readonly locale = inject(LOCALE_ID);
  private readonly destroyRef = inject(DestroyRef);

  readonly value = input.required<number>();
  /** Prefixo explícito ("+", "−"). Valores negativos já recebem "−" sozinhos. */
  readonly sign = input<'' | '+' | '−'>('');
  readonly animate = input(true);

  /** Valor mostrado (pode estar a caminho do valor real durante a animação). */
  private readonly shown = signal(0);
  private frame = 0;

  protected readonly prefix = computed(() => (this.shown() < 0 ? '−' : this.sign()));

  protected readonly parts = computed(() => {
    const text = formatCurrency(Math.abs(this.shown()), this.locale, 'R$');
    const at = text.lastIndexOf(',');
    return at === -1
      ? { integer: text, cents: '' }
      : { integer: text.slice(0, at), cents: text.slice(at) };
  });

  constructor() {
    effect(() => {
      const target = this.value();
      if (!this.animate() || reducedMotion()) {
        this.shown.set(target);
        return;
      }
      this.countUp(target);
    });

    this.destroyRef.onDestroy(() => cancelAnimationFrame(this.frame));
  }

  private countUp(target: number): void {
    cancelAnimationFrame(this.frame);
    // `untracked`: o effect não pode depender de `shown`, senão reinicia a cada frame.
    const from = untracked(this.shown);
    if (from === target) return;

    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / COUNT_UP_MS);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cúbico
      this.shown.set(round(from + (target - from) * eased));
      if (t < 1) this.frame = requestAnimationFrame(step);
    };
    this.frame = requestAnimationFrame(step);
  }
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function reducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}
