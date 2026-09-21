import { Routes } from '@angular/router';

/** Rotas filhas do shell do painel. */
export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./overview/overview.page').then((m) => m.OverviewPage),
    title: 'Visão geral · Meus Gastos',
  },
  {
    path: 'transacoes',
    loadComponent: () =>
      import('../transactions/transactions.page').then((m) => m.TransactionsPage),
    title: 'Transações · Meus Gastos',
  },
  {
    path: 'relatorios',
    loadComponent: () => import('./coming-soon/coming-soon.page').then((m) => m.ComingSoonPage),
    title: 'Relatórios · Meus Gastos',
    data: {
      heading: 'Relatórios',
      description: 'Gráficos por categoria e fluxo de caixa chegam em breve.',
      icon: 'insights',
    },
  },
];
