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
    path: 'calendario',
    loadComponent: () => import('../calendar/calendar.page').then((m) => m.CalendarPage),
    title: 'Calendário · Meus Gastos',
  },
];
