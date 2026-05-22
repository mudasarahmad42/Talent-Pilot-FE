import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { TalentPilotRole } from '../../core/models';
import { Permission } from '../../core/permissions';
import { RealtimeNotificationService } from '../../core/services/realtime-notification.service';
import { TalentPilotStoreService } from '../../core/talent-pilot-store.service';

interface NavItem {
  label: string;
  route: string;
  icon: string;
  roles?: TalentPilotRole[];
  disabled?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', route: '/app/dashboard', icon: 'dashboard' },
  { label: 'My Work', route: '/app/my-work', icon: 'inbox' },
  { label: 'Job Requests', route: '/app/job-requests', icon: 'assignment' },
  { label: 'Create Job Request', route: '/app/job-requests/new', icon: 'add_circle', roles: ['Presales', 'PMO', 'TenantAdmin'] },
  { label: 'PMO Queue', route: '/app/pmo/queue', icon: 'groups', roles: ['PMO', 'TenantAdmin'] },
  { label: 'Bench Matching', route: '/app/pmo/queue', icon: 'manage_search', roles: ['PMO', 'TenantAdmin'] },
  { label: 'Internal Referral', route: '/app/internal-resource-referral', icon: 'send', roles: ['PMO', 'TenantAdmin'] },
  { label: 'Presales Review', route: '/app/presales-resource-review', icon: 'fact_check', roles: ['Presales', 'TenantAdmin'] },
  { label: 'Recruitment Queue', route: '/app/recruitment/queue', icon: 'queue', roles: ['Recruiter', 'TenantAdmin'] },
  { label: 'Job Publishing', route: '/app/job-publishing', icon: 'campaign', roles: ['Recruiter', 'TenantAdmin'] },
  { label: 'Candidates', route: '/app/candidates', icon: 'badge', roles: ['Recruiter', 'TenantAdmin'] },
  { label: 'Candidate Pipeline', route: '/app/candidate-pipeline', icon: 'account_tree', roles: ['Recruiter', 'TenantAdmin'] },
  { label: 'Interview Scheduling', route: '/app/interview-scheduling', icon: 'event', roles: ['Recruiter', 'TenantAdmin'] },
  { label: 'Interview Feedback', route: '/app/interview-feedback', icon: 'rate_review', roles: ['Interviewer', 'Recruiter', 'TenantAdmin'] },
  { label: 'Hiring Manager Review', route: '/app/hiring-manager/reviews', icon: 'approval_delegation', roles: ['HiringManager', 'TenantAdmin'] },
  { label: 'Offer Outcome', route: '/app/offer-onboarding', icon: 'handshake', roles: ['HiringManager', 'Recruiter', 'TenantAdmin'] },
  { label: 'Reports', route: '/app/reports', icon: 'analytics', roles: ['TenantAdmin', 'Recruiter', 'PMO'] },
  { label: 'Notifications', route: '/app/notifications', icon: 'notifications' },
];

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="app-shell stitch-app-shell">
      <header class="topbar">
        <a class="brand" routerLink="/app/dashboard">
          <strong>Talent Pilot</strong>
        </a>

        <nav class="top-links" aria-label="Global">
          <a routerLink="/app/dashboard" routerLinkActive="active">Dashboard</a>
          <a routerLink="/app/job-requests" routerLinkActive="active">Job Requests</a>
          <a routerLink="/app/candidates" routerLinkActive="active">Candidates</a>
          <a routerLink="/admin-center" routerLinkActive="active">Admin Center</a>
        </nav>

        <div class="user-menu">
          @if (currentUser(); as user) {
            <label class="topbar-search">
              <input type="search" placeholder="Search..." aria-label="Search Talent Pilot" />
            </label>
            @if (canCreateJobRequests()) {
              <a class="btn primary compact topbar-create" routerLink="/app/job-requests/new">
                <span class="material-symbols-outlined" aria-hidden="true">add</span>
                Create New
              </a>
            }
            <a class="topbar-icon-button" routerLink="/app/notifications" [attr.aria-label]="unreadCount() + ' unread notifications'">
              <span class="material-symbols-outlined" aria-hidden="true">notifications</span>
              @if (unreadCount() > 0) {
                <span class="notification-dot"></span>
              }
            </a>
            <button type="button" class="topbar-icon-button" aria-label="Settings">
              <span class="material-symbols-outlined" aria-hidden="true">settings</span>
            </button>
            <span class="avatar small">{{ initials(user.name) }}</span>
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

          @for (item of visibleNavItems(); track item.label) {
            <a
              [routerLink]="item.route"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: item.route === '/app/dashboard' }"
            >
              <span class="material-symbols-outlined" aria-hidden="true">{{ item.icon }}</span>
              {{ item.label }}
            </a>
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
  styles: [
    `
      :host .stitch-app-shell .topbar {
        box-shadow: 0 1px 0 rgba(255, 255, 255, 0.06);
        padding-inline: 24px;
      }

      :host .stitch-app-shell .brand {
        min-width: 180px;
      }

      :host .stitch-app-shell .top-links a {
        padding-top: 1px;
      }

      :host .topbar-search {
        display: block;
        margin-right: 4px;
      }

      :host .topbar-search input {
        background: rgba(255, 255, 255, 0.1);
        border: 0;
        border-radius: 8px;
        color: #fff;
        font-size: 13px;
        height: 34px;
        outline: none;
        padding: 0 12px;
        width: 220px;
      }

      :host .topbar-search input::placeholder {
        color: #c1c6d4;
      }

      :host .stitch-app-sidebar {
        background: #fff;
        border-right: 1px solid var(--border);
      }

      :host .sidebar-product {
        margin-bottom: 18px;
      }

      :host .stitch-app-sidebar a,
      :host .sidebar-footer button {
        border-radius: 8px;
        min-height: 38px;
        padding: 9px 12px;
      }

      :host .stitch-app-sidebar a.active {
        background: #d8e0ef;
        color: #004e99;
        font-weight: 800;
        transform: translateX(2px);
      }

      :host .stitch-app-shell .content-shell {
        padding: 24px;
      }

      @media (max-width: 1180px) {
        :host .topbar-search {
          display: none;
        }
      }
    `,
  ],
})
export class AppShellComponent {
  readonly auth = inject(AuthService);
  private readonly realtimeNotifications = inject(RealtimeNotificationService);
  private readonly store = inject(TalentPilotStoreService);

  readonly currentUser = this.auth.currentUser;
  readonly visibleNavItems = computed(() =>
    NAV_ITEMS.filter((item) => !item.roles || this.auth.hasAnyRole(item.roles)),
  );
  readonly unreadCount = computed(() => {
    const user = this.currentUser();
    return user ? this.store.unreadCountForUser(user.id) : 0;
  });
  readonly canCreateJobRequests = computed(() => this.auth.hasPermission(Permission.CreateJobRequests));

  initials(name: string): string {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }
}
