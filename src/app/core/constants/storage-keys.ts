export const STORAGE_KEYS = {
  USER_PROFILE: 'gastos:user-profile',
  TRANSACTIONS: 'gastos:transactions',
  FINANCE_SETTINGS: 'gastos:finance-settings',
  RECURRING_EXPENSES: 'gastos:recurring-expenses',
  UI_PREFERENCES: 'gastos:ui-preferences',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
