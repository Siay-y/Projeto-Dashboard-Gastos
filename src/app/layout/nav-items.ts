import { APP_ROUTES } from '../core/constants/routes';

export interface NavItem {
  label: string;
  icon: string;
  path: string;
  /** Ativo apenas quando a URL é exatamente esta (necessário para "/"). */
  exact?: boolean;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Visão geral', icon: 'space_dashboard', path: APP_ROUTES.DASHBOARD, exact: true },
  { label: 'Transações', icon: 'receipt_long', path: APP_ROUTES.TRANSACTIONS },
  { label: 'Calendário', icon: 'calendar_month', path: APP_ROUTES.CALENDAR },
];
