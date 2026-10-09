import { ChangeDetectionStrategy, Component, model, signal } from '@angular/core';
import { accountGroups } from '../../../../core/constants/accounts';
import { Account } from '../../../../core/domain/models';
import { TileIconComponent } from '../../../../shared/ui';

interface AccountGroup {
  label: string;
  items: Account[];
}

let nextId = 0;

@Component({
  selector: 'app-account-picker',
  imports: [TileIconComponent],
  templateUrl: './account-picker.component.html',
  styleUrl: './account-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountPickerComponent {
  readonly value = model<string | null>(null);

  protected readonly uid = `account-picker-${nextId++}`;
  protected readonly groups = accountGroups();

  // Guarda o que está fechado: os dois grupos começam abertos.
  private readonly closed = signal<ReadonlySet<string>>(new Set());

  protected isOpen(label: string): boolean {
    return !this.closed().has(label);
  }

  protected toggleGroup(label: string): void {
    this.closed.update((current) => {
      const next = new Set(current);
      if (!next.delete(label)) next.add(label);
      return next;
    });
  }

  protected selectedIn(group: AccountGroup): string | null {
    return group.items.find((a) => a.id === this.value())?.label ?? null;
  }

  protected select(id: string): void {
    this.value.set(this.value() === id ? null : id);
  }

  protected panelId(index: number): string {
    return `${this.uid}-panel-${index}`;
  }
}
