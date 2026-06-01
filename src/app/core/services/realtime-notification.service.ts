import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr';
import { AuthService } from '../auth.service';
import { RealtimeNotification } from '../models';
import { TalentPilotStoreService } from '../talent-pilot-store.service';
import { ConfigurationService } from './configuration.service';
import { NotificationService } from './notification.service';

type RealtimeConnectionStatus = 'Disconnected' | 'Connecting' | 'Connected' | 'Reconnecting';

@Injectable({ providedIn: 'root' })
export class RealtimeNotificationService {
  private readonly auth = inject(AuthService);
  private readonly configuration = inject(ConfigurationService);
  private readonly notifications = inject(NotificationService);
  private readonly store = inject(TalentPilotStoreService);
  private readonly statusSignal = signal<RealtimeConnectionStatus>('Disconnected');
  private connection: HubConnection | null = null;
  private startPromise: Promise<void> | null = null;

  readonly status = this.statusSignal.asReadonly();
  readonly isConnected = computed(() => this.statusSignal() === 'Connected');

  constructor() {
    effect(() => {
      if (this.auth.isAuthenticated()) {
        void this.connect();
      } else {
        void this.disconnect();
      }
    });
  }

  async connect(): Promise<void> {
    if (this.connection?.state === HubConnectionState.Connected) {
      return;
    }

    if (this.startPromise) {
      return this.startPromise;
    }

    const token = this.auth.getAccessToken();
    if (!token) {
      return;
    }

    this.connection ??= this.buildConnection();
    this.statusSignal.set('Connecting');
    this.startPromise = this.connection
      .start()
      .then(() => {
        this.statusSignal.set('Connected');
      })
      .catch(() => {
        this.statusSignal.set('Disconnected');
      })
      .finally(() => {
        this.startPromise = null;
      });

    return this.startPromise;
  }

  async disconnect(): Promise<void> {
    if (!this.connection) {
      return;
    }

    await this.connection.stop();
    this.statusSignal.set('Disconnected');
  }

  private buildConnection(): HubConnection {
    const connection = new HubConnectionBuilder()
      .withUrl(this.hubUrl(), {
        accessTokenFactory: () => this.auth.getAccessToken() ?? '',
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    connection.on('NotificationReceived', (notification: RealtimeNotification) => {
      this.store.addRealtimeNotification(notification, this.auth.currentUser()?.id);
      this.notifications.info(`${notification.title}: ${notification.message}`);
    });

    connection.onreconnecting(() => this.statusSignal.set('Reconnecting'));
    connection.onreconnected(() => this.statusSignal.set('Connected'));
    connection.onclose(() => this.statusSignal.set('Disconnected'));

    return connection;
  }

  private hubUrl(): string {
    return `${this.configuration.app.apiBaseUrl.replace(/\/api\/?$/, '')}/hubs/notifications`;
  }
}
