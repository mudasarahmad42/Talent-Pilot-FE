import { Injectable, effect, inject } from '@angular/core';
import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr';
import { AUTH_ACCESS_TOKEN_KEY, AuthService } from '../auth.service';
import { CurrentUser, Notification } from '../models';
import { TalentPilotStoreService } from '../talent-pilot-store.service';
import { ConfigurationService } from './configuration.service';
import { NotificationService } from './notification.service';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class RealtimeNotificationService {
  private readonly auth = inject(AuthService);
  private readonly configuration = inject(ConfigurationService);
  private readonly notificationService = inject(NotificationService);
  private readonly storage = inject(StorageService);
  private readonly store = inject(TalentPilotStoreService);

  private connection: HubConnection | null = null;
  private connectionUserId: string | null = null;
  private desiredUserId: string | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const user = this.auth.currentUser();
      queueMicrotask(() => void this.syncConnection(user));
    });
  }

  private async syncConnection(user: CurrentUser | null): Promise<void> {
    const userId = user && this.shouldConnect(user) ? user.id : null;
    this.desiredUserId = userId;
    this.clearRetryTimer();

    if (!userId) {
      await this.stopConnection();
      return;
    }

    if (this.isConnectionActiveForUser(userId)) {
      return;
    }

    await this.stopConnection();
    await this.startConnection(userId);
  }

  private async startConnection(userId: string): Promise<void> {
    if (this.desiredUserId !== userId || this.isConnectionActiveForUser(userId)) {
      return;
    }

    const connection = new HubConnectionBuilder()
      .withUrl(this.notificationHubUrl(), {
        accessTokenFactory: () => this.storage.getString(AUTH_ACCESS_TOKEN_KEY) ?? '',
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    connection.on('NotificationReceived', (payload: unknown) => this.handleNotificationReceived(payload));
    connection.onreconnected(() => void this.store.refreshNotifications());
    connection.onclose(() => {
      if (this.connection === connection) {
        this.connection = null;
        this.connectionUserId = null;
      }

      if (this.desiredUserId === userId) {
        this.scheduleReconnect(userId);
      }
    });

    this.connection = connection;
    this.connectionUserId = userId;

    try {
      await connection.start();
    } catch {
      if (this.connection === connection) {
        this.connection = null;
        this.connectionUserId = null;
      }

      if (this.desiredUserId === userId) {
        this.scheduleReconnect(userId);
      }
    }
  }

  private async stopConnection(): Promise<void> {
    const connection = this.connection;
    this.connection = null;
    this.connectionUserId = null;

    if (!connection || connection.state === HubConnectionState.Disconnected) {
      return;
    }

    try {
      await connection.stop();
    } catch {
      // The connection is already being discarded, so a stop failure should not interrupt navigation or logout.
    }
  }

  private handleNotificationReceived(payload: unknown): void {
    const notification = toNotification(payload);
    const currentUser = this.auth.currentUser();

    if (!notification || !currentUser || notification.recipientUserId !== currentUser.id) {
      return;
    }

    if (this.store.upsertNotification(notification)) {
      this.notificationService.showOperationalNotification(notification);
    }
  }

  private isConnectionActiveForUser(userId: string): boolean {
    return (
      this.connectionUserId === userId &&
      this.connection !== null &&
      this.connection.state !== HubConnectionState.Disconnected
    );
  }

  private notificationHubUrl(): string {
    const apiBaseUrl = this.configuration.app.apiBaseUrl.replace(/\/+$/, '');
    const appBaseUrl = apiBaseUrl.replace(/\/api$/i, '');
    return `${appBaseUrl}/hubs/notifications`;
  }

  private scheduleReconnect(userId: string): void {
    if (this.retryTimer !== null || this.desiredUserId !== userId) {
      return;
    }

    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      if (this.desiredUserId === userId) {
        void this.startConnection(userId);
      }
    }, 5000);
  }

  private clearRetryTimer(): void {
    if (this.retryTimer === null) {
      return;
    }

    clearTimeout(this.retryTimer);
    this.retryTimer = null;
  }

  private shouldConnect(user: CurrentUser): boolean {
    return user.roles.some((role) => role !== 'Candidate');
  }
}

function toNotification(payload: unknown): Notification | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const candidate = payload as Partial<Notification>;
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.recipientUserId !== 'string' ||
    typeof candidate.title !== 'string' ||
    typeof candidate.message !== 'string' ||
    typeof candidate.entityType !== 'string' ||
    typeof candidate.entityId !== 'string' ||
    typeof candidate.createdAt !== 'string'
  ) {
    return null;
  }

  return {
    id: candidate.id,
    recipientUserId: candidate.recipientUserId,
    title: candidate.title,
    message: candidate.message,
    entityType: candidate.entityType,
    entityId: candidate.entityId,
    readAt: typeof candidate.readAt === 'string' ? candidate.readAt : undefined,
    createdAt: candidate.createdAt,
  };
}
