export interface FinanceSettings {
  totalBalance: number;
  balanceUpdatedAt: string | null;
  monthlyIncome: number;
}

export const DEFAULT_FINANCE_SETTINGS: FinanceSettings = {
  totalBalance: 0,
  balanceUpdatedAt: null,
  monthlyIncome: 0,
};
