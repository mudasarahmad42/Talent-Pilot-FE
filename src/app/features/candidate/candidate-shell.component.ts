import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { CANDIDATE_NAV } from './candidate-experience.data';

@Component({
  selector: 'app-candidate-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="candidate-shell">
      <header class="topbar candidate-topbar">
        <a class="brand app-brand" routerLink="/candidate/jobs" aria-label="Talent Pilot job portal">
          <img class="brand-ai-logo" src="/ai-unlimited-mark.png" alt="" aria-hidden="true" />
          <strong>Talent Pilot</strong>
        </a>

        <nav class="top-links candidate-links" aria-label="Candidate navigation">
          @for (item of navItems(); track item.route) {
            <a [routerLink]="item.route" routerLinkActive="active">
              <span class="material-symbols-outlined" aria-hidden="true">{{ item.icon }}</span>
              {{ item.label }}
            </a>
          }
        </nav>

        <div class="user-menu">
          @if (currentUser(); as user) {
            <details class="candidate-account-menu">
              <summary class="candidate-account-pill">
                <span class="avatar small">{{ initials(user.name) }}</span>
                <span>
                  <strong>{{ user.name }}</strong>
                  <small>Candidate account</small>
                </span>
                <span class="material-symbols-outlined account-menu-caret" aria-hidden="true">expand_more</span>
              </summary>
              <div class="candidate-account-dropdown" role="menu">
                <button type="button" class="candidate-account-action" role="menuitem" (click)="auth.logout()">
                  <span class="material-symbols-outlined" aria-hidden="true">logout</span>
                  Sign out
                </button>
              </div>
            </details>
          } @else {
            <a class="btn secondary compact candidate-login-link" routerLink="/auth/login">
              <span class="material-symbols-outlined" aria-hidden="true">login</span>
              Sign in to apply
            </a>
          }
        </div>
      </header>

      <section class="candidate-content">
        <router-outlet />
      </section>
    </div>
  `,
})
export class CandidateShellComponent {
  readonly auth = inject(AuthService);
  readonly currentUser = computed(() => this.auth.currentUser());
  readonly navItems = computed(() => {
    const user = this.currentUser();
    if (!user?.roles.includes('Candidate')) {
      return CANDIDATE_NAV.filter((item) => item.route === '/candidate/jobs');
    }

    return CANDIDATE_NAV;
  });

  initials(name: string): string {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }
}
