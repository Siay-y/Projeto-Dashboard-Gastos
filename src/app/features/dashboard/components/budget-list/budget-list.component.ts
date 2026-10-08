import { CurrencyPipe, formatCurrency } from '@angular/common';
import { ChangeDetectionStrategy, Component, LOCALE_ID, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { APP_ROUTES } from '../../../../core/constants/routes';
import { BudgetService, CategoryBudget } from '../../../../core/services/budget.service';
import { ButtonComponent, CardComponent, TileIconComponent } from '../../../../shared/ui';

@Component({
  selector: 'app-budget-list',
  imports: [CurrencyPipe, RouterLink, CardComponent, ButtonComponent, TileIconComponent],
  templateUrl: './budget-list.component.html',
  styleUrl: './budget-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BudgetListComponent {
  private readonly locale = inject(LOCALE_ID);
  private readonly budget = inject(BudgetService);

  protected readonly settingsRoute = APP_ROUTES.SETTINGS;
  protected readonly budgets = this.budget.budgets;

  protected readonly summary = computed(() => {
    const { spent, limit } = this.budget.totals();
    const over = this.budget.over().length;

    const used = `${this.money(spent)} de ${this.money(limit)}`;
    if (over === 0) return `${used} usados neste mês`;

    return `${used} · ${over} ${over === 1 ? 'categoria acima' : 'categorias acima'} do limite`;
  });

  protected width(item: CategoryBudget): number {
    return Math.min(100, item.ratio * 100);
  }

  protected projectedWidth(item: CategoryBudget): number {
    return Math.min(100, (item.projected / item.limit) * 100);
  }

  protected note(item: CategoryBudget): string {
    if (item.status === 'over') return `${this.money(-item.remaining)} acima do limite`;
    if (item.willExceed) return `No ritmo atual, fecha em ${this.money(item.projected)}`;
    return `Faltam ${this.money(item.remaining)}`;
  }

  private money(value: number): string {
    return formatCurrency(value, this.locale, 'R$');
  }
}
