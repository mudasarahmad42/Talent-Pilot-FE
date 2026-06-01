import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { NotificationBellComponent } from '../../core/components/notification-bell.component';
import { ADMIN_NAV_GROUPS } from './admin-center.data';

@Component({
  selector: 'app-admin-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NotificationBellComponent],
  templateUrl: './admin-shell.component.html',
  styleUrl: './admin-shell.component.scss',
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
