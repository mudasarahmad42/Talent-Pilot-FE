import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LoginComponent } from './login.component';
import { AuthService } from '../../core/auth.service';
import { LoginOption } from '../../core/models';

describe('LoginComponent', () => {
  const isLoggingIn = signal(false);
  const loginError = signal('');
  const users = signal<LoginOption[]>([
    {
      userId: 'presales-1',
      displayName: 'Ahmed Raza',
      email: 'ai-presales@8pkk57.onmicrosoft.com',
      roleDisplayName: 'Pre-Sales',
      roles: [{ roleId: 'role-presales', code: 'Presales', displayName: 'Pre-Sales', priority: 10 }],
      groups: [],
    },
    {
      userId: 'candidate-1',
      displayName: 'Ayesha Khan',
      email: 'ai-candidate@8pkk57.onmicrosoft.com',
      roleDisplayName: 'Candidate',
      roles: [{ roleId: 'role-candidate', code: 'Candidate', displayName: 'Candidate', priority: 10 }],
      groups: [],
    },
  ]);
  const auth = {
    users: users.asReadonly(),
    isLoggingIn: isLoggingIn.asReadonly(),
    loginError: loginError.asReadonly(),
    loginDemoUser: vi.fn(),
    loginWithCredentials: vi.fn(),
  };

  let fixture: ComponentFixture<LoginComponent>;

  beforeEach(async () => {
    auth.loginDemoUser.mockClear();
    auth.loginWithCredentials.mockClear();
    isLoggingIn.set(false);
    loginError.set('');

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
  });

  it('renders all configured demo role cards including Candidate Portal', () => {
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Pre-Sales');
    expect(text).toContain('Candidate Portal');
    expect(text).toContain('Admin');
  });

  it('renders a public product documentation link before sign-in', () => {
    const docsLink = fixture.nativeElement.querySelector('a[aria-label="Open Talent Pilot product documentation"]') as HTMLAnchorElement | null;

    expect(fixture.nativeElement.textContent).toContain('Product documentation');
    expect(docsLink?.getAttribute('href')).toBe('/docs');
  });

  it('submits manual credentials through AuthService', () => {
    const component = fixture.componentInstance;
    component.email.set('ai-presales@8pkk57.onmicrosoft.com');
    component.password.set('demo');
    component.keepSignedIn.set(false);

    component.submitCredentials(new Event('submit'));

    expect(auth.loginWithCredentials).toHaveBeenCalledWith(
      'ai-presales@8pkk57.onmicrosoft.com',
      'demo',
      false,
    );
  });

  it('demo cards autofill the seeded email and use normal demo-password auth', () => {
    const component = fixture.componentInstance;
    const candidateCard = component.demoCards().find((card) => card.roleCode === 'Candidate');

    expect(candidateCard?.user?.email).toBe('ai-candidate@8pkk57.onmicrosoft.com');

    component.selectDemoCard(candidateCard!);

    expect(component.email()).toBe('ai-candidate@8pkk57.onmicrosoft.com');
    expect(component.password()).toBe('demo');
    expect(auth.loginDemoUser).toHaveBeenCalledWith(candidateCard!.user, false);
  });

  it('disables credential submit while login is in progress', () => {
    const component = fixture.componentInstance;
    component.email.set('ai-presales@8pkk57.onmicrosoft.com');
    component.password.set('demo');
    isLoggingIn.set(true);

    expect(component.canSubmitCredentials()).toBe(false);
  });
});
