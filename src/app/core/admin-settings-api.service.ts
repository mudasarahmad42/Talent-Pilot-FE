import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { TenantProfileSettings, UpdateTenantProfileSettingsInput } from './models';
import { ApiService } from './services/api.service';

const SUPPORTED_LOGO_CONTENT_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']);
const MAX_LOGO_BYTES = 512 * 1024;

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
  companyAddress: null,
  companyCity: null,
  companyCountry: null,
  officialEmail: null,
  officialPhone: null,
  primaryColor: '#0A66C2',
  candidateLoginRequired: true,
  candidateCvFormat: 'DOCX',
  publicJobsEnabled: true,
  inviteExpiryDays: 7,
  reapplyCooldownDays: 90,
  notificationEmailProvider: 'Resend',
  adminCenterAccessMode: 'FullAccess',
  userCount: 0,
  roleCount: 0,
  setupComplete: false,
  configuredLlmModel: '',
  configuredEmbeddingModel: '',
  logoFileName: null,
  logoContentType: null,
  logoContentBase64: null,
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

    if (input.officialEmail?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.officialEmail.trim())) {
      throw new Error('Official email must be valid.');
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

    if (!['Resend', 'MicrosoftGraph'].includes(input.notificationEmailProvider)) {
      throw new Error('Email provider must be Resend or Microsoft Graph.');
    }

    if (!['FullAccess', 'ReadOnly'].includes(input.adminCenterAccessMode)) {
      throw new Error('Admin Center access mode must be Full Access or View Only.');
    }

    if (!input.logoContentBase64) {
      return;
    }

    if (!input.logoFileName?.trim()) {
      throw new Error('Logo file name is required when a logo is uploaded.');
    }

    if (input.logoFileName.trim().length > 260) {
      throw new Error('Logo file name cannot exceed 260 characters.');
    }

    if (!input.logoContentType || !SUPPORTED_LOGO_CONTENT_TYPES.has(input.logoContentType)) {
      throw new Error('Logo must be a PNG, JPEG, WebP, or SVG image.');
    }

    const normalizedLogo = input.logoContentBase64.replace(/\s/g, '');
    const padding = normalizedLogo.endsWith('==') ? 2 : normalizedLogo.endsWith('=') ? 1 : 0;
    const logoBytes = Math.floor((normalizedLogo.length * 3) / 4) - padding;
    if (logoBytes > MAX_LOGO_BYTES) {
      throw new Error('Logo image cannot exceed 512 KB.');
    }
  }

  private clone(settings: TenantProfileSettings): TenantProfileSettings {
    return JSON.parse(JSON.stringify(settings)) as TenantProfileSettings;
  }
}
