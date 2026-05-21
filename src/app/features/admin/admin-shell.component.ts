import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ADMIN_NAV_GROUPS } from './admin-center.data';

@Component({
  selector: 'app-admin-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="admin-shell">
      <header class="topbar">
        <a class="brand" routerLink="/admin-center/tenant-profile">
          <span class="brand-mark">TP</span>
          <strong>Talent Pilot</strong>
        </a>

        <nav class="top-links" aria-label="Global">
          <a routerLink="/app/dashboard">Dashboard</a>
          <a routerLink="/app/job-requests">Job Requests</a>
          <a routerLink="/app/candidates">Candidates</a>
          <a routerLink="/admin-center/tenant-profile" class="active">Admin Center</a>
        </nav>

        <div class="user-menu">
          <button type="button" class="topbar-icon-button" aria-label="Notifications">
            <span class="material-symbols-outlined" aria-hidden="true">notifications</span>
          </button>
          @if (currentUser(); as user) {
            <button type="button" class="avatar-button" [attr.aria-label]="'Sign out ' + user.name" (click)="auth.logout()">
              <span class="avatar small">{{ initials(user.name) }}</span>
            </button>
          }
        </div>
      </header>

      <div class="workspace admin-workspace">
        <aside class="sidebar admin-sidebar" aria-label="Admin Center navigation">
          @for (group of navGroups; track group.title) {
            <p class="sidebar-title">{{ group.title }}</p>
            @for (item of group.items; track item.id) {
              <a
                [routerLink]="['/admin-center', item.id]"
                routerLinkActive="active"
                [routerLinkActiveOptions]="{ exact: true }"
              >
                <span class="material-symbols-outlined" aria-hidden="true">{{ item.icon }}</span>
                {{ item.label }}
              </a>
            }
          }
        </aside>

        <section class="content-shell">
          <router-outlet />
        </section>
      </div>
    </div>
  `,
})
export class AdminShellComponent {
  readonly auth = inject(AuthService);
  readonly navGroups = ADMIN_NAV_GROUPS;
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
