/** Valores informados manualmente pelo usuário. */
export interface FinanceSettings {
  /** Quanto o usuário tem guardado no banco. Não é calculado — é o que ele informa. */
  totalBalance: number;
  /** Valor que entra todo mês (salário, por exemplo). Soma nos ganhos do mês. */
  monthlyIncome: number;
}

export const DEFAULT_FINANCE_SETTINGS: FinanceSettings = {
  totalBalance: 0,
  monthlyIncome: 0,
};
