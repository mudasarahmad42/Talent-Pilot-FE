import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { TalentPilotStoreService } from '../../core/talent-pilot-store.service';

@Component({
  selector: 'app-candidate-signup',
  imports: [FormsModule, RouterLink],
  template: `
    <main class="candidate-page stitch-candidate-page">
      <section class="candidate-signup-layout">
        <article class="candidate-panel candidate-signup-card">
          <header>
            <p class="eyebrow">Candidate account</p>
            <h1>Create your candidate profile</h1>
            <p>Use this account to apply, save your profile, and track your application progress.</p>
          </header>

          <form class="candidate-signup-form" (ngSubmit)="submit()">
            <label class="stitch-field">
              <span>Full name</span>
              <input name="displayName" autocomplete="name" required [readonly]="namePrefilled()" [(ngModel)]="displayName" />
            </label>

            <label class="stitch-field">
              <span>Email</span>
              <input name="email" type="email" autocomplete="email" required [readonly]="emailPrefilled()" [(ngModel)]="email" />
            </label>

            @if (invitePrefilled()) {
              <p class="candidate-signup-invite-note">
                This invitation is linked to your email. Add a password to activate your candidate account.
              </p>
            }

            <label class="stitch-field">
              <span>Password</span>
              <input name="password" type="password" autocomplete="new-password" required [(ngModel)]="password" />
            </label>

            <label class="stitch-field">
              <span>Confirm password</span>
              <input name="confirmPassword" type="password" autocomplete="new-password" required [(ngModel)]="confirmPassword" />
            </label>

            @if (localError()) {
              <p class="field-status error">{{ localError() }}</p>
            }
            @if (auth.loginError()) {
              <p class="field-status error">{{ auth.loginError() }}</p>
            }

            <button class="btn primary full" type="submit" [disabled]="!canSubmit()">
              {{ auth.isLoggingIn() ? 'Creating account...' : 'Create account' }}
            </button>
          </form>

          <p class="candidate-signup-secondary">
            Already have an account?
            <a [routerLink]="['/auth/login']" [queryParams]="loginQueryParams()">Sign in</a>
          </p>
        </article>
      </section>
    </main>
  `,
  styles: [
    `
      .candidate-signup-layout {
        display: grid;
        place-items: start center;
        padding: 48px 24px 72px;
      }

      .candidate-signup-card {
        width: min(100%, 560px);
        display: grid;
        gap: 22px;
      }

      .candidate-signup-card h1 {
        margin: 0;
        color: #0f172a;
        font-size: 32px;
        line-height: 1.1;
      }

      .candidate-signup-card header p:last-child,
      .candidate-signup-secondary {
        margin: 8px 0 0;
        color: #64748b;
      }

      .candidate-signup-form {
        display: grid;
        gap: 16px;
      }

      .candidate-signup-form input[readonly] {
        background: #f8fafc;
        color: #334155;
        cursor: default;
      }

      .candidate-signup-invite-note {
        margin: -4px 0 0;
        color: #0f766e;
        font-size: 14px;
        line-height: 1.5;
      }

      .candidate-signup-secondary a {
        font-weight: 800;
        color: #0a66c2;
      }
    `,
  ],
})
export class CandidateSignupComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(TalentPilotStoreService);

  displayName = '';
  email = '';
  password = '';
  confirmPassword = '';
  readonly localError = signal('');
  readonly invitePrefilled = signal(false);
  readonly namePrefilled = signal(false);
  readonly emailPrefilled = signal(false);
  readonly tenantSlug = computed(() => this.route.snapshot.paramMap.get('tenantSlug') ?? this.route.snapshot.queryParamMap.get('tenantSlug'));
  readonly jobPostId = computed(() => this.route.snapshot.queryParamMap.get('jobPostId'));
  readonly inviteId = computed(() => this.route.snapshot.queryParamMap.get('inviteId'));
  readonly inviteToken = computed(() => this.route.snapshot.queryParamMap.get('token'));
  readonly returnUrl = computed(() => this.route.snapshot.queryParamMap.get('returnUrl'));

  ngOnInit(): void {
    void this.prefillFromInvitation();
  }

  canSubmit(): boolean {
    return (
      !this.auth.isLoggingIn() &&
      this.displayName.trim().length >= 2 &&
      this.email.trim().length > 0 &&
      this.password.length >= 8 &&
      this.confirmPassword.length >= 8
    );
  }

  submit(): void {
    this.localError.set('');
    if (this.password !== this.confirmPassword) {
      this.localError.set('Passwords do not match.');
      return;
    }

    this.auth.signupCandidate(
      {
        tenantSlug: this.tenantSlug(),
        jobPostId: this.jobPostId(),
        displayName: this.displayName,
        email: this.email,
        password: this.password,
        candidateInvitationId: this.inviteId(),
        invitationToken: this.inviteToken(),
      },
      false,
      this.returnUrl() ?? this.defaultReturnUrl(),
    );
  }

  loginQueryParams(): Record<string, string> {
    const params: Record<string, string> = {
      returnUrl: this.returnUrl() ?? this.defaultReturnUrl(),
      switchAccount: 'candidate',
    };
    return params;
  }

  private defaultReturnUrl(): string {
    const slug = this.tenantSlug();
    return slug ? `/candidate/${encodeURIComponent(slug)}/profile` : '/candidate/profile';
  }

  private async prefillFromInvitation(): Promise<void> {
    const inviteId = this.inviteId();
    const token = this.inviteToken();
    if (!inviteId || !token) {
      return;
    }

    try {
      const invitation = await this.store.loadPortalInvitation(inviteId, token);
      const displayName = invitation.candidateDisplayName?.trim();
      const email = invitation.candidateEmail?.trim();

      if (displayName && !this.displayName.trim()) {
        this.displayName = displayName;
        this.namePrefilled.set(true);
      }

      if (email && !this.email.trim()) {
        this.email = email;
        this.emailPrefilled.set(true);
      }

      this.invitePrefilled.set(this.namePrefilled() || this.emailPrefilled());
    } catch {
      this.invitePrefilled.set(false);
      this.namePrefilled.set(false);
      this.emailPrefilled.set(false);
    }
  }
}
