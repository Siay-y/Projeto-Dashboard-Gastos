import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CardComponent } from '../card/card.component';

/**
 * Estado vazio: ícone, título, descrição e uma ação projetada.
 *
 *   <app-empty-state icon="receipt_long" title="…" description="…">
 *     <app-button …>Ação</app-button>
 *   </app-empty-state>
 */
@Component({
  selector: 'app-empty-state',
  imports: [CardComponent],
  template: `
    <app-card class="empty" [elevation]="0">
      <span class="empty__icon" aria-hidden="true">
        <span class="material-symbols-rounded">{{ icon() }}</span>
      </span>

      <div class="empty__text">
        <h2 class="empty__title">{{ title() }}</h2>
        @if (description()) {
          <p class="empty__description">{{ description() }}</p>
        }
      </div>

      <div class="empty__action">
        <ng-content />
      </div>
    </app-card>
  `,
  styleUrl: './empty-state.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  readonly icon = input.required<string>();
  readonly title = input.required<string>();
  readonly description = input<string>();
}
