import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Permission } from './permissions';
import { PermissionService } from './services/permission.service';

const adminCenterPermissions = [
  Permission.ManageAdminCenter,
  Permission.ManageTenantProfile,
  Permission.ManageUsers,
  Permission.ManageRoles,
  Permission.ManageNotifications,
  Permission.ViewAiSettings,
  Permission.ViewAuditLogs,
];

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const permissions = inject(PermissionService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.parseUrl('/auth/login');
  }

  if (permissions.hasAny(adminCenterPermissions)) {
    return true;
  }

  return router.parseUrl('/app/dashboard');
};
