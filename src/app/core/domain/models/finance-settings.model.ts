/** Valores informados manualmente pelo usuário. */
export interface FinanceSettings {
  /** Quanto o usuário tem guardado no banco. Não é calculado — é o que ele informa. */
  totalBalance: number;
  /** Quando o saldo foi informado pela última vez (`YYYY-MM-DD`) ou `null` se nunca. */
  balanceUpdatedAt: string | null;
  /** Valor que entra todo mês (salário, por exemplo). Soma nos ganhos do mês. */
  monthlyIncome: number;
}

export const DEFAULT_FINANCE_SETTINGS: FinanceSettings = {
  totalBalance: 0,
  balanceUpdatedAt: null,
  monthlyIncome: 0,
};
