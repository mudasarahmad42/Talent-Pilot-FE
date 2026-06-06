import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { AiHealthWarningComponent } from '../../core/components/ai-health-warning.component';
import { NotificationBellComponent } from '../../core/components/notification-bell.component';
import { CurrentUser, TalentPilotRole } from '../../core/models';
import { Permission, PermissionId } from '../../core/permissions';
import { PermissionService } from '../../core/services/permission.service';
import { RealtimeNotificationService } from '../../core/services/realtime-notification.service';

interface NavItem {
  label: string;
  route: string;
  icon: string;
  roles?: TalentPilotRole[];
  requiredAnyPermissions?: readonly PermissionId[];
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
  { label: 'My Work', route: '/app/my-work', icon: 'inbox', roles: ['Presales', 'PMO', 'HiringManager', 'HOD', 'Interviewer', 'TenantAdmin'], requiredAnyPermissions: [Permission.ViewJobRequests, Permission.ClaimWorkflowTasks], adminSection: 'operationalAccess' },
  { label: 'Job Requests', route: '/app/job-requests', icon: 'assignment', roles: ['Presales', 'PMO', 'HiringManager', 'HOD', 'Interviewer', 'TenantAdmin'], requiredAnyPermissions: [Permission.ViewJobRequests, Permission.CreateJobRequests], adminSection: 'operationalAccess' },
  { label: 'PMO Queue', route: '/app/pmo/queue', icon: 'groups', roles: ['PMO', 'TenantAdmin'], requiredAnyPermissions: [Permission.ClaimWorkflowTasks], adminSection: 'operationalAccess' },
  { label: 'Recruitment Queue', route: '/app/recruitment/queue', icon: 'queue', roles: ['Recruiter', 'TenantAdmin'], requiredAnyPermissions: [Permission.ManageCandidates], adminSection: 'operationalAccess' },
  { label: 'Candidate Rediscovery', route: '/app/recruitment/talent-rediscovery', icon: 'person_search', roles: ['Recruiter', 'TenantAdmin'], requiredAnyPermissions: [Permission.ManageCandidates], adminSection: 'operationalAccess' },
  { label: 'Job Publishing', route: '/app/job-publishing', icon: 'campaign', roles: ['Recruiter', 'TenantAdmin'], requiredAnyPermissions: [Permission.ManageCandidates], adminSection: 'operationalAccess' },
  { label: 'Candidates', route: '/app/candidates', icon: 'badge', roles: ['TenantAdmin'], requiredAnyPermissions: [Permission.ManageCandidates], adminSection: 'operationalAccess' },
  { label: 'Candidate Pipeline', route: '/app/candidate-pipeline', icon: 'account_tree', roles: ['TenantAdmin'], requiredAnyPermissions: [Permission.ManageCandidates], adminSection: 'operationalAccess' },
  { label: 'Interview Scheduling', route: '/app/interview-scheduling', icon: 'event', roles: ['TenantAdmin'], requiredAnyPermissions: [Permission.ManageInterviews], adminSection: 'operationalAccess' },
  { label: 'Interview Feedback', route: '/app/interview-feedback', icon: 'rate_review', roles: ['Recruiter', 'HOD', 'Interviewer', 'TenantAdmin'], requiredAnyPermissions: [Permission.ManageInterviews, Permission.ManageCandidates, Permission.ManageHiringDecisions], adminSection: 'operationalAccess' },
  { label: 'Hiring Manager Review', route: '/app/hiring-manager/reviews', icon: 'approval_delegation', roles: ['HiringManager', 'TenantAdmin'], requiredAnyPermissions: [Permission.ManageHiringDecisions], adminSection: 'operationalAccess' },
  { label: 'Offer Outcome', route: '/app/offer-onboarding', icon: 'handshake', roles: ['HiringManager', 'TenantAdmin'], requiredAnyPermissions: [Permission.ManageHiringDecisions], adminSection: 'operationalAccess' },
  { label: 'Reports', route: '/app/reports', icon: 'analytics', roles: ['TenantAdmin'], requiredAnyPermissions: [Permission.ManageAdminCenter], adminSection: 'adminTasks' },
  { label: 'Admin Center', route: '/admin-center/tenant-profile', icon: 'admin_panel_settings', roles: ['TenantAdmin'], adminSection: 'adminTasks' },
];

const ADMIN_NAV_GROUPS: ReadonlyArray<{ id: AdminNavSection; label: string }> = [
  { id: 'adminTasks', label: 'Admin Tasks' },
  { id: 'operationalAccess', label: 'Operational Access' },
];

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, AiHealthWarningComponent, NotificationBellComponent],
  template: `
    <div class="app-shell stitch-app-shell" [class.sidebar-collapsed]="sidebarCollapsed()">
      <header class="topbar">
        <button
          class="topbar-icon-button sidebar-mobile-toggle"
          type="button"
          aria-controls="app-sidebar"
          [attr.aria-label]="sidebarCollapsed() ? 'Expand sidebar' : 'Collapse sidebar'"
          [attr.aria-expanded]="!sidebarCollapsed()"
          (click)="toggleSidebar()"
        >
          <span class="material-symbols-outlined" aria-hidden="true">{{ sidebarCollapsed() ? 'menu' : 'menu_open' }}</span>
        </button>

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

        <div class="user-menu">
          @if (currentUser(); as user) {
            <a class="btn ghost compact docs-topbar-link" routerLink="/docs" aria-label="Open product documentation">
              <span class="material-symbols-outlined" aria-hidden="true">menu_book</span>
              Docs
            </a>
            <app-ai-health-warning />
            <app-notification-bell />
            <button type="button" class="topbar-icon-button" aria-label="Settings">
              <span class="material-symbols-outlined" aria-hidden="true">settings</span>
            </button>
            <div class="profile-menu-wrapper">
              <button
                type="button"
                class="profile-card-button"
                aria-haspopup="menu"
                [attr.aria-expanded]="profileMenuOpen()"
                [attr.aria-label]="'Open profile menu for ' + user.name"
                (click)="toggleProfileMenu()"
              >
                <span class="avatar small">{{ initials(user.name) }}</span>
                <span class="profile-card-copy">
                  <strong>{{ user.displayName || user.name }}</strong>
                  <small>{{ profileRoleLabel(user) }}</small>
                </span>
                <span class="material-symbols-outlined" aria-hidden="true">expand_more</span>
              </button>

              @if (profileMenuOpen()) {
                <div class="profile-dropdown" role="menu" aria-label="Profile actions">
                  <div class="profile-dropdown-header">
                    <span class="avatar small">{{ initials(user.name) }}</span>
                    <span>
                      <strong>{{ user.displayName || user.name }}</strong>
                      <small>{{ profileRoleLabel(user) }}</small>
                    </span>
                  </div>
                  <button type="button" class="profile-dropdown-action" role="menuitem" (click)="logout()">
                    <span class="material-symbols-outlined" aria-hidden="true">logout</span>
                    Log Out
                  </button>
                </div>
              }
            </div>
          }
        </div>
      </header>

      <div class="workspace">
        @if (!sidebarCollapsed()) {
          <button
            class="sidebar-scrim"
            type="button"
            aria-label="Close navigation"
            tabindex="-1"
            (click)="closeSidebarOnNarrowViewport()"
          ></button>
        }

        <aside id="app-sidebar" class="sidebar stitch-app-sidebar" aria-label="Talent Pilot App navigation">
          <div class="sidebar-product">
            <span class="talent-pilot-logo sidebar-brand-logo" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </span>
            @if (currentUser(); as user) {
              <span class="sidebar-product-copy">
                <strong>{{ user.tenantDisplayName || 'Talent Pilot' }}</strong>
                <small>{{ profileRoleLabel(user) }}</small>
              </span>
            }
          </div>

          <button
            class="sidebar-toggle-button"
            type="button"
            [attr.aria-label]="sidebarCollapsed() ? 'Expand sidebar' : 'Collapse sidebar'"
            [attr.aria-expanded]="!sidebarCollapsed()"
            (click)="toggleSidebar()"
          >
            <span class="material-symbols-outlined" aria-hidden="true">
              {{ sidebarCollapsed() ? 'keyboard_double_arrow_right' : 'keyboard_double_arrow_left' }}
            </span>
          </button>

          @if (isAdminSidebar()) {
            @for (group of visibleNavGroups(); track group.id) {
              <section class="sidebar-nav-group" [attr.aria-label]="group.label">
                <p class="sidebar-nav-group-title">{{ group.label }}</p>
                @for (item of group.items; track item.label) {
                  <a
                    [routerLink]="item.route"
                    [class.active]="isNavItemActive(item)"
                    [attr.title]="navItemLabel(item)"
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
                [attr.title]="navItemLabel(item)"
              >
                <span class="material-symbols-outlined" aria-hidden="true">{{ item.icon }}</span>
                {{ navItemLabel(item) }}
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
export class AppShellComponent {
  readonly auth = inject(AuthService);
  private readonly permissions = inject(PermissionService);
  private readonly realtimeNotifications = inject(RealtimeNotificationService);
  private readonly router = inject(Router);

  readonly currentUser = this.auth.currentUser;
  readonly sidebarCollapsed = signal(this.isNarrowViewport());
  readonly profileMenuOpen = signal(false);
  readonly visibleNavItems = computed(() =>
    NAV_ITEMS.filter((item) => this.canShowNavItem(item)),
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

  profileRoleLabel(user: CurrentUser): string {
    return user.roleDisplayName || user.roles.map((role) => this.roleLabel(role)).join(', ') || 'User';
  }

  toggleProfileMenu(): void {
    this.profileMenuOpen.update((open) => !open);
  }

  logout(): void {
    this.profileMenuOpen.set(false);
    this.auth.logout();
  }

  @HostListener('document:click', ['$event'])
  closeProfileMenuOnOutsideClick(event: MouseEvent): void {
    if (!this.profileMenuOpen()) {
      return;
    }

    const target = event.target;
    if (target instanceof Element && target.closest('.profile-menu-wrapper')) {
      return;
    }

    this.profileMenuOpen.set(false);
  }

  @HostListener('document:pointerdown', ['$event'])
  closeSidebarOnOutsidePointer(event: PointerEvent): void {
    if (this.sidebarCollapsed() || !this.isNarrowViewport()) {
      return;
    }

    const target = event.target;
    const targetElement = target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
    if (targetElement?.closest('#app-sidebar, .sidebar-mobile-toggle, .sidebar-scrim')) {
      return;
    }

    event.preventDefault();
    this.sidebarCollapsed.set(true);
  }

  @HostListener('document:keydown.escape')
  closeOverlayUiOnEscape(): void {
    this.profileMenuOpen.set(false);
    this.closeSidebarOnNarrowViewport();
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update((collapsed) => !collapsed);
  }

  closeSidebarOnNarrowViewport(): void {
    if (this.isNarrowViewport()) {
      this.sidebarCollapsed.set(true);
    }
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

  isAdminSidebar(): boolean {
    return this.auth.isAdmin();
  }

  private canShowNavItem(item: NavItem): boolean {
    const hasRoleAccess = !item.roles || this.auth.hasAnyRole(item.roles);
    const hasPermissionAccess = !item.requiredAnyPermissions || this.permissions.hasAny(item.requiredAnyPermissions);

    return hasRoleAccess && hasPermissionAccess;
  }

  private roleLabel(role: TalentPilotRole): string {
    const labels: Record<TalentPilotRole, string> = {
      SystemAdmin: 'System Admin',
      TenantAdmin: 'Tenant Admin',
      Presales: 'Pre-Sales',
      PMO: 'PMO',
      Recruiter: 'Recruiter',
      HiringManager: 'Hiring Manager',
      HOD: 'HOD',
      Interviewer: 'Interviewer',
      Employee: 'Employee',
      Candidate: 'Candidate',
    };

    return labels[role] ?? role;
  }

  private isNarrowViewport(): boolean {
    return typeof window !== 'undefined' && window.matchMedia('(max-width: 980px)').matches;
  }
}
