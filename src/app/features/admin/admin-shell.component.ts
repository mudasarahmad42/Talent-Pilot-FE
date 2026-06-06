import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { AiHealthWarningComponent } from '../../core/components/ai-health-warning.component';
import { NotificationBellComponent } from '../../core/components/notification-bell.component';
import { ADMIN_NAV_GROUPS } from './admin-center.data';

interface AdminWorkspaceLink {
  label: string;
  route: string;
  icon: string;
}

const ADMIN_WORKSPACE_LINKS: AdminWorkspaceLink[] = [
  { label: 'Dashboard', route: '/app/dashboard', icon: 'dashboard' },
  { label: 'Job Requests', route: '/app/job-requests', icon: 'assignment' },
  { label: 'Candidates', route: '/app/candidates', icon: 'badge' },
];

@Component({
  selector: 'app-admin-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AiHealthWarningComponent, NotificationBellComponent],
  templateUrl: './admin-shell.component.html',
  styleUrl: './admin-shell.component.scss',
})
export class AdminShellComponent {
  readonly auth = inject(AuthService);
  readonly workspaceLinks = ADMIN_WORKSPACE_LINKS;
  readonly navGroups = ADMIN_NAV_GROUPS;
  readonly currentUser = computed(() => this.auth.currentUser());
  readonly mobileSidebarOpen = signal(false);

  initials(name: string): string {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  toggleMobileSidebar(): void {
    this.mobileSidebarOpen.update((open) => !open);
  }

  closeMobileSidebar(): void {
    this.mobileSidebarOpen.set(false);
  }

  closeSidebarOnNarrowViewport(): void {
    if (this.isNarrowViewport()) {
      this.closeMobileSidebar();
    }
  }

  @HostListener('document:pointerdown', ['$event'])
  closeSidebarOnOutsidePointer(event: PointerEvent): void {
    if (!this.mobileSidebarOpen() || !this.isNarrowViewport()) {
      return;
    }

    const target = event.target;
    const targetElement = target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
    if (targetElement?.closest('#admin-sidebar, .admin-sidebar-toggle, .admin-sidebar-scrim')) {
      return;
    }

    this.closeMobileSidebar();
  }

  @HostListener('document:keydown.escape')
  closeSidebarOnEscape(): void {
    this.closeMobileSidebar();
  }

  @HostListener('window:resize')
  closeSidebarOnDesktopResize(): void {
    if (!this.isNarrowViewport()) {
      this.closeMobileSidebar();
    }
  }

  private isNarrowViewport(): boolean {
    return typeof window !== 'undefined' && window.matchMedia('(max-width: 980px)').matches;
  }
}
