import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { TalentPilotStoreService } from '../../core/talent-pilot-store.service';

@Component({
  selector: 'app-notifications',
  imports: [RouterLink],
  template: `
    <main class="page ops-page">
      <header class="ops-page-header">
        <div>
          <p class="eyebrow">Notifications</p>
          <h1>Realtime handoffs</h1>
          <p>SignalR delivers realtime notifications to online users; email is the separate fallback channel.</p>
        </div>
        <button type="button" class="btn secondary" (click)="markAllRead()">Mark all read</button>
      </header>

      <section class="ops-panel">
        @if (store.error(); as error) {
          <div class="empty-state">{{ error }}</div>
        }
        @if (store.loading()) {
          <div class="empty-state">Loading notifications from backend...</div>
        } @else if (notifications().length > 0) {
          <div class="stack-list">
            @for (notification of notifications(); track notification.id) {
              <article class="notification-row" [class.unread]="!notification.readAt">
                <div>
                  <strong>{{ notification.title }}</strong>
                  <p>{{ notification.message }}</p>
                  @if (notification.entityType === 'JobRequest') {
                    <a [routerLink]="['/app/job-requests', notification.entityId]">Open request</a>
                  }
                </div>
                @if (!notification.readAt) {
                  <button type="button" class="btn compact secondary" (click)="markRead(notification.id)">Mark read</button>
                } @else {
                  <span class="status-badge">Read</span>
                }
              </article>
            }
          </div>
        } @else {
          <div class="empty-state">No notifications.</div>
        }
      </section>
    </main>
  `,
})
export class NotificationsComponent {
  private readonly auth = inject(AuthService);
  readonly store = inject(TalentPilotStoreService);

  readonly currentUser = this.auth.currentUser;
  readonly notifications = computed(() => {
    const user = this.currentUser();
    return user ? this.store.notificationsForUser(user.id) : [];
  });
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
}
