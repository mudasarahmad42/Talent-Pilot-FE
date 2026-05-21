import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const candidateGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.parseUrl('/auth/login');
  }

  if (auth.hasAnyRole(['Candidate'])) {
    return true;
  }

  return router.parseUrl('/app/dashboard');
};
