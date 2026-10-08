export const STORAGE_KEYS = {
  USER_PROFILE: 'gastos:user-profile',
  TRANSACTIONS: 'gastos:transactions',
  FINANCE_SETTINGS: 'gastos:finance-settings',
  RECURRING_EXPENSES: 'gastos:recurring-expenses',
  BUDGETS: 'gastos:budgets',
  UI_PREFERENCES: 'gastos:ui-preferences',
  SECURITY: 'gastos:security',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

// Preferências e a config de segurança ficam de fora: são lidas antes de desbloquear.
export const ENCRYPTED_KEYS: readonly StorageKey[] = [
  STORAGE_KEYS.USER_PROFILE,
  STORAGE_KEYS.TRANSACTIONS,
  STORAGE_KEYS.FINANCE_SETTINGS,
  STORAGE_KEYS.RECURRING_EXPENSES,
  STORAGE_KEYS.BUDGETS,
];
