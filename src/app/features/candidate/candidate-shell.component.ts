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
        <a class="brand" routerLink="/candidate/jobs">
          <strong>Talent Pilot</strong>
        </a>

        <nav class="top-links candidate-links" aria-label="Candidate navigation">
          @for (item of navItems; track item.route) {
            <a [routerLink]="item.route" routerLinkActive="active">{{ item.label }}</a>
          }
        </nav>

        <div class="user-menu">
          @if (currentUser(); as user) {
            <button type="button" class="candidate-icon-button" aria-label="Notifications">
              <span class="material-symbols-outlined" aria-hidden="true">notifications</span>
            </button>
            <button type="button" class="candidate-icon-button" aria-label="Settings">
              <span class="material-symbols-outlined" aria-hidden="true">settings</span>
            </button>
            <span class="avatar small">{{ initials(user.name) }}</span>
            <button type="button" class="btn secondary compact candidate-signout" (click)="auth.logout()">Sign out</button>
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
  readonly navItems = CANDIDATE_NAV;
  readonly currentUser = computed(() => this.auth.currentUser());

  initials(name: string): string {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }
}
