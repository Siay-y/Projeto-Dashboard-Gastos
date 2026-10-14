import { ChangeDetectionStrategy, Component, model, signal } from '@angular/core';
import { AccountGroup, AccountSlot, accountGroups } from '../../../core/constants/accounts';
import { TileIconComponent } from '../tile-icon/tile-icon.component';

let nextId = 0;

@Component({
  selector: 'app-account-picker',
  imports: [TileIconComponent],
  templateUrl: './account-picker.component.html',
  styleUrl: './account-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountPickerComponent {
  // Dois campos independentes: escolher o banco não desmarca a forma de pagamento.
  readonly bank = model<string | null>(null);
  readonly method = model<string | null>(null);

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

  protected valueOf(slot: AccountSlot): string | null {
    return slot === 'bank' ? this.bank() : this.method();
  }

  protected selectedIn(group: AccountGroup): string | null {
    const current = this.valueOf(group.slot);
    return group.items.find((a) => a.id === current)?.label ?? null;
  }

  protected select(slot: AccountSlot, id: string): void {
    const next = this.valueOf(slot) === id ? null : id;
    if (slot === 'bank') this.bank.set(next);
    else this.method.set(next);
  }

  protected panelId(index: number): string {
    return `${this.uid}-panel-${index}`;
  }
}
