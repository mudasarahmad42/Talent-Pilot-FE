import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService, AUTH_ACCESS_TOKEN_KEY } from './auth.service';
import { AuthResponse, LoginOption } from './models';
import { ApiService } from './services/api.service';
import { StorageService } from './services/storage.service';

describe('AuthService', () => {
  const authResponse: AuthResponse = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    expiresAtUtc: '2030-01-01T00:00:00Z',
    user: {
      userId: 'user-presales',
      tenantId: 'tenant-1',
      tenantDisplayName: 'Recruitment Ops',
      displayName: 'Ahmed Raza',
      email: 'ai-presales@8pkk57.onmicrosoft.com',
      roleDisplayName: 'Pre-Sales',
      roles: [{ roleId: 'role-presales', code: 'Presales', displayName: 'Pre-Sales', priority: 10 }],
      permissions: ['CreateJobRequests'],
      groups: [],
      routes: ['/app/job-requests'],
    },
  };

  const loginOption: LoginOption = {
    userId: authResponse.user.userId,
    displayName: authResponse.user.displayName,
    email: authResponse.user.email,
    roleDisplayName: authResponse.user.roleDisplayName,
    roles: authResponse.user.roles,
    groups: [],
  };

  let api: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
  };
  let router: { navigateByUrl: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    api = {
      get: vi.fn().mockReturnValue(of([loginOption])),
      post: vi.fn().mockReturnValue(of(authResponse)),
    };
    router = { navigateByUrl: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        StorageService,
        { provide: ApiService, useValue: api },
        { provide: Router, useValue: router },
      ],
    });
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('loads demo login options from the backend', () => {
    const service = TestBed.inject(AuthService);

    expect(api.get).toHaveBeenCalledWith('auth/login-options');
    expect(service.users()).toEqual([loginOption]);
  });

  it('sends manual credentials through the real login endpoint and stores a local session when requested', () => {
    const service = TestBed.inject(AuthService);

    service.loginWithCredentials(' ai-presales@8pkk57.onmicrosoft.com ', ' demo ', true);

    expect(api.post).toHaveBeenCalledWith('auth/login', {
      email: 'ai-presales@8pkk57.onmicrosoft.com',
      password: 'demo',
    });
    expect(localStorage.getItem(AUTH_ACCESS_TOKEN_KEY)).toBe('access-token');
    expect(sessionStorage.getItem(AUTH_ACCESS_TOKEN_KEY)).toBeNull();
    expect(service.currentUser()?.roles).toEqual(['Presales']);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/app/dashboard');
  });

  it('uses session storage when Keep me signed in is unchecked', () => {
    const service = TestBed.inject(AuthService);

    service.loginWithCredentials(loginOption.email, 'demo', false);

    expect(sessionStorage.getItem(AUTH_ACCESS_TOKEN_KEY)).toBe('access-token');
    expect(localStorage.getItem(AUTH_ACCESS_TOKEN_KEY)).toBeNull();
  });

  it('demo role cards still submit a real demo password instead of bypassing auth', () => {
    const service = TestBed.inject(AuthService);

    service.loginDemoUser(loginOption, true);

    expect(api.post).toHaveBeenCalledWith('auth/login', {
      email: loginOption.email,
      password: 'demo',
    });
  });

  it('navigates to a safe return URL after login', () => {
    const service = TestBed.inject(AuthService);

    service.loginWithCredentials(loginOption.email, 'demo', true, '/candidate/apply/post-1?source=invite');

    expect(router.navigateByUrl).toHaveBeenCalledWith('/candidate/apply/post-1?source=invite');
  });

  it('ignores external return URLs after login', () => {
    const service = TestBed.inject(AuthService);

    service.loginWithCredentials(loginOption.email, 'demo', true, 'https://example.com/candidate/apply/post-1');

    expect(router.navigateByUrl).toHaveBeenCalledWith('/app/dashboard');
  });

  it('keeps the current user unset when password authentication fails', () => {
    api.post.mockReturnValueOnce(throwError(() => new Error('Invalid credentials.')));
    const service = TestBed.inject(AuthService);

    service.loginWithCredentials(loginOption.email, 'wrong', true);

    expect(service.currentUser()).toBeNull();
    expect(service.loginError()).toBe('Invalid credentials.');
    expect(localStorage.getItem(AUTH_ACCESS_TOKEN_KEY)).toBeNull();
  });
});
