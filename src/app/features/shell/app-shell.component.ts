import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { AiHealthWarningComponent } from '../../core/components/ai-health-warning.component';
import { NotificationBellComponent } from '../../core/components/notification-bell.component';
import { TalentPilotRole } from '../../core/models';
import { RealtimeNotificationService } from '../../core/services/realtime-notification.service';

interface NavItem {
  label: string;
  route: string;
  icon: string;
  roles?: TalentPilotRole[];
  disabled?: boolean;
  adminSection?: AdminNavSection;
}

type AdminNavSection = 'adminTasks' | 'operationalAccess';

interface NavGroup {
  id: AdminNavSection;
  label: string;
  items: NavItem[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', route: '/app/dashboard', icon: 'dashboard', adminSection: 'adminTasks' },
  { label: 'My Work', route: '/app/my-work', icon: 'inbox', roles: ['Presales', 'PMO', 'HiringManager', 'HOD', 'Interviewer', 'TenantAdmin'], adminSection: 'operationalAccess' },
  { label: 'Job Requests', route: '/app/job-requests', icon: 'assignment', roles: ['Presales', 'PMO', 'HiringManager', 'HOD', 'Interviewer', 'TenantAdmin'], adminSection: 'operationalAccess' },
  { label: 'PMO Queue', route: '/app/pmo/queue', icon: 'groups', roles: ['PMO', 'TenantAdmin'], adminSection: 'operationalAccess' },
  { label: 'Recruitment Queue', route: '/app/recruitment/queue', icon: 'queue', roles: ['Recruiter', 'TenantAdmin'], adminSection: 'operationalAccess' },
  { label: 'Candidate Rediscovery', route: '/app/recruitment/talent-rediscovery', icon: 'person_search', roles: ['Recruiter', 'TenantAdmin'], adminSection: 'operationalAccess' },
  { label: 'Job Publishing', route: '/app/job-publishing', icon: 'campaign', roles: ['Recruiter', 'TenantAdmin'], adminSection: 'operationalAccess' },
  { label: 'Candidates', route: '/app/candidates', icon: 'badge', roles: ['TenantAdmin'], adminSection: 'operationalAccess' },
  { label: 'Candidate Pipeline', route: '/app/candidate-pipeline', icon: 'account_tree', roles: ['TenantAdmin'], adminSection: 'operationalAccess' },
  { label: 'Interview Scheduling', route: '/app/interview-scheduling', icon: 'event', roles: ['TenantAdmin'], adminSection: 'operationalAccess' },
  { label: 'Interview Feedback', route: '/app/interview-feedback', icon: 'rate_review', roles: ['Recruiter', 'HOD', 'Interviewer', 'TenantAdmin'], adminSection: 'operationalAccess' },
  { label: 'Hiring Manager Review', route: '/app/hiring-manager/reviews', icon: 'approval_delegation', roles: ['HiringManager', 'TenantAdmin'], adminSection: 'operationalAccess' },
  { label: 'Offer Outcome', route: '/app/offer-onboarding', icon: 'handshake', roles: ['HiringManager', 'TenantAdmin'], adminSection: 'operationalAccess' },
  { label: 'Reports', route: '/app/reports', icon: 'analytics', roles: ['TenantAdmin'], adminSection: 'adminTasks' },
];

const ADMIN_NAV_GROUPS: ReadonlyArray<{ id: AdminNavSection; label: string }> = [
  { id: 'adminTasks', label: 'Admin Tasks' },
  { id: 'operationalAccess', label: 'Operational Access' },
];

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, AiHealthWarningComponent, NotificationBellComponent],
  template: `
    <div class="app-shell stitch-app-shell">
      <header class="topbar">
        <a class="brand app-brand" routerLink="/app/dashboard" aria-label="Talent Pilot dashboard">
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

        <nav class="top-links" aria-label="Global">
          @if (!isRecruiterOnly()) {
            <a routerLink="/app/dashboard" [class.active]="isActive('/app/dashboard', true)">Dashboard</a>
            <a routerLink="/app/job-requests" [class.active]="isJobRequestsActive()">{{ jobRequestsLabel() }}</a>
            <a routerLink="/app/candidates" [class.active]="isActive('/app/candidates')">Candidates</a>
            @if (auth.isAdmin()) {
              <a routerLink="/admin-center" [class.active]="isActive('/admin-center')">Admin Center</a>
            }
          }
        </nav>

        <div class="user-menu">
          @if (currentUser(); as user) {
            <app-ai-health-warning />
            <app-notification-bell />
            <button type="button" class="topbar-icon-button" aria-label="Settings">
              <span class="material-symbols-outlined" aria-hidden="true">settings</span>
            </button>
            <button type="button" class="avatar-button" [attr.aria-label]="'Sign out ' + user.name" (click)="auth.logout()">
              <span class="avatar small">{{ initials(user.name) }}</span>
            </button>
          }
        </div>
      </header>

      <div class="workspace">
        <aside class="sidebar stitch-app-sidebar" aria-label="Talent Pilot App navigation">
          <div class="sidebar-product">
            <span class="brand-mark">TP</span>
            <span>
              <strong>Recruitment Ops</strong>
              <small>Enterprise Admin</small>
            </span>
          </div>

          @if (isAdminSidebar()) {
            @for (group of visibleNavGroups(); track group.id) {
              <section class="sidebar-nav-group" [attr.aria-label]="group.label">
                <p class="sidebar-nav-group-title">{{ group.label }}</p>
                @for (item of group.items; track item.label) {
                  <a
                    [routerLink]="item.route"
                    [class.active]="isNavItemActive(item)"
                  >
                    <span class="material-symbols-outlined" aria-hidden="true">{{ item.icon }}</span>
                    {{ navItemLabel(item) }}
                  </a>
                }
              </section>
            }
          } @else {
            @for (item of visibleNavItems(); track item.label) {
              <a
                [routerLink]="item.route"
                [class.active]="isNavItemActive(item)"
              >
                <span class="material-symbols-outlined" aria-hidden="true">{{ item.icon }}</span>
                {{ navItemLabel(item) }}
              </a>
            }
          }

          <div class="sidebar-footer">
            <button type="button">
              <span class="material-symbols-outlined" aria-hidden="true">help</span>
              Support
            </button>
            <button type="button" (click)="auth.logout()">
              <span class="material-symbols-outlined" aria-hidden="true">logout</span>
              Log out
            </button>
          </div>
        </aside>

        <section class="content-shell">
          <router-outlet />
        </section>
      </div>
    </div>
  `,
})
export class AppShellComponent {
  readonly auth = inject(AuthService);
  private readonly realtimeNotifications = inject(RealtimeNotificationService);
  private readonly router = inject(Router);

  readonly currentUser = this.auth.currentUser;
  readonly visibleNavItems = computed(() =>
    NAV_ITEMS.filter((item) => !item.roles || this.auth.hasAnyRole(item.roles)),
  );
  readonly visibleNavGroups = computed<NavGroup[]>(() =>
    ADMIN_NAV_GROUPS.map((group) => ({
      ...group,
      items: this.visibleNavItems().filter((item) => (item.adminSection ?? 'operationalAccess') === group.id),
    })).filter((group) => group.items.length > 0),
  );
  initials(name: string): string {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  navItemLabel(item: NavItem): string {
    return item.route === '/app/job-requests' ? this.jobRequestsLabel() : item.label;
  }

  jobRequestsLabel(): string {
    return this.isPresalesOnly() ? 'My Job Requests' : 'Job Requests';
  }

  isNavItemActive(item: NavItem): boolean {
    if (item.route === '/app/job-requests') {
      return this.isJobRequestsActive();
    }

    if (item.route === '/app/job-requests/new' || item.route === '/app/dashboard') {
      return this.isActive(item.route, true);
    }

    return this.isActive(item.route);
  }

  isJobRequestsActive(): boolean {
    const currentUrl = this.router.url.split('?')[0].split('#')[0];
    return currentUrl.startsWith('/app/job-requests') && currentUrl !== '/app/job-requests/new';
  }

  isActive(route: string, exact = false): boolean {
    const currentUrl = this.router.url.split('?')[0].split('#')[0];
    return exact ? currentUrl === route : currentUrl === route || currentUrl.startsWith(`${route}/`);
  }

  private isPresalesOnly(): boolean {
    return this.auth.hasAnyRole(['Presales']) && !this.auth.isAdmin();
  }

  isRecruiterOnly(): boolean {
    return this.auth.hasAnyRole(['Recruiter']) && !this.auth.isAdmin();
  }

  isAdminSidebar(): boolean {
    return this.auth.isAdmin();
  }
}
