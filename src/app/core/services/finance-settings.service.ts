import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { DEFAULT_FINANCE_SETTINGS, FinanceSettings } from '../domain/models';
import { toDateKey } from '../../shared/utils/date';
import { StorageService } from './storage.service';

/**
 * Valores informados manualmente: saldo total e renda fixa mensal.
 */
@Injectable({ providedIn: 'root' })
export class FinanceSettingsService {
  private readonly storage = inject(StorageService);

  private readonly _settings = signal<FinanceSettings>(this.load());

  readonly settings = this._settings.asReadonly();
  readonly totalBalance = computed(() => this._settings().totalBalance);
  readonly balanceUpdatedAt = computed(() => this._settings().balanceUpdatedAt);
  readonly monthlyIncome = computed(() => this._settings().monthlyIncome);

  constructor() {
    effect(() => {
      this.storage.set(STORAGE_KEYS.FINANCE_SETTINGS, this._settings());
    });
  }

  setTotalBalance(amount: number): void {
    this._settings.update((s) => ({
      ...s,
      totalBalance: round(amount),
      balanceUpdatedAt: toDateKey(),
    }));
  }

  setMonthlyIncome(amount: number): void {
    this._settings.update((s) => ({ ...s, monthlyIncome: round(Math.max(0, amount)) }));
  }

  /** Lê do storage ignorando campos de versões anteriores do modelo. */
  private load(): FinanceSettings {
    const stored = this.storage.get<Partial<FinanceSettings>>(STORAGE_KEYS.FINANCE_SETTINGS);
    return {
      totalBalance: stored?.totalBalance ?? DEFAULT_FINANCE_SETTINGS.totalBalance,
      balanceUpdatedAt: stored?.balanceUpdatedAt ?? DEFAULT_FINANCE_SETTINGS.balanceUpdatedAt,
      monthlyIncome: stored?.monthlyIncome ?? DEFAULT_FINANCE_SETTINGS.monthlyIncome,
    };
  }
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
