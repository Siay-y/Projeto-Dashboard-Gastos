import { Injectable, computed, signal } from '@angular/core';
import { CalculatorKey, INITIAL, press } from './calculator-engine';

export interface Point {
  x: number;
  y: number;
}

/**
 * Estado único da calculadora. Ela aparece ora no shell, ora dentro do diálogo
 * de item, e precisa atravessar essa troca sem perder conta nem posição.
 */
@Injectable({ providedIn: 'root' })
export class CalculatorService {
  readonly open = signal(false);
  /** Sobe a cada abertura: é o que distingue abrir de trocar de host. */
  readonly openedAt = signal(0);
  readonly state = signal(INITIAL);
  readonly offset = signal<Point>({ x: 0, y: 0 });
  readonly copied = signal(false);

  private readonly hosts = signal(0);
  readonly embedded = computed(() => this.hosts() > 0);

  attach(): void {
    this.hosts.update((count) => count + 1);
  }

  detach(): void {
    this.hosts.update((count) => Math.max(0, count - 1));
  }

  toggle(): void {
    if (this.open()) {
      this.close();
      return;
    }

    this.open.set(true);
    this.openedAt.update((count) => count + 1);
  }

  close(): void {
    this.open.set(false);
    // Reabre sempre na posição padrão.
    this.offset.set({ x: 0, y: 0 });
  }

  press(key: CalculatorKey): void {
    this.state.update((current) => press(current, key));
    this.copied.set(false);
  }
}
