import { Component } from '@angular/core';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  template: `
    <main class="login-page">
      <section class="login-panel">
        <div>
          <p class="eyebrow">Talent Pilot</p>
          <h1>Recruitment operations workspace</h1>
          <p class="muted">
            Select a backend user profile to open the role-aware MVP experience.
          </p>
        </div>

        <div class="login-grid">
          @for (user of auth.users(); track user.userId) {
            <button type="button" class="user-card" [disabled]="auth.isLoggingIn()" (click)="auth.login(user.userId)">
              <span class="avatar">{{ initials(user.displayName) }}</span>
              <span>
                <strong>{{ user.displayName }}</strong>
                <small>{{ user.email }}</small>
                <em>{{ user.roleDisplayName }}</em>
              </span>
            </button>
          }
        </div>

        @if (auth.isLoggingIn()) {
          <p class="muted login-status">Resolving profile, roles, and permissions...</p>
        }
      </section>
    </main>
  `,
})
export class LoginComponent {
  constructor(readonly auth: AuthService) {}

  initials(name: string): string {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }
}
