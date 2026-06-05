import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { TalentPilotRole } from './models';

const INTERNAL_APP_ROLES: readonly TalentPilotRole[] = [
  'TenantAdmin',
  'Presales',
  'PMO',
  'Recruiter',
  'HiringManager',
  'HOD',
  'Interviewer',
  'Employee',
];

export const internalAppGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.parseUrl('/auth/login');
  }

  if (auth.hasAnyRole(INTERNAL_APP_ROLES)) {
    return true;
  }

  if (auth.hasAnyRole(['Candidate'])) {
    return router.parseUrl('/candidate');
  }

  return router.parseUrl('/auth/login');
};
