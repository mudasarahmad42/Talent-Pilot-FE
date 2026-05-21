import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthResponse, BackendCurrentUserContext, CurrentUser, LoginOption, TalentPilotRole } from './models';
import { PermissionId } from './permissions';
import { ApiService } from './services/api.service';
import { StorageService } from './services/storage.service';

export const AUTH_ACCESS_TOKEN_KEY = 'talent-pilot.auth.access-token';

const AUTH_REFRESH_TOKEN_KEY = 'talent-pilot.auth.refresh-token';
const AUTH_EXPIRES_AT_KEY = 'talent-pilot.auth.expires-at';
const AUTH_USER_KEY = 'talent-pilot.auth.current-user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly storage = inject(StorageService);
  private readonly loginOptionsSignal = signal<LoginOption[]>([]);
  private readonly currentUserSignal = signal<CurrentUser | null>(this.restoreUser());
  private readonly loginInProgressSignal = signal(false);

  readonly users = this.loginOptionsSignal.asReadonly();
  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUserSignal() !== null);
  readonly isLoggingIn = this.loginInProgressSignal.asReadonly();
  readonly roleDisplayName = computed(() => this.currentUserSignal()?.roleDisplayName ?? 'Guest');

  constructor() {
    this.loadLoginOptions();
  }

  loadLoginOptions(): void {
    this.api.get<LoginOption[]>('auth/login-options').subscribe({
      next: (users) => this.loginOptionsSignal.set(users),
      error: () => this.loginOptionsSignal.set([]),
    });
  }

  login(userId: string): void {
    const selectedUser = this.loginOptionsSignal().find((item) => item.userId === userId);
    if (!selectedUser || this.loginInProgressSignal()) {
      return;
    }

    this.loginInProgressSignal.set(true);
    this.api
      .post<AuthResponse, { email: string; password: string | null }>('auth/login', {
        email: selectedUser.email,
        password: null,
      })
      .pipe(finalize(() => this.loginInProgressSignal.set(false)))
      .subscribe((response) => this.applyAuthResponse(response));
  }

  logout(): void {
    const refreshToken = this.storage.getString(AUTH_REFRESH_TOKEN_KEY);

    if (refreshToken) {
      this.api.post<unknown, { refreshToken: string }>('auth/logout', { refreshToken }).subscribe({
        error: () => undefined,
      });
    }

    this.clearSession();
    void this.router.navigateByUrl('/auth/login');
  }

  hasAnyRole(roles: TalentPilotRole[]): boolean {
    const user = this.currentUserSignal();
    if (!user) {
      return false;
    }

    return roles.some((role) => user.roles.includes(role));
  }

  hasPermission(permission: PermissionId | string): boolean {
    return this.currentUserSignal()?.permissions?.includes(permission) ?? false;
  }

  hasAnyPermission(permissions: readonly (PermissionId | string)[]): boolean {
    const userPermissions = this.currentUserSignal()?.permissions ?? [];
    return permissions.some((permission) => userPermissions.includes(permission));
  }

  hasAllPermissions(permissions: readonly (PermissionId | string)[]): boolean {
    const userPermissions = this.currentUserSignal()?.permissions ?? [];
    return permissions.every((permission) => userPermissions.includes(permission));
  }

  canAccessRoute(route: string): boolean {
    const routes = this.currentUserSignal()?.routes ?? [];
    return routes.some((allowedRoute) => route === allowedRoute || route.startsWith(`${allowedRoute}/`));
  }

  private applyAuthResponse(response: AuthResponse): void {
    this.storage.setString(AUTH_ACCESS_TOKEN_KEY, response.accessToken);
    this.storage.setString(AUTH_REFRESH_TOKEN_KEY, response.refreshToken);
    this.storage.setString(AUTH_EXPIRES_AT_KEY, response.expiresAtUtc);

    const user = this.toCurrentUser(response.user);
    this.currentUserSignal.set(user);
    this.storage.setJson(AUTH_USER_KEY, user);

    if (user.roles.includes('Candidate')) {
      void this.router.navigateByUrl('/candidate');
      return;
    }

    void this.router.navigateByUrl('/app/dashboard');
  }

  private toCurrentUser(user: BackendCurrentUserContext): CurrentUser {
    const roles = user.roles
      .map((role) => role.code)
      .filter((role): role is TalentPilotRole => isTalentPilotRole(role));

    return {
      id: user.userId,
      userId: user.userId,
      tenantId: user.tenantId,
      tenantDisplayName: user.tenantDisplayName,
      name: user.displayName,
      displayName: user.displayName,
      email: user.email,
      roleDisplayName: user.roleDisplayName,
      roles,
      permissions: user.permissions,
      groups: user.groups.map((group) => group.name),
      groupDetails: user.groups,
      routes: user.routes,
    };
  }

  private clearSession(): void {
    this.storage.remove(AUTH_ACCESS_TOKEN_KEY);
    this.storage.remove(AUTH_REFRESH_TOKEN_KEY);
    this.storage.remove(AUTH_EXPIRES_AT_KEY);
    this.storage.remove(AUTH_USER_KEY);
    this.currentUserSignal.set(null);
  }

  private restoreUser(): CurrentUser | null {
    return this.storage.getJson<CurrentUser | null>(AUTH_USER_KEY, null);
  }
}

function isTalentPilotRole(role: string): role is TalentPilotRole {
  return [
    'TenantAdmin',
    'Presales',
    'PMO',
    'Recruiter',
    'HiringManager',
    'Interviewer',
    'Employee',
    'Candidate',
  ].includes(role);
}
