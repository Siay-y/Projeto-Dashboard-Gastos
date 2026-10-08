import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { UserService } from '../services/user.service';
import { APP_ROUTES } from '../constants/routes';

export const hasUserGuard: CanMatchFn = () => {
  const user = inject(UserService);
  const router = inject(Router);

  return user.isIdentified() || router.createUrlTree([APP_ROUTES.ONBOARDING]);
};

export const noUserGuard: CanMatchFn = () => {
  const user = inject(UserService);
  const router = inject(Router);

  return !user.isIdentified() || router.createUrlTree([APP_ROUTES.DASHBOARD]);
};
