import { Directive, input } from '@angular/core';

@Directive({
  selector: '[appFadeInUp]',
  host: {
    class: 'fade-in-up',
    '[style.--delay]': 'delay()',
  },
})
export class FadeInUpDirective {
  readonly delay = input<number, number | string>(0, {
    transform: (v) => Number(v) || 0,
  });
}
