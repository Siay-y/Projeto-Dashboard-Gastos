import { APP_ROUTES } from '../core/constants/routes';

export interface NavItem {
  label: string;
  icon: string;
  path: string;

  exact?: boolean;
  /** Mostrado só no diálogo "Mais", onde há espaço para explicar a seção. */
  hint?: string;
}

const DASHBOARD: NavItem = {
  label: 'Visão geral',
  icon: 'space_dashboard',
  path: APP_ROUTES.DASHBOARD,
  exact: true,
};
const TRANSACTIONS: NavItem = {
  label: 'Transações',
  icon: 'receipt_long',
  path: APP_ROUTES.TRANSACTIONS,
};
const CALENDAR: NavItem = {
  label: 'Calendário',
  icon: 'calendar_month',
  path: APP_ROUTES.CALENDAR,
};
const NOTES: NavItem = {
  label: 'Anotações',
  icon: 'edit_note',
  path: APP_ROUTES.NOTES,
  hint: 'Lembretes, listas e o que precisa anotar',
};
const SETTINGS: NavItem = {
  label: 'Configurações',
  icon: 'settings',
  path: APP_ROUTES.SETTINGS,
  hint: 'Perfil, aparência, orçamento, segurança e dados',
};

export const NAV_ITEMS: readonly NavItem[] = [DASHBOARD, TRANSACTIONS, CALENDAR, NOTES, SETTINGS];

// No celular a barra de baixo cabe três itens: o resto entra pelo botão "Mais".
export const BOTTOM_NAV_ITEMS: readonly NavItem[] = [DASHBOARD, TRANSACTIONS, CALENDAR];

export const MORE_NAV_ITEMS: readonly NavItem[] = [NOTES, SETTINGS];
