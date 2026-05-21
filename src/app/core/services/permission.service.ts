import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from '../auth.service';
import { PermissionId, getAdminPagePermissions } from '../permissions';

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private readonly auth = inject(AuthService);

  readonly currentPermissions = computed(() => new Set(this.auth.currentUser()?.permissions ?? []));

  has(permission: PermissionId | string): boolean {
    return this.currentPermissions().has(permission);
  }

  hasAny(permissions: readonly (PermissionId | string)[]): boolean {
    if (permissions.length === 0) {
      return true;
    }

    return permissions.some((permission) => this.has(permission));
  }

  hasAll(permissions: readonly (PermissionId | string)[]): boolean {
    return permissions.every((permission) => this.has(permission));
  }

  canAccessRoute(route: string): boolean {
    return this.auth.canAccessRoute(route);
  }

  canAccessAdminPage(pageId: string): boolean {
    return this.hasAny(getAdminPagePermissions(pageId));
  }
}
