import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { TenantProfileSettings, UpdateTenantProfileSettingsInput } from './models';
import { ApiService } from './services/api.service';

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

const EMPTY_TENANT_PROFILE: TenantProfileSettings = {
  tenantId: '',
  displayName: '',
  slug: '',
  domain: '',
  adminContactEmail: '',
  defaultTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  defaultCurrency: 'PKR',
  status: 'Active',
  careerDisplayName: '',
  primaryColor: '#0A66C2',
  candidateLoginRequired: true,
  candidateCvFormat: 'DOCX',
  publicJobsEnabled: true,
  inviteExpiryDays: 7,
  reapplyCooldownDays: 90,
  userCount: 0,
  roleCount: 0,
  setupComplete: false,
  configuredLlmModel: '',
  configuredEmbeddingModel: '',
  updatedAt: '',
};

@Injectable({ providedIn: 'root' })
export class AdminSettingsApiService {
  private readonly api = inject(ApiService);
  private readonly tenantProfileSignal = signal<TenantProfileSettings>(EMPTY_TENANT_PROFILE);

  readonly tenantProfile = this.tenantProfileSignal.asReadonly();

  constructor() {
    void this.getTenantProfile();
  }

  async getTenantProfile(): Promise<TenantProfileSettings> {
    const profile = await firstValueFrom(this.api.get<TenantProfileSettings>('admin/tenant-profile'));
    this.tenantProfileSignal.set(profile);
    return this.clone(profile);
  }

  async updateTenantProfile(input: UpdateTenantProfileSettingsInput): Promise<TenantProfileSettings> {
    this.validateTenantProfile(input);

    const updated = await firstValueFrom(
      this.api.put<TenantProfileSettings, UpdateTenantProfileSettingsInput>('admin/tenant-profile', input),
    );

    this.tenantProfileSignal.set(updated);
    return this.clone(updated);
  }

  async resetTenantProfileToSaved(): Promise<TenantProfileSettings> {
    return this.getTenantProfile();
  }

  private validateTenantProfile(input: UpdateTenantProfileSettingsInput): void {
    if (input.displayName.trim().length < 2) {
      throw new Error('Tenant display name must be at least 2 characters.');
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug)) {
      throw new Error('Tenant slug must use lowercase letters, numbers, and hyphens only.');
    }

    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(input.domain)) {
      throw new Error('Company domain must be a valid domain.');
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.adminContactEmail)) {
      throw new Error('Admin contact email must be valid.');
    }

    if (!/^#[0-9a-f]{6}$/i.test(input.primaryColor)) {
      throw new Error('Primary color must be a hex color such as #0A66C2.');
    }

    if (!['PKR', 'USD', 'EUR'].includes(input.defaultCurrency)) {
      throw new Error('Default currency must be PKR, USD, or EUR.');
    }

    if (!['Active', 'Inactive'].includes(input.status)) {
      throw new Error('Tenant status must be Active or Inactive.');
    }

    if (!isValidTimeZone(input.defaultTimezone)) {
      throw new Error('Default timezone must be a valid IANA timezone id such as Asia/Karachi.');
    }

    if (input.inviteExpiryDays < 1 || input.inviteExpiryDays > 30) {
      throw new Error('Invite expiry must be between 1 and 30 days.');
    }

    if (input.reapplyCooldownDays < 1 || input.reapplyCooldownDays > 365) {
      throw new Error('Reapply cooldown must be between 1 and 365 days.');
    }
  }

  private clone(settings: TenantProfileSettings): TenantProfileSettings {
    return JSON.parse(JSON.stringify(settings)) as TenantProfileSettings;
  }
}
