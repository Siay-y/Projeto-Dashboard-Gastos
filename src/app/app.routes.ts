import { Routes } from '@angular/router';
import { hasUserGuard, noUserGuard } from './core/guards/has-user.guard';

export const routes: Routes = [
  {
    path: 'bem-vindo',
    canMatch: [noUserGuard],
    loadComponent: () =>
      import('./features/onboarding/onboarding.page').then((m) => m.OnboardingPage),
    title: 'Bem-vindo · Meus Gastos',
  },
  {
    path: '',
    canMatch: [hasUserGuard],
    loadComponent: () => import('./layout/shell/shell.component').then((m) => m.ShellComponent),
    loadChildren: () =>
      import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
  },
  {
    path: '**',
    loadComponent: () => import('./features/not-found/not-found.page').then((m) => m.NotFoundPage),
    title: 'Página não encontrada · Meus Gastos',
  },
];
