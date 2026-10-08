import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CardComponent, MoneyComponent } from '../../../../shared/ui';

export type SummaryTone = 'neutral' | 'positive' | 'negative';

@Component({
  selector: 'app-summary-card',
  imports: [CardComponent, MoneyComponent],
  templateUrl: './summary-card.component.html',
  styleUrl: './summary-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-tone]': 'tone()',
  },
})
export class SummaryCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<number>();
  readonly icon = input.required<string>();
  readonly hint = input<string>();
  readonly tone = input<SummaryTone>('neutral');
  readonly editable = input(false);
  readonly editLabel = input('Ajustar');

  readonly edit = output<void>();
}
