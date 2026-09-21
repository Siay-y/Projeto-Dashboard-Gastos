import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CardComponent } from '../card/card.component';

/** Ilustrações line-art disponíveis (ver template). */
export type EmptyIllustration = 'wallet' | 'receipt' | 'chart' | 'repeat';

/**
 * Estado vazio: ilustração (ou ícone), título, descrição e uma ação projetada.
 *
 *   <app-empty-state illustration="receipt" title="…" description="…">
 *     <app-button …>Ação</app-button>
 *   </app-empty-state>
 */
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
  /** Desenho em linha, na cor do sistema. Tem prioridade sobre `icon`. */
  readonly illustration = input<EmptyIllustration>();
  /** Material Symbol, usado quando não há ilustração. */
  readonly icon = input<string>('inbox');
}
