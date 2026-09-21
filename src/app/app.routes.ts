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
    loadComponent: () =>
      import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage),
    title: 'Meus Gastos',
  },
  { path: '**', redirectTo: '' },
];
