import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { UiPreferencesService } from '../../../core/services/ui-preferences.service';

let nextId = 0;

/**
 * Seção recolhível (acordeão) com cabeçalho informativo.
 * O estado aberto/fechado é lembrado por `id` entre visitas.
 *
 *   <app-collapsible-section id="fixos" title="Gastos fixos" [defaultExpanded]="false">
 *     <span subtitle>3 ativos · R$ 1.350 por mês</span>
 *     <app-button actions …>Adicionar</app-button>
 *     …conteúdo…
 *   </app-collapsible-section>
 */
@Component({
  selector: 'app-collapsible-section',
  templateUrl: './collapsible-section.component.html',
  styleUrl: './collapsible-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.is-open]': 'expanded()',
  },
})
export class CollapsibleSectionComponent {
  private readonly prefs = inject(UiPreferencesService);

  /** Identificador estável para persistir a preferência. */
  readonly id = input.required<string>();
  readonly title = input.required<string>();
  readonly defaultExpanded = input(true);

  protected readonly bodyId = `collapsible-body-${nextId++}`;
  protected readonly expanded = computed(() => this.prefs.isExpanded(this.id(), this.defaultExpanded()));

  protected toggle(): void {
    this.prefs.setExpanded(this.id(), !this.expanded());
  }
}
