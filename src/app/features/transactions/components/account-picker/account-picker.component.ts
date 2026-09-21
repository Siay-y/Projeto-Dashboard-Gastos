import { ChangeDetectionStrategy, Component, model } from '@angular/core';
import { ACCOUNTS } from '../../../../core/constants/accounts';
import { TileIconComponent } from '../../../../shared/ui';

/**
 * Chips compactos para escolher a conta/cartão. Opcional: clicar de novo desmarca.
 */
@Component({
  selector: 'app-account-picker',
  imports: [TileIconComponent],
  template: `
    <div class="picker" role="radiogroup" aria-label="Conta ou cartão">
      @for (account of accounts; track account.id) {
        @let selected = value() === account.id;
        <button
          type="button"
          role="radio"
          class="chip"
          [class.chip--selected]="selected"
          [attr.aria-checked]="selected"
          (click)="select(account.id)"
        >
          <app-tile-icon [source]="account" size="sm" [solid]="selected" />
          <span class="chip__label">{{ account.label }}</span>
        </button>
      }
    </div>
  `,
  styleUrl: './account-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountPickerComponent {
  readonly value = model<string | null>(null);
  protected readonly accounts = ACCOUNTS;

  protected select(id: string): void {
    this.value.set(this.value() === id ? null : id);
  }
}
