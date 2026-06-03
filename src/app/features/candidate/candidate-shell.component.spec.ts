import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { CurrentUser } from '../../core/models';
import { CandidateShellComponent } from './candidate-shell.component';

describe('CandidateShellComponent', () => {
  const userSignal = signal<CurrentUser | null>(null);

  beforeEach(async () => {
    userSignal.set(null);

    await TestBed.configureTestingModule({
      imports: [CandidateShellComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            currentUser: userSignal.asReadonly(),
            logout: vi.fn(),
          },
        },
      ],
    }).compileComponents();
  });

  it('shows only Jobs navigation for anonymous users', () => {
    const fixture = TestBed.createComponent(CandidateShellComponent);
    const component = fixture.componentInstance;

    expect(component.navItems().map((item) => item.label)).toEqual(['Jobs']);
  });

  it('shows all candidate tabs for signed-in users and labels internal accounts clearly', () => {
    userSignal.set({
      id: 'user-1',
      name: 'Sara Malik',
      email: 'sara@example.com',
      roleDisplayName: 'Recruiter',
      roles: ['Recruiter'],
      groups: [],
    });

    const fixture = TestBed.createComponent(CandidateShellComponent);
    const component = fixture.componentInstance;

    expect(component.navItems().map((item) => item.label)).toEqual(['Jobs', 'My Applications', 'Profile', 'Interviews']);
    expect(component.accountLabel()).toBe('Recruiter account');
  });
});
