import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IconRef } from '../../../core/domain/models';
import { BRAND_ICONS } from '../../icons/brand-icons';

/** Qualquer entidade com ícone e cor (categoria, conta…). */
export interface IconSource {
  icon: IconRef;
  color: string;
}

/**
 * Ícone em um "tile" na cor do sistema.
 * Renderiza Material Symbol, logo de marca (SVG inline) ou monograma.
 * `brandColor` troca para a cor própria da entidade (útil em legendas de gráfico).
 */
@Component({
  selector: 'app-tile-icon',
  templateUrl: './tile-icon.component.html',
  styleUrl: './tile-icon.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.--cat-color]': 'brandColor() ? source().color : null',
    '[attr.data-size]': 'size()',
    '[attr.data-solid]': 'solid() || null',
  },
})
export class TileIconComponent {
  readonly source = input.required<IconSource>();
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  /** Fundo sólido (para estados selecionados). */
  readonly solid = input(false);
  /** Usa a cor própria da entidade em vez da cor primária do sistema. */
  readonly brandColor = input(false);

  protected readonly brandPath = computed(() => {
    const icon = this.source().icon;
    return icon.kind === 'brand' ? (BRAND_ICONS[icon.slug]?.path ?? null) : null;
  });
}
