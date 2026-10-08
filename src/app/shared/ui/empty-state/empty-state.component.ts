import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CardComponent } from '../card/card.component';

export type EmptyIllustration = 'wallet' | 'receipt' | 'chart' | 'repeat';

@Component({
  selector: 'app-empty-state',
  imports: [CardComponent],
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly description = input<string>();
  readonly illustration = input<EmptyIllustration>();
  readonly icon = input<string>('inbox');
}
