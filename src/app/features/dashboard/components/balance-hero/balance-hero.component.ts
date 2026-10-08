import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { UpcomingItem } from '../../../../core/services/upcoming.service';
import { MoneyComponent } from '../../../../shared/ui';

const UPCOMING_LIMIT = 3;

@Component({
  selector: 'app-balance-hero',
  imports: [CurrencyPipe, DatePipe, MoneyComponent],
  templateUrl: './balance-hero.component.html',
  styleUrl: './balance-hero.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BalanceHeroComponent {
  readonly balance = input.required<number>();

  readonly balanceHint = input.required<string>();

  readonly monthResult = input.required<number>();

  readonly upcoming = input.required<UpcomingItem[]>();

  readonly edit = output<void>();

  protected readonly resultAbs = computed(() => Math.abs(this.monthResult()));

  protected readonly shown = computed(() => this.upcoming().slice(0, UPCOMING_LIMIT));
  protected readonly hidden = computed(() => Math.max(0, this.upcoming().length - UPCOMING_LIMIT));

  protected when(item: UpcomingItem): string | null {
    if (item.days === 0) return 'Hoje';
    if (item.days === 1) return 'Amanhã';
    return null;
  }
}
