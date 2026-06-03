import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { AiHealthWarningComponent } from '../../core/components/ai-health-warning.component';
import { CANDIDATE_NAV } from './candidate-experience.data';

@Component({
  selector: 'app-candidate-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AiHealthWarningComponent],
  template: `
    <div class="candidate-shell">
      <header class="topbar candidate-topbar">
        <a class="brand app-brand" routerLink="/candidate/jobs" aria-label="Talent Pilot job portal">
          <span class="talent-pilot-logo app-brand-icon" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </span>
          <span class="app-brand-copy">
            <img class="brand-ai-logo" src="/ai-unlimited-mark.png" alt="" aria-hidden="true" />
            <strong>Talent Pilot</strong>
          </span>
        </a>

        <nav class="top-links candidate-links" aria-label="Candidate navigation">
          @for (item of navItems(); track item.route) {
            <a [routerLink]="item.route" routerLinkActive="active">
              {{ item.label }}
            </a>
          }
        </nav>

        <div class="user-menu">
          @if (currentUser(); as user) {
            <app-ai-health-warning />
            <details class="candidate-account-menu">
              <summary class="candidate-account-pill">
                <span class="avatar small">{{ initials(user.name) }}</span>
                <span>
                  <strong>{{ user.name }}</strong>
                  <small>{{ accountLabel() }}</small>
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

      <footer class="candidate-footer">
        <div class="candidate-footer-inner">
          <span><strong>Talent Pilot</strong> &copy; 2026 Talent Pilot. Powered by TKXEL.</span>
          <nav aria-label="Candidate portal footer links">
            <a routerLink="/candidate/jobs">Careers</a>
            <a routerLink="/candidate/profile">Privacy Policy</a>
            <a routerLink="/candidate/jobs">Terms of Service</a>
          </nav>
        </div>
      </footer>
    </div>
  `,
})
export class CandidateShellComponent {
  readonly auth = inject(AuthService);
  readonly currentUser = computed(() => this.auth.currentUser());
  readonly navItems = computed(() => {
    const user = this.currentUser();
    if (!user) {
      return CANDIDATE_NAV.filter((item) => item.route === '/candidate/jobs');
    }

    return CANDIDATE_NAV;
  });
  readonly accountLabel = computed(() => {
    const user = this.currentUser();
    if (!user) {
      return 'Guest';
    }

    return user.roles.includes('Candidate') ? 'Candidate account' : `${user.roleDisplayName ?? 'Internal'} account`;
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
