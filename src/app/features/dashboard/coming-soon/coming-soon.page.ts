import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FadeInUpDirective } from '../../../shared/directives/fade-in-up.directive';
import { EmptyStateComponent } from '../../../shared/ui';

/**
 * Placeholder para seções ainda não construídas.
 * Recebe `heading`, `description` e `icon` via `data` da rota (component input binding).
 */
@Component({
  selector: 'app-coming-soon-page',
  imports: [EmptyStateComponent, FadeInUpDirective],
  template: `
    <header class="page-header" appFadeInUp>
      <h1>{{ heading() }}</h1>
    </header>

    <app-empty-state appFadeInUp [delay]="1" [icon]="icon()" title="Em breve" [description]="description()" />
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--space-6);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComingSoonPage {
  readonly heading = input.required<string>();
  readonly description = input.required<string>();
  readonly icon = input('construction');
}
