import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpContext } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, map, shareReplay, tap, throwError } from 'rxjs';
import { AuthResponse, BackendCurrentUserContext, CandidateSignupRequest, CurrentUser, LoginOption, TalentPilotRole } from './models';
import { PermissionId } from './permissions';
import { ApiService } from './services/api.service';
import { StorageArea, StorageService } from './services/storage.service';
import { SUPPRESS_API_ERROR_TOAST } from './interceptors/api-error.interceptor';

export const AUTH_ACCESS_TOKEN_KEY = 'talent-pilot.auth.access-token';

const AUTH_REFRESH_TOKEN_KEY = 'talent-pilot.auth.refresh-token';
const AUTH_EXPIRES_AT_KEY = 'talent-pilot.auth.expires-at';
const AUTH_USER_KEY = 'talent-pilot.auth.current-user';
const ADMIN_ROLES: readonly TalentPilotRole[] = ['SystemAdmin', 'TenantAdmin'];
const INTERNAL_APP_ROLES: readonly TalentPilotRole[] = [
  'SystemAdmin',
  'TenantAdmin',
  'Presales',
  'PMO',
  'Recruiter',
  'HiringManager',
  'HOD',
  'Interviewer',
  'Employee',
];
const AUTH_STORAGE_AREAS: readonly StorageArea[] = ['session', 'local'];

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly storage = inject(StorageService);
  private readonly loginOptionsSignal = signal<LoginOption[]>([]);
  private readonly currentUserSignal = signal<CurrentUser | null>(this.restoreUser());
  private readonly loginInProgressSignal = signal(false);
  private readonly loginErrorSignal = signal('');
  private readonly activeStorageAreaSignal = signal<StorageArea>(this.restoreStorageArea());
  private refreshInProgress$: Observable<string> | null = null;

  readonly users = this.loginOptionsSignal.asReadonly();
  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUserSignal() !== null);
  readonly isLoggingIn = this.loginInProgressSignal.asReadonly();
  readonly loginError = this.loginErrorSignal.asReadonly();
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

  loginDemoUser(user: LoginOption, keepSignedIn = false, returnUrl?: string | null): void {
    this.loginWithCredentials(user.email, 'demo', keepSignedIn, returnUrl);
  }

  loginWithCredentials(email: string, password: string | null, keepSignedIn = false, returnUrl?: string | null): void {
    const normalizedEmail = email.trim();
    const normalizedPassword = password?.trim() ?? '';
    if (!normalizedEmail || !normalizedPassword || this.loginInProgressSignal()) {
      return;
    }

    this.loginErrorSignal.set('');
    this.loginInProgressSignal.set(true);
    const storageArea: StorageArea = keepSignedIn ? 'local' : 'session';
    this.api
      .post<AuthResponse, { email: string; password: string }>('auth/login', {
        email: normalizedEmail,
        password: normalizedPassword,
      })
      .pipe(finalize(() => this.loginInProgressSignal.set(false)))
      .subscribe({
        next: (response) => this.applyAuthResponse(response, storageArea, true, returnUrl),
        error: (error) => this.loginErrorSignal.set(this.toLoginErrorMessage(error)),
      });
  }

  signupCandidate(input: CandidateSignupRequest, keepSignedIn = false, returnUrl?: string | null): void {
    const normalizedInput: CandidateSignupRequest = {
      ...input,
      tenantSlug: input.tenantSlug?.trim() || null,
      jobPostId: input.jobPostId?.trim() || null,
      displayName: input.displayName.trim(),
      email: input.email.trim(),
      password: input.password,
      candidateInvitationId: input.candidateInvitationId?.trim() || null,
      invitationToken: input.invitationToken?.trim() || null,
    };

    if (
      !normalizedInput.displayName ||
      !normalizedInput.email ||
      !normalizedInput.password ||
      this.loginInProgressSignal()
    ) {
      return;
    }

    this.loginErrorSignal.set('');
    this.loginInProgressSignal.set(true);
    const storageArea: StorageArea = keepSignedIn ? 'local' : 'session';
    this.api
      .post<AuthResponse, CandidateSignupRequest>('auth/candidate-signup', normalizedInput)
      .pipe(finalize(() => this.loginInProgressSignal.set(false)))
      .subscribe({
        next: (response) => this.applyAuthResponse(response, storageArea, true, returnUrl),
        error: (error) => this.loginErrorSignal.set(this.toLoginErrorMessage(error)),
      });
  }

  logout(): void {
    const refreshToken = this.storage.getString(AUTH_REFRESH_TOKEN_KEY, this.activeStorageAreaSignal());

    if (refreshToken) {
      this.api.post<unknown, { refreshToken: string }>('auth/logout', { refreshToken }).subscribe({
        error: () => undefined,
      });
    }

    this.clearSession();
    void this.router.navigateByUrl('/auth/login');
  }

  getAccessToken(): string | null {
    return this.storage.getString(AUTH_ACCESS_TOKEN_KEY, this.activeStorageAreaSignal()) ?? this.findStoredString(AUTH_ACCESS_TOKEN_KEY);
  }

  refreshSession(): Observable<string> {
    if (this.refreshInProgress$) {
      return this.refreshInProgress$;
    }

    let storageArea = this.activeStorageAreaSignal();
    let refreshToken = this.storage.getString(AUTH_REFRESH_TOKEN_KEY, storageArea);
    if (!refreshToken) {
      const storedRefreshToken = this.findStoredStringWithArea(AUTH_REFRESH_TOKEN_KEY);
      refreshToken = storedRefreshToken?.value ?? null;
      storageArea = storedRefreshToken?.area ?? storageArea;
    }

    if (!refreshToken) {
      return throwError(() => new Error('Refresh token is missing.'));
    }

    this.refreshInProgress$ = this.api
      .post<AuthResponse, { refreshToken: string }>('auth/refresh', { refreshToken }, {
        context: new HttpContext().set(SUPPRESS_API_ERROR_TOAST, true),
      })
      .pipe(
        tap((response) => this.applyAuthResponse(response, storageArea, false)),
        map((response) => response.accessToken),
        catchError((error) => {
          this.clearSession();
          return throwError(() => error);
        }),
        finalize(() => {
          this.refreshInProgress$ = null;
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );

    return this.refreshInProgress$;
  }

  handleAuthExpired(): void {
    this.clearSession();
    void this.router.navigateByUrl('/auth/login');
  }

  hasAnyRole(roles: readonly TalentPilotRole[]): boolean {
    const user = this.currentUserSignal();
    if (!user) {
      return false;
    }

    return roles.some((role) => user.roles.includes(role)) ||
      (user.roles.includes('SystemAdmin') && roles.includes('TenantAdmin'));
  }

  isAdmin(): boolean {
    return this.hasAnyRole(ADMIN_ROLES);
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

  private applyAuthResponse(response: AuthResponse, storageArea: StorageArea, navigate = true, returnUrl?: string | null): void {
    this.clearStoredAuth();
    this.activeStorageAreaSignal.set(storageArea);
    this.storage.setString(AUTH_ACCESS_TOKEN_KEY, response.accessToken, storageArea);
    this.storage.setString(AUTH_REFRESH_TOKEN_KEY, response.refreshToken, storageArea);
    this.storage.setString(AUTH_EXPIRES_AT_KEY, response.expiresAtUtc, storageArea);

    const user = this.toCurrentUser(response.user);
    this.currentUserSignal.set(user);
    this.storage.setJson(AUTH_USER_KEY, user, storageArea);

    if (!navigate) {
      return;
    }

    const safeReturnUrl = this.safeReturnUrl(returnUrl, user);
    if (safeReturnUrl) {
      void this.router.navigateByUrl(safeReturnUrl);
      return;
    }

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
    this.clearStoredAuth();
    this.currentUserSignal.set(null);
  }

  private restoreUser(): CurrentUser | null {
    for (const area of AUTH_STORAGE_AREAS) {
      const user = this.storage.getJson<CurrentUser | null>(AUTH_USER_KEY, null, area);
      if (user) {
        return user;
      }
    }

    return null;
  }

  private restoreStorageArea(): StorageArea {
    return this.storage.getString(AUTH_USER_KEY, 'session') ? 'session' : 'local';
  }

  private findStoredString(key: string): string | null {
    return this.findStoredStringWithArea(key)?.value ?? null;
  }

  private findStoredStringWithArea(key: string): { area: StorageArea; value: string } | null {
    for (const area of AUTH_STORAGE_AREAS) {
      const value = this.storage.getString(key, area);
      if (value) {
        this.activeStorageAreaSignal.set(area);
        return { area, value };
      }
    }

    return null;
  }

  private clearStoredAuth(): void {
    for (const area of AUTH_STORAGE_AREAS) {
      this.storage.remove(AUTH_ACCESS_TOKEN_KEY, area);
      this.storage.remove(AUTH_REFRESH_TOKEN_KEY, area);
      this.storage.remove(AUTH_EXPIRES_AT_KEY, area);
      this.storage.remove(AUTH_USER_KEY, area);
    }
  }

  private safeReturnUrl(returnUrl: string | null | undefined, user: CurrentUser): string | null {
    const value = returnUrl?.trim();
    if (!value || !value.startsWith('/') || value.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(value)) {
      return null;
    }

    if (this.isCandidateOnly(user) && this.isInternalAppUrl(value)) {
      return '/candidate';
    }

    return value;
  }

  private isCandidateOnly(user: CurrentUser): boolean {
    return user.roles.includes('Candidate') && !user.roles.some((role) => INTERNAL_APP_ROLES.includes(role));
  }

  private isInternalAppUrl(value: string): boolean {
    return ['/app', '/admin-center', '/settings'].some((prefix) => value === prefix || value.startsWith(`${prefix}/`));
  }

  private toLoginErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Sign in failed. Check the email and password.';
  }
}

function isTalentPilotRole(role: string): role is TalentPilotRole {
  return [
    'SystemAdmin',
    'TenantAdmin',
    'Presales',
    'PMO',
    'Recruiter',
    'HiringManager',
    'HOD',
    'Interviewer',
    'Employee',
    'Candidate',
  ].includes(role);
}
