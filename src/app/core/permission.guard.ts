import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { PermissionId } from './permissions';
import { PermissionService } from './services/permission.service';

export const permissionGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const permissions = inject(PermissionService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.parseUrl('/auth/login');
  }

  const requiredAny = (route.data?.['requiredAnyPermissions'] ?? []) as readonly PermissionId[];
  const requiredAll = (route.data?.['requiredAllPermissions'] ?? []) as readonly PermissionId[];
  const pageId = route.paramMap.get('pageId');

  const hasRoutePermission =
    requiredAll.length > 0
      ? permissions.hasAll(requiredAll)
      : requiredAny.length > 0
        ? permissions.hasAny(requiredAny)
        : pageId
          ? permissions.canAccessAdminPage(pageId)
          : permissions.canAccessRoute(state.url);

  if (hasRoutePermission) {
    return true;
  }

  if (permissions.canAccessRoute('/admin-center')) {
    return router.parseUrl('/admin-center/tenant-profile');
  }

  if (auth.hasAnyRole(['Candidate'])) {
    return router.parseUrl('/candidate');
  }

  return router.parseUrl('/app/dashboard');
};
