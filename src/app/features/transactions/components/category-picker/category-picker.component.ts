import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  model,
  signal,
  untracked,
} from '@angular/core';
import { categoriesFor, findCategory } from '../../../../core/constants/categories';
import { Category, TransactionType } from '../../../../core/domain/models';
import { TileIconComponent } from '../../../../shared/ui';

interface CategoryGroup {
  label: string;
  items: Category[];
}

let nextId = 0;

/**
 * Seletor de categoria em acordeão: um grupo aberto por vez
 * (Essenciais, Estilo de vida, Assinaturas…). Abre sozinho o grupo da
 * categoria selecionada.
 */
@Component({
  selector: 'app-category-picker',
  imports: [TileIconComponent],
  templateUrl: './category-picker.component.html',
  styleUrl: './category-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryPickerComponent {
  readonly type = input.required<TransactionType>();
  readonly value = model<string>('');

  protected readonly uid = `category-picker-${nextId++}`;
  protected readonly openGroup = signal<string | null>(null);

  protected readonly groups = computed<CategoryGroup[]>(() => {
    const groups = new Map<string, Category[]>();
    for (const category of categoriesFor(this.type())) {
      const list = groups.get(category.group) ?? [];
      list.push(category);
      groups.set(category.group, list);
    }
    return [...groups].map(([label, items]) => ({ label, items }));
  });

  constructor() {
    // Ao trocar tipo ou valor vindo de fora, abre o grupo certo.
    effect(() => {
      const groups = this.groups();
      const selected = this.value();
      untracked(() => {
        const target = selected ? findCategory(selected).group : null;
        const exists = groups.some((g) => g.label === target);
        this.openGroup.set(exists ? target : (groups[0]?.label ?? null));
      });
    });
  }

  /** Rótulo da categoria selecionada dentro do grupo (para mostrar com o grupo fechado). */
  protected selectedIn(group: CategoryGroup): string | null {
    return group.items.find((c) => c.id === this.value())?.label ?? null;
  }

  protected toggleGroup(label: string): void {
    this.openGroup.update((current) => (current === label ? null : label));
  }

  protected select(id: string): void {
    this.value.set(id);
  }

  protected panelId(index: number): string {
    return `${this.uid}-panel-${index}`;
  }
}
