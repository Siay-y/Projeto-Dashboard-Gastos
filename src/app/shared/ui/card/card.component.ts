import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type CardElevation = 0 | 1 | 2;

/**
 * Superfície com borda fina — bloco base de toda a UI.
 * Sombra (`elevation` 1/2) só para o que flutua sobre a página.
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
  readonly elevation = input<CardElevation>(0);
  readonly padded = input(true);
}
