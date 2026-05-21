import { Injectable } from '@angular/core';

export interface AppConfiguration {
  appName: string;
  companyName: string;
  apiBaseUrl: string;
  defaultRoute: string;
}

@Injectable({ providedIn: 'root' })
export class ConfigurationService {
  readonly app: AppConfiguration = {
    appName: 'Talent Pilot',
    companyName: 'TKXEL',
    apiBaseUrl: this.resolveApiBaseUrl(),
    defaultRoute: '/app/dashboard',
  };

  private resolveApiBaseUrl(): string {
    const location = globalThis.location;
    if (location?.port === '4200' && ['localhost', '127.0.0.1'].includes(location.hostname)) {
      return 'http://localhost:5058/api';
    }

    return '/api';
  }
}
