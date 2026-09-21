import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type CardElevation = 0 | 1 | 2;

/**
 * Superfície com borda fina e sombra discreta — bloco base de toda a UI.
 */
@Component({
  selector: 'app-card',
  template: `<ng-content />`,
  styleUrl: './card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-elevation]': 'elevation()',
    '[attr.data-padded]': 'padded() || null',
  },
})
export class CardComponent {
  readonly elevation = input<CardElevation>(1);
  readonly padded = input(true);
}
