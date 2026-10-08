import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type CardElevation = 0 | 1 | 2;

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
