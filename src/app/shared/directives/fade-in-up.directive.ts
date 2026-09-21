import { Directive, input } from '@angular/core';

/**
 * Aplica a animação global de entrada (fade-in-up) em qualquer elemento.
 *
 * Uso:
 *   <section appFadeInUp>…</section>
 *   <section appFadeInUp [delay]="2">…</section>   → atraso de 2 × 80ms
 *
 * A animação em si vive em `styles/_animations.scss`; a diretiva só decora
 * o host com a classe e a variável CSS de escalonamento.
 */
@Directive({
  selector: '[appFadeInUp]',
  host: {
    class: 'fade-in-up',
    '[style.--delay]': 'delay()',
  },
})
export class FadeInUpDirective {
  /** Índice de escalonamento (stagger). Cada unidade adiciona 80ms. */
  readonly delay = input<number, number | string>(0, {
    transform: (v) => Number(v) || 0,
  });
}
