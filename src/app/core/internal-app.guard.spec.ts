import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { internalAppGuard } from './internal-app.guard';
import { AuthService } from './auth.service';

describe('internalAppGuard', () => {
  let auth: {
    isAuthenticated: ReturnType<typeof vi.fn>;
    hasAnyRole: ReturnType<typeof vi.fn>;
  };
  let router: { parseUrl: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    auth = {
      isAuthenticated: vi.fn().mockReturnValue(true),
      hasAnyRole: vi.fn().mockReturnValue(false),
    };
    router = {
      parseUrl: vi.fn((url: string) => ({ url }) as unknown as UrlTree),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('allows users with internal app roles', () => {
    auth.hasAnyRole.mockImplementation((roles: readonly string[]) => roles.includes('Recruiter'));

    const result = TestBed.runInInjectionContext(() => internalAppGuard({} as never, {} as never));

    expect(result).toBe(true);
  });

  it('redirects candidate-only users to the candidate portal', () => {
    auth.hasAnyRole.mockImplementation((roles: readonly string[]) => roles.includes('Candidate'));

    const result = TestBed.runInInjectionContext(() => internalAppGuard({} as never, {} as never));

    expect(result).toEqual({ url: '/candidate' });
  });

  it('redirects unauthenticated users to login', () => {
    auth.isAuthenticated.mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() => internalAppGuard({} as never, {} as never));

    expect(result).toEqual({ url: '/auth/login' });
  });
});
