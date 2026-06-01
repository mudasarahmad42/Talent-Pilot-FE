import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AuthService } from '../auth.service';
import { TalentPilotStoreService } from '../talent-pilot-store.service';
import { ConfigurationService } from './configuration.service';
import { NotificationService } from './notification.service';
import { RealtimeNotificationService } from './realtime-notification.service';

const connectionHandlers = new Map<string, (payload: unknown) => void>();
const start = vi.fn().mockResolvedValue(undefined);
const stop = vi.fn().mockResolvedValue(undefined);
const on = vi.fn((eventName: string, handler: (payload: unknown) => void) => {
  connectionHandlers.set(eventName, handler);
});

vi.mock('@microsoft/signalr', () => ({
  HubConnectionState: {
    Disconnected: 'Disconnected',
    Connecting: 'Connecting',
    Connected: 'Connected',
  },
  LogLevel: {
    Warning: 2,
  },
  HubConnectionBuilder: class {
    withUrl = vi.fn().mockReturnThis();
    withAutomaticReconnect = vi.fn().mockReturnThis();
    configureLogging = vi.fn().mockReturnThis();
    build = vi.fn(() => ({
      state: 'Disconnected',
      start,
      stop,
      on,
      onreconnecting: vi.fn(),
      onreconnected: vi.fn(),
      onclose: vi.fn(),
    }));
  },
}));

describe('RealtimeNotificationService', () => {
  const authenticated = signal(false);
  const currentUser = signal({ id: 'pmo-1' });
  const store = {
    addRealtimeNotification: vi.fn(),
  };
  const notifications = {
    info: vi.fn(),
  };

  beforeEach(() => {
    authenticated.set(false);
    currentUser.set({ id: 'pmo-1' });
    connectionHandlers.clear();
    start.mockClear();
    stop.mockClear();
    on.mockClear();
    store.addRealtimeNotification.mockClear();
    notifications.info.mockClear();

    TestBed.configureTestingModule({
      providers: [
        RealtimeNotificationService,
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: authenticated.asReadonly(),
            currentUser: currentUser.asReadonly(),
            getAccessToken: vi.fn(() => 'access-token'),
          },
        },
        {
          provide: ConfigurationService,
          useValue: { app: { apiBaseUrl: 'http://127.0.0.1:5000/api' } },
        },
        { provide: TalentPilotStoreService, useValue: store },
        { provide: NotificationService, useValue: notifications },
      ],
    });
  });

  it('connects to the notification hub and registers realtime notification handling', async () => {
    authenticated.set(true);
    const service = TestBed.inject(RealtimeNotificationService);

    await service.connect();

    expect(start).toHaveBeenCalled();
    expect(on).toHaveBeenCalledWith('NotificationReceived', expect.any(Function));
    expect(service.status()).toBe('Connected');
  });

  it('persists incoming PMO handoff notifications and shows a toast', async () => {
    authenticated.set(true);
    const service = TestBed.inject(RealtimeNotificationService);
    await service.connect();

    connectionHandlers.get('NotificationReceived')?.({
      notificationId: 'notification-1',
      title: 'New PMO Review',
      message: 'Senior React Developer is waiting for PMO review.',
      category: 'JobRequest',
      severity: 'Info',
      entityType: 'JobRequest',
      entityId: 'jr-1',
      createdAtUtc: '2026-05-31T00:00:00Z',
    });

    expect(store.addRealtimeNotification).toHaveBeenCalledWith(
      expect.objectContaining({ notificationId: 'notification-1', entityId: 'jr-1' }),
      'pmo-1',
    );
    expect(notifications.info).toHaveBeenCalledWith(
      'New PMO Review: Senior React Developer is waiting for PMO review.',
    );
  });
});
