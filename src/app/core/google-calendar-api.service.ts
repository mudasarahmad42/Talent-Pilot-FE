import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './services/api.service';

export interface GoogleCalendarConnectionStatus {
  connected: boolean;
  organizerEmail: string | null;
  connectedAtUtc: string | null;
  updatedAtUtc: string | null;
}

export interface GoogleCalendarConnectResponse {
  authorizationUrl: string;
}

@Injectable({ providedIn: 'root' })
export class GoogleCalendarApiService {
  private readonly api = inject(ApiService);

  getStatus(): Promise<GoogleCalendarConnectionStatus> {
    return firstValueFrom(this.api.get<GoogleCalendarConnectionStatus>('google-calendar/status'));
  }

  getConnectUrl(): Promise<GoogleCalendarConnectResponse> {
    return firstValueFrom(this.api.get<GoogleCalendarConnectResponse>('google-calendar/connect-url'));
  }
}
