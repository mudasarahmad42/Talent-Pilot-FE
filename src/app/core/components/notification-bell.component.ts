import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';
import { Notification } from '../models';
import { NotificationDateGroup } from '../models/notification-view.models';
import { TalentPilotStoreService } from '../talent-pilot-store.service';

@Component({
  selector: 'app-notification-bell',
  imports: [RouterLink],
  templateUrl: './notification-bell.component.html',
  styleUrl: './notification-bell.component.scss',
})
export class NotificationBellComponent {
  private readonly auth = inject(AuthService);
  private readonly store = inject(TalentPilotStoreService);

  readonly drawerOpen = signal(false);
  readonly currentUser = this.auth.currentUser;
  readonly notifications = computed(() => {
    const user = this.currentUser();
    return user ? this.store.notificationsForUser(user.id) : [];
  });
  readonly unreadCount = computed(() => this.notifications().filter((notification) => !notification.readAt).length);
  readonly unreadCountLabel = computed(() => (this.unreadCount() > 99 ? '99+' : String(this.unreadCount())));
  readonly notificationGroups = computed(() => this.groupByDate(this.notifications()));

  toggleDrawer(): void {
    this.drawerOpen.update((open) => !open);
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
  }

  async markRead(notificationId: string): Promise<void> {
    await this.store.markNotificationRead(notificationId);
  }

  async markAllRead(): Promise<void> {
    const user = this.currentUser();
    if (!user) {
      return;
    }

    await this.store.markAllNotificationsRead(user.id);
  }

  formatTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  }

  private groupByDate(notifications: Notification[]): NotificationDateGroup[] {
    const groups = new Map<string, Notification[]>();
    for (const notification of notifications) {
      const key = this.dateKey(notification.createdAt);
      groups.set(key, [...(groups.get(key) ?? []), notification]);
    }

    return Array.from(groups.entries()).map(([key, items]) => ({
      key,
      label: this.dateLabel(key),
      items,
    }));
  }

  private dateKey(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'unknown';
    }

    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  }

  private dateLabel(key: string): string {
    if (key === 'unknown') {
      return 'Earlier';
    }

    const [year, month, day] = key.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (this.sameDate(date, today)) {
      return 'Today';
    }

    if (this.sameDate(date, yesterday)) {
      return 'Yesterday';
    }

    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric',
    }).format(date);
  }

  private sameDate(first: Date, second: Date): boolean {
    return first.getFullYear() === second.getFullYear() &&
      first.getMonth() === second.getMonth() &&
      first.getDate() === second.getDate();
  }
}
