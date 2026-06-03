import { Component, computed, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { LoginOption } from '../../core/models';

interface DemoRoleCard {
  label: string;
  roleCode: string;
  description: string;
  icon: string;
}

const DEMO_ROLE_CARDS: readonly DemoRoleCard[] = [
  {
    label: 'Pre-Sales',
    roleCode: 'Presales',
    description: 'Create resource requests and track PMO progress.',
    icon: 'request_quote',
  },
  {
    label: 'PMO',
    roleCode: 'PMO',
    description: 'Review intake, match bench talent, and hand off work.',
    icon: 'hub',
  },
  {
    label: 'HOD / Department Head',
    roleCode: 'HOD',
    description: 'Conduct final department interviews as an interviewer.',
    icon: 'workspace_premium',
  },
  {
    label: 'Hiring Manager',
    roleCode: 'HiringManager',
    description: 'Review final feedback, offers, and outcomes.',
    icon: 'approval_delegation',
  },
  {
    label: 'Recruiter',
    roleCode: 'Recruiter',
    description: 'Publish jobs, source candidates, and run interviews.',
    icon: 'campaign',
  },
  {
    label: 'Interviewer',
    roleCode: 'Interviewer',
    description: 'Complete assigned interviews and feedback.',
    icon: 'rate_review',
  },
  {
    label: 'Candidate Portal',
    roleCode: 'Candidate',
    description: 'Browse published jobs, apply, and track application status.',
    icon: 'person_search',
  },
  {
    label: 'Admin',
    roleCode: 'TenantAdmin',
    description: 'Configure tenant users, roles, routing, and AI settings.',
    icon: 'admin_panel_settings',
  },
];

@Component({
  selector: 'app-login',
  imports: [RouterLink],
  template: `
    <main class="login-page redesigned-login-page">
      <section class="login-hero-panel" aria-label="Talent Pilot product overview">
        <a class="login-brand-lockup" routerLink="/candidate/jobs" aria-label="Talent Pilot job portal">
          <span class="talent-pilot-logo" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </span>
          <span>
            <img class="brand-wordmark-logo" src="/ai-unlimited-mark.png" alt="AI Unlimited" />
            <em>Talent Pilot</em>
          </span>
        </a>

        <div class="login-hero-copy">
          <p class="eyebrow">Internal-first talent fulfillment</p>
          <h1>Plan, source, interview, and close hiring work in one flow.</h1>
          <p>
            Presales, PMO, Recruiters, HOD interviewers, and Hiring Managers work from the same
            audited Job Request lifecycle.
          </p>
        </div>

        <ul class="login-workflow-list" aria-label="Talent Pilot workflow">
          <li>
            <span class="material-symbols-outlined" aria-hidden="true">route</span>
            Department routing sends Presales requests to the right PMO group.
          </li>
          <li>
            <span class="material-symbols-outlined" aria-hidden="true">psychology</span>
            Advisory AI drafts descriptions, ranks bench fit, and rediscovers warm candidates.
          </li>
          <li>
            <span class="material-symbols-outlined" aria-hidden="true">fact_check</span>
            Recruiters control publishing, interviews, and candidate movement.
          </li>
        </ul>

        <div class="login-module-chips" aria-label="Core modules">
          <span>Job Requests</span>
          <span>PMO Review</span>
          <span>Candidate Rediscovery</span>
          <span>Interview Feedback</span>
          <span>Offer Outcome</span>
        </div>

        <div class="login-stats-grid" aria-label="Talent Pilot coverage">
          <article>
            <strong>8</strong>
            <span>demo sign-ins</span>
          </article>
          <article>
            <strong>7</strong>
            <span>active AI agents</span>
          </article>
          <article>
            <strong>100%</strong>
            <span>human-owned decisions</span>
          </article>
        </div>
      </section>

      <section class="login-form-panel" aria-label="Sign in">
        <div class="login-card-header">
          <p class="eyebrow">Welcome back</p>
          <h2>Sign in to Talent Pilot</h2>
          <p>Use demo credentials or choose a role card to open the matching workspace.</p>
        </div>

        <form class="login-form" (submit)="submitCredentials($event)">
          <label>
            <span>Work email</span>
            <input
              type="email"
              autocomplete="username"
              placeholder="name@company.com"
              [value]="email()"
              (input)="setEmail($event)"
              [disabled]="auth.isLoggingIn()"
            />
          </label>

          <label>
            <span>Password</span>
            <input
              type="password"
              autocomplete="current-password"
              placeholder="Demo password"
              [value]="password()"
              (input)="setPassword($event)"
              [disabled]="auth.isLoggingIn()"
            />
          </label>

          <div class="login-form-row">
            <label class="keep-signed-in">
              <input type="checkbox" [checked]="keepSignedIn()" (change)="setKeepSignedIn($event)" />
              <span>Keep me signed in</span>
            </label>
          </div>

          <button type="submit" class="login-submit-button" [disabled]="!canSubmitCredentials()">
            {{ auth.isLoggingIn() ? 'Signing in...' : 'Sign in' }}
          </button>

          <a class="candidate-portal-card" routerLink="/candidate/jobs" aria-label="Open Talent Pilot Candidate Portal">
            <span class="candidate-portal-icon material-symbols-outlined" aria-hidden="true">work</span>
            <span>
              <strong>Candidate portal</strong>
              <small>Browse published jobs and apply with a candidate account.</small>
            </span>
            <span class="candidate-portal-arrow material-symbols-outlined" aria-hidden="true">arrow_forward</span>
          </a>

          @if (auth.loginError()) {
            <p class="login-error">{{ auth.loginError() }}</p>
          }
        </form>

        <div class="demo-role-section">
          <div>
            <h3>Demo role cards</h3>
            <p>Cards use backend login options and the same auth endpoint.</p>
          </div>

          <div class="demo-role-grid">
            @for (card of demoCards(); track card.label) {
              <button
                type="button"
                class="demo-role-card"
                [disabled]="auth.isLoggingIn() || !card.user"
                (click)="selectDemoCard(card)"
              >
                <span class="material-symbols-outlined" aria-hidden="true">{{ card.icon }}</span>
                <span>
                  <strong>{{ card.label }}</strong>
                  <small>{{ card.user?.displayName ?? 'Not configured' }}</small>
                  <em>{{ card.description }}</em>
                </span>
              </button>
            }
          </div>
        </div>

        @if (auth.isLoggingIn()) {
          <p class="muted login-status">Resolving profile, roles, groups, and permissions...</p>
        }
      </section>
    </main>
  `,
})
export class LoginComponent {
  readonly email = signal('');
  readonly password = signal('demo');
  readonly keepSignedIn = signal(true);
  readonly demoCards = computed(() =>
    DEMO_ROLE_CARDS.map((card) => ({
      ...card,
      user: this.findUserForRole(card.roleCode),
    })),
  );

  constructor(readonly auth: AuthService, private readonly route: ActivatedRoute) {}

  setEmail(event: Event): void {
    this.email.set((event.target as HTMLInputElement).value);
  }

  setPassword(event: Event): void {
    this.password.set((event.target as HTMLInputElement).value);
  }

  setKeepSignedIn(event: Event): void {
    this.keepSignedIn.set((event.target as HTMLInputElement).checked);
  }

  selectDemoCard(card: DemoRoleCard & { user?: LoginOption }): void {
    if (!card.user) {
      return;
    }

    this.email.set(card.user.email);
    this.password.set('demo');
    const returnUrl = this.returnUrl();
    if (returnUrl) {
      this.auth.loginDemoUser(card.user, this.keepSignedIn(), returnUrl);
    } else {
      this.auth.loginDemoUser(card.user, this.keepSignedIn());
    }
  }

  submitCredentials(event: Event): void {
    event.preventDefault();
    if (!this.canSubmitCredentials()) {
      return;
    }

    const returnUrl = this.returnUrl();
    if (returnUrl) {
      this.auth.loginWithCredentials(this.email(), this.password(), this.keepSignedIn(), returnUrl);
    } else {
      this.auth.loginWithCredentials(this.email(), this.password(), this.keepSignedIn());
    }
  }

  canSubmitCredentials(): boolean {
    return !this.auth.isLoggingIn() && this.email().trim().length > 0 && this.password().trim().length > 0;
  }

  private findUserForRole(roleCode: string): LoginOption | undefined {
    return this.auth.users().find((user) => user.roles.some((role) => role.code === roleCode));
  }

  private returnUrl(): string | null {
    return this.route.snapshot.queryParamMap.get('returnUrl');
  }
}
