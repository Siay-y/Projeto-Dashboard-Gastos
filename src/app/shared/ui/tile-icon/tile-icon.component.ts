import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { IconRef } from '../../../core/domain/models';
import { BRAND_ICONS } from '../../icons/brand-icons';

export interface IconSource {
  icon: IconRef;
  color: string;
}

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
  readonly solid = input(false);
  readonly brandColor = input(false);

  protected readonly brandPath = computed(() => {
    const icon = this.source().icon;
    return icon.kind === 'brand' ? (BRAND_ICONS[icon.slug]?.path ?? null) : null;
  });
}
