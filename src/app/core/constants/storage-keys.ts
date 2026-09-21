/**
 * Chaves usadas no LocalStorage. Centralizadas para evitar strings mágicas
 * espalhadas pelo código e facilitar migrações futuras.
 */
export const STORAGE_KEYS = {
  USER_PROFILE: 'gastos:user-profile',
  TRANSACTIONS: 'gastos:transactions',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
