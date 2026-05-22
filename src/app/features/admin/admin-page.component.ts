import { Component, computed, effect, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, startWith } from 'rxjs';
import { AdminPage, getAdminPage } from './admin-center.data';
import { AdminSettingsApiService } from '../../core/admin-settings-api.service';
import {
  AdminAiAgentDefinition,
  AdminCenterApiService,
  AdminGroupListItem,
  AdminIntegrationStatusItem,
  AdminNotificationEventListItem,
  AdminRoleListItem,
  NotificationTemplateSummary,
  PermissionCatalogItem,
  RoleUserAssignmentPreviewItem,
} from '../../core/admin-center-api.service';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CandidateCvFormat, TenantCurrency, TenantProfileSettings, TenantStatus } from '../../core/models';
import { Permission } from '../../core/permissions';
import { NotificationService } from '../../core/services/notification.service';
import { PermissionService } from '../../core/services/permission.service';
import { TalentPilotStoreService } from '../../core/talent-pilot-store.service';

type TenantProfileTab = 'profile' | 'branding' | 'career-page' | 'security';
type WorkflowTab = 'policies' | 'routing-rules' | 'transition-triggers';
type AiSettingsTab = 'runtime' | 'agents';
type PermissionResolutionMode = 'merge' | 'highest-priority';
type UserRowAction = 'edit-access' | 'resend-invite' | 'deactivate-user' | 'audit-history';
type RoleRowAction = 'edit-role' | 'bulk-assign-users' | 'view-permissions' | 'audit-history';

interface TimezoneOption {
  value: string;
  label: string;
  offsetMinutes: number;
}

interface AiAgentDefinition {
  name: string;
  responsibility: string;
  input: string;
  output: string;
  boundary: string;
}

interface UserActionContext {
  action: UserRowAction;
  userId: string;
  displayName: string;
  email: string;
  roleName: string;
  groupNames: string[];
  accountStatus: string;
  lastActive: string;
}

interface RoleActionContext {
  action: RoleRowAction;
  roleId: string;
  name: string;
  type: string;
  scope: string;
  userCount: string;
  permissionSummary: string;
  status: string;
  protectedRole: boolean;
  isBulkAssignable: boolean;
}

interface RolePermissionOption {
  id: string;
  label: string;
  group: string;
  description: string;
}

interface NotificationTemplateDefinition {
  templateId: string;
  eventCode: string;
  name: string;
  subject: string;
  body: string;
  recipient: string;
  variables: string[];
  updatedAtUtc: string;
}

interface AuditEventRow {
  occurredAtUtc: string;
  actor: string;
  event: string;
}

interface BulkAssignmentPreviewUser {
  userId: string;
  name: string;
  email: string;
  department: string;
  currentRole: string;
}

const FALLBACK_TIMEZONES = [
  'UTC',
  'Asia/Karachi',
  'Asia/Dubai',
  'Europe/London',
  'America/New_York',
  'America/Los_Angeles',
];

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function timezoneValidator(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '');
  return isValidTimeZone(value) ? null : { timezone: true };
}

function getTimeZoneOffsetMinutes(timeZone: string, date = new Date()): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const parts = formatter.formatToParts(date).reduce<Record<string, string>>((result, part) => {
    result[part.type] = part.value;
    return result;
  }, {});
  const asUtc = Date.UTC(
    Number(parts['year'] ?? 0),
    Number(parts['month'] ?? 1) - 1,
    Number(parts['day'] ?? 1),
    Number(parts['hour'] ?? 0),
    Number(parts['minute'] ?? 0),
    Number(parts['second'] ?? 0),
  );

  return Math.round((asUtc - date.getTime()) / 60000);
}

function formatTimeZoneOffset(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absoluteMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absoluteMinutes / 60)
    .toString()
    .padStart(2, '0');
  const minutes = (absoluteMinutes % 60).toString().padStart(2, '0');

  return `GMT${sign}${hours}:${minutes}`;
}

function buildTimezoneOptions(currentTimezone: string): TimezoneOption[] {
  const intlWithSupportedValues = Intl as typeof Intl & {
    supportedValuesOf?: (key: 'timeZone') => string[];
  };
  const sourceTimezones = intlWithSupportedValues.supportedValuesOf?.('timeZone') ?? FALLBACK_TIMEZONES;

  return Array.from(new Set(['UTC', ...sourceTimezones, currentTimezone]))
    .filter(isValidTimeZone)
    .map((timeZone) => {
      const offsetMinutes = getTimeZoneOffsetMinutes(timeZone);
      return {
        value: timeZone,
        label: `${timeZone} (${formatTimeZoneOffset(offsetMinutes)})`,
        offsetMinutes,
      };
    })
    .sort((first, second) => first.offsetMinutes - second.offsetMinutes || first.value.localeCompare(second.value));
}

@Component({
  selector: 'app-admin-page',
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatCardModule, MatSlideToggleModule, MatTooltipModule],
  template: `
    <main
      class="page admin-page"
      [class.roles-permissions-page]="isRolesPage()"
      [class.groups-page]="isGroupsPage()"
      [class.departments-page]="isDepartmentsPage()"
      [class.skills-page]="isSkillsPage()"
      [class.hiring-pipeline-page]="isHiringPipelinePage()"
      [class.workflows-page]="isWorkflowsPage()"
      [class.notifications-page]="isNotificationsPage()"
      [class.ai-settings-page]="isAiSettingsPage()"
      [class.integrations-page]="isIntegrationsPage()"
      [class.audit-logs-page]="isAuditLogsPage()"
    >
      @if (isTenantProfile()) {
        <form [formGroup]="tenantProfileForm" (ngSubmit)="saveTenantProfile()">
          <header class="stitch-page-header">
            <div>
              <h1>Tenant Profile</h1>
              <p>Manage company details and brand identity</p>
            </div>
            <div class="header-actions">
              <button
                mat-stroked-button
                class="stitch-secondary-button"
                type="button"
                (click)="resetTenantProfileForm()"
                [disabled]="saving() || !canManageTenantProfile()"
                [matTooltip]="permissionTooltip(canManageTenantProfile())"
              >
                Reset
              </button>
              <button
                mat-flat-button
                class="stitch-primary-button"
                type="submit"
                [disabled]="saving() || tenantProfileForm.invalid || !canManageTenantProfile()"
                [matTooltip]="permissionTooltip(canManageTenantProfile())"
              >
                {{ saving() ? 'Saving...' : 'Save Changes' }}
              </button>
            </div>
          </header>

          @if (formMessage()) {
            <p class="form-message" [class.error]="formMessageIsError()">{{ formMessage() }}</p>
          }

          <nav class="stitch-tabs" aria-label="Tenant profile sections">
            @for (tab of tenantTabs; track tab.id) {
              <button
                type="button"
                class="stitch-tab"
                [class.active]="activeTenantTab() === tab.id"
                [attr.aria-selected]="activeTenantTab() === tab.id"
                (click)="setActiveTenantTab(tab.id)"
              >
                {{ tab.label }}
              </button>
            }
          </nav>

          <section class="stitch-profile-layout">
            <div class="stitch-main-column">
              @switch (activeTenantTab()) {
                @case ('profile') {
                  <section class="stitch-card">
                    <div class="stitch-card-heading">
                      <span class="heading-title">
                        <span class="material-symbols-outlined" aria-hidden="true">fingerprint</span>
                        <h2>Tenant Identity</h2>
                      </span>
                      <label class="stitch-field compact status-field">
                        <span>Tenant Status</span>
                        <select
                          formControlName="status"
                          aria-label="Tenant status"
                          [class.inactive]="tenantDraft().status === 'Inactive'"
                        >
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                      </label>
                    </div>

                    <div class="stitch-form-grid">
                      <label class="stitch-field">
                        <span>Tenant Name</span>
                        <input formControlName="displayName" aria-label="Tenant name" />
                        @if (tenantProfileForm.controls.displayName.invalid && tenantProfileForm.controls.displayName.touched) {
                          <em>Tenant name is required.</em>
                        }
                      </label>

                      <label class="stitch-field">
                        <span>Tenant Slug</span>
                        <input formControlName="slug" aria-label="Tenant slug" />
                        @if (tenantProfileForm.controls.slug.invalid && tenantProfileForm.controls.slug.touched) {
                          <em>Use lowercase letters, numbers, and hyphens.</em>
                        }
                      </label>

                      <label class="stitch-field">
                        <span>Company Domain</span>
                        <input formControlName="domain" aria-label="Company domain" />
                      </label>

                      <label class="stitch-field">
                        <span>Admin Contact Email</span>
                        <input formControlName="adminContactEmail" type="email" aria-label="Admin contact email" />
                        @if (
                          tenantProfileForm.controls.adminContactEmail.invalid &&
                          tenantProfileForm.controls.adminContactEmail.touched
                        ) {
                          <em>Use a valid email address.</em>
                        }
                      </label>
                    </div>
                  </section>

                  <section class="stitch-card">
                    <div class="stitch-card-heading">
                      <span class="heading-title">
                        <span class="material-symbols-outlined" aria-hidden="true">settings</span>
                        <h2>Tenant Defaults</h2>
                      </span>
                    </div>

                    <div class="candidate-settings-grid">
                      <label class="stitch-field">
                        <span class="setting-label">
                          Default Timezone
                          <button
                            type="button"
                            class="inline-info-button"
                            matTooltip="Stored in the database as an IANA timezone id such as Asia/Karachi. Offsets are derived at runtime because daylight saving rules can change."
                            matTooltipPosition="above"
                            aria-label="How tenant timezone is stored"
                          >
                            <span class="material-symbols-outlined" aria-hidden="true">info</span>
                          </button>
                        </span>
                        <select formControlName="defaultTimezone" aria-label="Default timezone">
                          @for (timezone of timezoneOptions; track timezone.value) {
                            <option [value]="timezone.value">{{ timezone.label }}</option>
                          }
                        </select>
                        @if (tenantProfileForm.controls.defaultTimezone.invalid && tenantProfileForm.controls.defaultTimezone.touched) {
                          <em>Select a valid IANA timezone.</em>
                        }
                      </label>

                      <label class="stitch-field">
                        <span>Default Currency</span>
                        <select formControlName="defaultCurrency" aria-label="Default currency">
                          <option value="PKR">PKR (Rs)</option>
                          <option value="USD">USD ($)</option>
                          <option value="EUR">EUR</option>
                        </select>
                      </label>
                    </div>
                  </section>
                }

                @case ('branding') {
                  <section class="stitch-card">
                    <div class="stitch-card-heading">
                      <span class="heading-title">
                        <span class="material-symbols-outlined" aria-hidden="true">brush</span>
                        <h2>Branding</h2>
                      </span>
                    </div>

                    <div class="branding-form-grid">
                      <label class="logo-upload-box">
                        <span class="material-symbols-outlined" aria-hidden="true">upload</span>
                        <strong>Company Logo</strong>
                        <small>Click to upload or drop here</small>
                        <input type="file" aria-label="Company logo" accept="image/*" />
                      </label>

                      <div class="brand-fields">
                        <label class="stitch-field">
                          <span>Company Display Name</span>
                          <input formControlName="careerDisplayName" aria-label="Company display name" />
                        </label>

                        <label class="stitch-field">
                          <span>Primary Color</span>
                          <span class="color-control">
                            <input
                              class="color-picker"
                              type="color"
                              [value]="previewColor()"
                              aria-label="Primary color picker"
                              (input)="setPrimaryColor($event)"
                            />
                            <input formControlName="primaryColor" aria-label="Primary color hex value" />
                          </span>
                          @if (tenantProfileForm.controls.primaryColor.invalid && tenantProfileForm.controls.primaryColor.touched) {
                            <em>Use a hex color such as #0A66C2.</em>
                          }
                        </label>
                      </div>
                    </div>

                    <div class="visual-preview">
                      <span class="preview-label">Visual Preview</span>
                      <div class="preview-frame">
                        <div class="preview-topbar" [style.background]="previewColor()">
                          <span class="preview-logo">
                            {{ tenantLogoText() }}
                          </span>
                          <strong>{{ tenantDraft().careerDisplayName }}</strong>
                          <i></i>
                          <i></i>
                        </div>
                        <div class="preview-body">
                          <div>
                            <span></span>
                            <span></span>
                            <span></span>
                          </div>
                          <button type="button" [style.background]="previewColor()">View Open Roles</button>
                        </div>
                      </div>
                    </div>
                  </section>
                }

                @case ('career-page') {
                  <section class="stitch-card">
                    <div class="stitch-card-heading">
                      <span class="heading-title">
                        <span class="material-symbols-outlined" aria-hidden="true">web</span>
                        <h2>Career Page</h2>
                      </span>
                    </div>

                    <div class="candidate-settings-grid">
                      <div class="toggle-stack">
                        <span class="setting-label">
                          Public Jobs Enabled
                          <button
                            type="button"
                            class="inline-info-button"
                            matTooltip="When enabled, published job posts are visible on the candidate-facing careers page. When disabled, candidates can only apply through direct invite links."
                            matTooltipPosition="above"
                            aria-label="What public jobs enabled means"
                          >
                            <span class="material-symbols-outlined" aria-hidden="true">info</span>
                          </button>
                        </span>
                        <mat-slide-toggle
                          formControlName="publicJobsEnabled"
                          aria-label="Public jobs enabled"
                        ></mat-slide-toggle>
                      </div>

                      <label class="stitch-field">
                        <span>Candidate CV Format</span>
                        <span class="select-leading-icon cv-format-control">
                          <span class="material-symbols-outlined docx-format-icon" aria-hidden="true">description</span>
                          <select formControlName="candidateCvFormat" aria-label="Allowed CV format">
                            <option value="DOCX">DOCX</option>
                          </select>
                        </span>
                        <em matTooltip="PDF parsing can be added later. The current CV parser expects DOCX.">DOCX parser active.</em>
                      </label>

                      <label class="stitch-field">
                        <span>Reapply Cooldown Days</span>
                        <input formControlName="reapplyCooldownDays" type="number" min="1" max="365" />
                      </label>
                    </div>
                  </section>
                }

                @case ('security') {
                  <section class="stitch-card">
                    <div class="stitch-card-heading">
                      <span class="heading-title">
                        <span class="material-symbols-outlined" aria-hidden="true">shield</span>
                        <h2>Security</h2>
                      </span>
                    </div>

                    <div class="candidate-settings-grid">
                      <div class="toggle-stack">
                        <span>Candidate Login Required</span>
                        <mat-slide-toggle
                          formControlName="candidateLoginRequired"
                          aria-label="Candidate login required"
                        ></mat-slide-toggle>
                      </div>

                      <label class="stitch-field">
                        <span>Invite Expiry Days</span>
                        <input formControlName="inviteExpiryDays" type="number" min="1" max="30" />
                      </label>
                    </div>
                  </section>
                }
              }

            </div>

            <aside class="tenant-summary-column">
              <section class="tenant-summary-card">
                <div class="tenant-summary-header">
                  <h2>Tenant Summary</h2>
                  <span class="summary-badge">
                    <span class="material-symbols-outlined" aria-hidden="true">verified</span>
                    {{ tenantDraft().setupComplete ? 'Setup Complete' : 'Needs Setup' }}
                  </span>
                </div>

                <div class="summary-stat-grid">
                  <div>
                    <span>Status</span>
                    <strong
                      [class.success]="tenantDraft().status === 'Active'"
                      [class.inactive]="tenantDraft().status === 'Inactive'"
                    >
                      {{ tenantDraft().status }}
                    </strong>
                  </div>
                  <div>
                    <span>Users</span>
                    <strong>{{ tenantDraft().userCount }}</strong>
                  </div>
                  <div>
                    <span>Roles</span>
                    <strong>{{ tenantDraft().roleCount }}</strong>
                  </div>
                  <div>
                    <span>Career Page</span>
                    <span class="summary-status-chip" [class.inactive]="!tenantDraft().publicJobsEnabled">
                      <span class="material-symbols-outlined" aria-hidden="true">
                        {{ tenantDraft().publicJobsEnabled ? 'check_circle' : 'visibility_off' }}
                      </span>
                      {{ tenantDraft().publicJobsEnabled ? 'Published' : 'Hidden' }}
                    </span>
                  </div>
                </div>

                <div class="summary-list">
                  <span>AI Runtime</span>
                  <p><strong>Configured model</strong><em>{{ tenantDraft().configuredLlmModel }}</em></p>
                  <p><strong>Embedding model</strong><em>{{ tenantDraft().configuredEmbeddingModel }}</em></p>
                </div>

                <button mat-stroked-button type="button" class="audit-button">
                  <span class="material-symbols-outlined" aria-hidden="true">history</span>
                  View Audit Logs
                </button>
              </section>

              <section class="help-card">
                <span class="material-symbols-outlined" aria-hidden="true">contact_support</span>
                <div>
                  <strong>Need assistance?</strong>
                  <p>Contact your dedicated success manager for enterprise configuration support.</p>
                </div>
              </section>
            </aside>
          </section>

          <footer class="tenant-info-footer" role="note">
            <div>
              <span class="material-symbols-outlined" aria-hidden="true">info</span>
              <strong>Implementation notes</strong>
            </div>
            <ul>
              <li>{{ guardrailSummary() }}</li>
              <li>Tenant status is stored on the tenant record as Active or Inactive.</li>
              <li>Timezone is stored as an IANA timezone id; timestamps stay UTC and render in the client timezone.</li>
            </ul>
          </footer>
        </form>
      } @else {
        @if (isUsersPage()) {
          <header class="stitch-page-header users-page-header">
            <div>
              <h1>{{ page().title }}</h1>
              <p>{{ page().subtitle }}</p>
            </div>
            <div class="header-actions">
              <label class="users-search">
                <span class="material-symbols-outlined" aria-hidden="true">search</span>
                <input type="search" placeholder="Search users" aria-label="Search users" />
              </label>
              <button
                mat-flat-button
                type="button"
                class="stitch-primary-button"
                (click)="openAddUserDialog()"
                [disabled]="!canManageUsers()"
                [matTooltip]="permissionTooltip(canManageUsers())"
              >
                <span class="material-symbols-outlined" aria-hidden="true">add</span>
                Add Internal User
              </button>
            </div>
          </header>

          <section class="users-metrics-grid">
            @for (metric of page().metrics; track metric.label; let index = $index) {
              <article class="users-metric-card">
                <div class="users-metric-copy">
                  <span>{{ metric.label }}</span>
                  <strong>{{ metric.value }}</strong>
                  <small>{{ metric.note }}</small>
                  @if (metric.configureRoute) {
                    <a class="users-metric-action" [routerLink]="metric.configureRoute">
                      {{ metric.configureLabel ?? 'Configure' }}
                    </a>
                  }
                </div>
              </article>
            }
          </section>

          @if (page().table; as table) {
            <section class="users-table-card">
              <div class="table-wrap">
                <table class="users-table">
                  <thead>
                    <tr>
                      @for (column of table.columns; track column) {
                        <th>{{ column }}</th>
                      }
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of table.rows; track row.join('|')) {
                      <tr>
                        <td>
                          <div class="user-cell">
                            <span class="user-avatar">{{ userInitials(row[0]) }}</span>
                            <div>
                              <strong>{{ row[0] }}</strong>
                              <small>{{ row[1] }}</small>
                            </div>
                          </div>
                        </td>
                        <td><span class="user-role-pill">{{ row[2] }}</span></td>
                        <td><span class="account-chip">{{ row[3] }}</span></td>
                        <td>{{ row[4] }}</td>
                        <td class="actions-cell">
                          <div class="row-action-buttons" aria-label="Actions for {{ row[0] }}">
                            <button
                              type="button"
                              class="icon-only-button"
                              matTooltip="Edit access"
                              matTooltipPosition="above"
                              aria-label="Edit access for {{ row[0] }}"
                              (click)="openUserAction('edit-access', row)"
                              [disabled]="!canManageUsers()"
                            >
                              <span class="material-symbols-outlined" aria-hidden="true">edit</span>
                            </button>
                            <button
                              type="button"
                              class="icon-only-button"
                              matTooltip="Resend invite"
                              matTooltipPosition="above"
                              aria-label="Resend invite for {{ row[0] }}"
                              (click)="openUserAction('resend-invite', row)"
                              [disabled]="!canManageUsers()"
                            >
                              <span class="material-symbols-outlined" aria-hidden="true">forward_to_inbox</span>
                            </button>
                            <button
                              type="button"
                              class="icon-only-button"
                              matTooltip="Deactivate user"
                              matTooltipPosition="above"
                              aria-label="Deactivate {{ row[0] }}"
                              (click)="openUserAction('deactivate-user', row)"
                              [disabled]="!canManageUsers()"
                            >
                              <span class="material-symbols-outlined" aria-hidden="true">person_off</span>
                            </button>
                            <button
                              type="button"
                              class="icon-only-button"
                              matTooltip="Audit history"
                              matTooltipPosition="above"
                              aria-label="View audit history for {{ row[0] }}"
                              (click)="openUserAction('audit-history', row)"
                              [disabled]="!canViewAuditLogs()"
                            >
                              <span class="material-symbols-outlined" aria-hidden="true">history</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
              <footer class="users-table-footer">
                <span>Showing {{ table.rows.length }} users</span>
                <div>
                  <button type="button">Previous</button>
                  <button type="button" class="active">1</button>
                  <button type="button">2</button>
                  <button type="button">Next</button>
                </div>
              </footer>
            </section>
          }

          @if (addUserDialogOpen()) {
            <div class="admin-modal-backdrop" aria-hidden="true" (click)="closeAddUserDialog()"></div>
            <section
              class="admin-modal-panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-internal-user-title"
            >
              <header>
                <div>
                  <p class="admin-breadcrumb">Access Control</p>
                  <h2 id="add-internal-user-title">Add Internal User</h2>
                </div>
                <button type="button" class="icon-only-button" aria-label="Close add internal user" (click)="closeAddUserDialog()">
                  <span class="material-symbols-outlined" aria-hidden="true">close</span>
                </button>
              </header>

              <div class="modal-form-grid">
                <label class="stitch-field">
                  <span>Full Name</span>
                  <input placeholder="e.g. Amina Shah" aria-label="Internal user full name" />
                </label>
                <label class="stitch-field">
                  <span>Work Email</span>
                  <input type="email" placeholder="name@tkxel.com" aria-label="Internal user work email" />
                </label>
                <fieldset class="checkbox-group-field">
                  <legend>Assigned Roles</legend>
                  <div class="checkbox-card-grid">
                    @for (role of userRoleOptions; track role) {
                      <label class="checkbox-card">
                        <input type="checkbox" [checked]="role === 'Presales'" />
                        <span>{{ role }}</span>
                      </label>
                    }
                  </div>
                  <em>Users can have multiple roles. The list view shows the highest-priority assigned role.</em>
                </fieldset>
                <fieldset class="checkbox-group-field">
                  <legend>Routing Groups</legend>
                  <div class="checkbox-card-grid">
                    @for (group of routingGroupOptions; track group) {
                      <label class="checkbox-card">
                        <input type="checkbox" [checked]="group === 'Presales Team'" />
                        <span>{{ group }}</span>
                      </label>
                    }
                  </div>
                  <em>Users can belong to multiple workflow routing groups.</em>
                </fieldset>
                <label class="stitch-field">
                  <span>Account Status</span>
                  <select aria-label="Internal user account status">
                    <option>Invited</option>
                    <option>Active</option>
                    <option>Disabled</option>
                  </select>
                </label>
              </div>

              <footer>
                <button mat-stroked-button type="button" class="stitch-secondary-button" (click)="closeAddUserDialog()">
                  Cancel
                </button>
                <button
                  mat-flat-button
                  type="button"
                  class="stitch-primary-button"
                  (click)="submitInternalUserInvite()"
                  [disabled]="!canManageUsers()"
                >
                  Send Invite
                </button>
              </footer>
            </section>
          }

          @if (selectedUserAction(); as userAction) {
            <div class="admin-modal-backdrop" aria-hidden="true" (click)="closeUserAction()"></div>
            <section
              class="admin-modal-panel user-action-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="user-action-title"
            >
              <header>
                <div>
                  <p class="admin-breadcrumb">Access Control / Users</p>
                  <h2 id="user-action-title">{{ userActionTitle(userAction) }}</h2>
                </div>
                <button type="button" class="icon-only-button" aria-label="Close user action" (click)="closeUserAction()">
                  <span class="material-symbols-outlined" aria-hidden="true">close</span>
                </button>
              </header>

              <section class="user-action-summary" aria-label="Selected user">
                <span class="user-avatar">{{ userInitials(userAction.displayName) }}</span>
                <div>
                  <strong>{{ userAction.displayName }}</strong>
                  <span>{{ userAction.email }}</span>
                </div>
                <span class="account-chip">{{ userAction.accountStatus }}</span>
              </section>

              @switch (userAction.action) {
                @case ('edit-access') {
                  <div class="modal-form-grid">
                    <fieldset class="checkbox-group-field">
                      <legend>Assigned Roles</legend>
                      <div class="checkbox-card-grid">
                        @for (role of userRoleOptions; track role) {
                          <label class="checkbox-card">
                            <input type="checkbox" [checked]="role === userAction.roleName" />
                            <span>{{ role }}</span>
                          </label>
                        }
                      </div>
                      <em>The user list displays the highest-priority assigned role.</em>
                    </fieldset>

                    <fieldset class="checkbox-group-field">
                      <legend>Routing Groups</legend>
                      <div class="checkbox-card-grid">
                        @for (group of routingGroupOptions; track group) {
                          <label class="checkbox-card">
                            <input type="checkbox" [checked]="userAction.groupNames.includes(group)" />
                            <span>{{ group }}</span>
                          </label>
                        }
                      </div>
                      <em>Groups route work only; permissions stay role based.</em>
                    </fieldset>

                    <label class="stitch-field">
                      <span>Account Status</span>
                      <select aria-label="Account status">
                        @for (status of accountStatusOptions; track status) {
                          <option [selected]="status === userAction.accountStatus">{{ status }}</option>
                        }
                      </select>
                    </label>
                  </div>
                }

                @case ('resend-invite') {
                  <div class="confirmation-copy">
                    <span class="material-symbols-outlined" aria-hidden="true">forward_to_inbox</span>
                    <div>
                      <strong>Send a fresh invitation link?</strong>
                      <p>A fresh invitation link will be sent and the action will be recorded in audit history.</p>
                      <dl>
                        <div>
                          <dt>Recipient</dt>
                          <dd>{{ userAction.email }}</dd>
                        </div>
                        <div>
                          <dt>Current role</dt>
                          <dd>{{ userAction.roleName }}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                }

                @case ('deactivate-user') {
                  <div class="confirmation-copy warning">
                    <span class="material-symbols-outlined" aria-hidden="true">person_off</span>
                    <div>
                      <strong>Deactivate this user?</strong>
                      <p>Deactivation blocks login and removes the user from active assignment lists. Existing audit history is preserved.</p>
                    </div>
                  </div>

                  <label class="stitch-field">
                    <span>Reason</span>
                    <textarea rows="3" placeholder="Optional reason for audit history" aria-label="Deactivation reason"></textarea>
                  </label>
                }

                @case ('audit-history') {
                  <section class="user-audit-panel">
                    <header>
                      <h3>Recent User Audit Events</h3>
                      <span class="table-status custom">UTC stored, local display</span>
                    </header>
                    <table>
                      <thead>
                        <tr>
                          <th>Local Time</th>
                          <th>Actor</th>
                          <th>Event</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (event of userAuditEvents(userAction); track event.occurredAtUtc + event.event) {
                          <tr>
                            <td>
                              <time [attr.datetime]="event.occurredAtUtc" [matTooltip]="auditTimestampTooltip(event.occurredAtUtc)">
                                {{ formatAuditTimestamp(event.occurredAtUtc) }}
                              </time>
                            </td>
                            <td>{{ event.actor }}</td>
                            <td>{{ event.event }}</td>
                          </tr>
                        }
                        @empty {
                          <tr>
                            <td colspan="3">No audit events returned by the backend.</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </section>
                }
              }

              <footer>
                <button mat-stroked-button type="button" class="stitch-secondary-button" (click)="closeUserAction()">
                  {{ userAction.action === 'audit-history' ? 'Close' : 'Cancel' }}
                </button>
                @if (userAction.action !== 'audit-history') {
                  <button
                    mat-flat-button
                    type="button"
                    class="stitch-primary-button"
                    [class.danger-action]="userAction.action === 'deactivate-user'"
                    (click)="confirmUserAction(userAction)"
                    [disabled]="!canConfirmUserAction(userAction)"
                  >
                    {{ userActionPrimaryLabel(userAction) }}
                  </button>
                }
              </footer>
            </section>
          }
        } @else if (isRolesPage()) {
          <header class="admin-stitch-header">
            <div>
              <h1>{{ page().title }}</h1>
              <p>{{ page().subtitle }}</p>
            </div>
            <button
              mat-flat-button
              type="button"
              class="stitch-primary-button"
              (click)="openAddRoleDialog()"
              [disabled]="!canManageRoles()"
              [matTooltip]="permissionTooltip(canManageRoles())"
            >
              <span class="material-symbols-outlined" aria-hidden="true">add</span>
              Create Role
            </button>
          </header>

          <section class="admin-stitch-metrics three-up">
            @for (metric of page().metrics; track metric.label; let index = $index) {
              <article class="admin-stitch-metric">
                <p>{{ metric.label }}</p>
                <div>
                  <strong>{{ metric.value }}</strong>
                  <span class="material-symbols-outlined" aria-hidden="true">{{ roleMetricIcon(index) }}</span>
                </div>
                <small>{{ metric.note }}</small>
              </article>
            }
          </section>

          <section class="admin-settings-card">
            <header class="permission-resolution-header">
              <span class="heading-title">
                <span class="material-symbols-outlined" aria-hidden="true">settings_applications</span>
                <h2>Tenant Permission Resolution</h2>
              </span>
              <button
                mat-stroked-button
                type="button"
                class="stitch-secondary-button"
                (click)="savePermissionResolutionPolicy()"
                [disabled]="!canManageRoles()"
                [matTooltip]="permissionTooltip(canManageRoles())"
              >
                Save Policy
              </button>
            </header>
            <div class="permission-resolution-grid">
              <label class="permission-resolution-field">
                <span>Role Conflict Resolution</span>
                <select
                  [value]="permissionResolutionMode()"
                  (change)="setPermissionResolutionMode($event)"
                  matTooltip="When highest-priority mode is selected, permissions resolve by the role priority stored on role records."
                  matTooltipPosition="above"
                  aria-label="Role conflict resolution mode"
                >
                  <option value="merge">Merge permissions from all assigned roles</option>
                  <option value="highest-priority">Use highest-priority role only</option>
                </select>
                <small>
                  This controls how effective permissions are calculated when one user has multiple roles.
                </small>
              </label>
            </div>
          </section>

          @if (page().table; as table) {
            <section class="admin-data-card">
              <div class="table-wrap">
                <table class="admin-stitch-table roles-table">
                  <thead>
                    <tr>
                      @for (column of table.columns; track column) {
                        <th
                          [matTooltip]="column === 'Lifecycle' ? 'Lifecycle is only Active or Inactive. System, custom, and protected are separate role attributes.' : ''"
                          matTooltipPosition="above"
                        >
                          {{ column }}
                        </th>
                      }
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of table.rows; track row.join('|')) {
                      <tr>
                        <td><strong>{{ row[0] }}</strong></td>
                        <td>
                          <span
                            class="type-chip"
                            [class.custom]="row[1] === 'Custom'"
                            [matTooltip]="roleTypeTooltip(row[1], row[2])"
                            matTooltipPosition="above"
                          >
                            {{ row[1] }}
                          </span>
                        </td>
                        <td>{{ row[2] }}</td>
                        <td class="mono-cell">{{ row[3] }}</td>
                        <td>{{ row[4] }}</td>
                        <td>
                          <span
                            class="table-status"
                            [class.success]="row[5] === 'Active'"
                            matTooltip="Role lifecycle state from the database. Protected/editable behavior is handled separately."
                            matTooltipPosition="above"
                          >
                            {{ row[5] }}
                          </span>
                        </td>
                        <td class="actions-cell">
                          <div class="row-action-buttons" aria-label="Actions for {{ row[0] }}">
                            <button
                              type="button"
                              class="icon-only-button"
                              matTooltip="Edit role"
                              matTooltipPosition="above"
                              aria-label="Edit role {{ row[0] }}"
                              (click)="openRoleAction('edit-role', row)"
                              [disabled]="!canManageRoles()"
                            >
                              <span class="material-symbols-outlined" aria-hidden="true">edit</span>
                            </button>
                            <button
                              type="button"
                              class="icon-only-button"
                              matTooltip="Assign users"
                              matTooltipPosition="above"
                              aria-label="Bulk assign users to {{ row[0] }}"
                              (click)="openRoleAction('bulk-assign-users', row)"
                              [disabled]="!canManageRoles()"
                            >
                              <span class="material-symbols-outlined" aria-hidden="true">group_add</span>
                            </button>
                            <button
                              type="button"
                              class="icon-only-button"
                              matTooltip="View permissions"
                              matTooltipPosition="above"
                              aria-label="View permissions for {{ row[0] }}"
                              (click)="openRoleAction('view-permissions', row)"
                              [disabled]="!canManageRoles()"
                            >
                              <span class="material-symbols-outlined" aria-hidden="true">fact_check</span>
                            </button>
                            <button
                              type="button"
                              class="icon-only-button"
                              matTooltip="Audit history"
                              matTooltipPosition="above"
                              aria-label="View audit history for {{ row[0] }}"
                              (click)="openRoleAction('audit-history', row)"
                              [disabled]="!canViewAuditLogs()"
                            >
                              <span class="material-symbols-outlined" aria-hidden="true">history</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
              <footer class="admin-table-footer">
                <span>Showing {{ table.rows.length }} roles</span>
                <div>
                  <button type="button">Previous</button>
                  <button type="button">Next</button>
                </div>
              </footer>
            </section>
          }

          @if (addRoleDialogOpen()) {
            <div class="admin-modal-backdrop" aria-hidden="true" (click)="closeAddRoleDialog()"></div>
            <section class="admin-modal-panel role-action-modal" role="dialog" aria-modal="true" aria-labelledby="add-role-title">
              <header>
                <div>
                  <p class="admin-breadcrumb">Access Control / Roles & Permissions</p>
                  <h2 id="add-role-title">Add Role</h2>
                </div>
                <button type="button" class="icon-only-button" aria-label="Close add role" (click)="closeAddRoleDialog()">
                  <span class="material-symbols-outlined" aria-hidden="true">close</span>
                </button>
              </header>

              <div class="modal-form-grid">
                <label class="stitch-field">
                  <span>Role Name</span>
                  <input placeholder="e.g. Recruitment Coordinator" aria-label="Role name" />
                </label>
                <label class="stitch-field">
                  <span>Lifecycle Status</span>
                  <select aria-label="Role status">
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </label>
                <label class="stitch-field">
                  <span>Scope</span>
                  <input value="Tenant" aria-label="Role scope" disabled />
                </label>
                <label class="stitch-field">
                  <span>Priority</span>
                  <input type="number" min="1" value="20" aria-label="Role priority" />
                </label>
                <fieldset class="checkbox-group-field">
                  <legend>Permission Grants</legend>
                  <div class="permission-checkbox-grid">
                    @for (permission of rolePermissionOptions; track permission.id) {
                      <label class="checkbox-card permission-checkbox-card">
                        <input type="checkbox" [checked]="defaultNewRolePermissions.includes(permission.id)" />
                        <span>
                          <strong>{{ permission.label }}</strong>
                          <small>{{ permission.description }}</small>
                        </span>
                      </label>
                    }
                  </div>
                  <em>Roles grant permissions. Workflow groups only route work.</em>
                </fieldset>
              </div>

              <footer>
                <button mat-stroked-button type="button" class="stitch-secondary-button" (click)="closeAddRoleDialog()">
                  Cancel
                </button>
                <button
                  mat-flat-button
                  type="button"
                  class="stitch-primary-button"
                  (click)="submitRole()"
                  [disabled]="!canManageRoles()"
                >
                  Save Role
                </button>
              </footer>
            </section>
          }

          @if (selectedRoleAction(); as roleAction) {
            <div class="admin-modal-backdrop" aria-hidden="true" (click)="closeRoleAction()"></div>
            <section
              class="admin-modal-panel role-action-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="role-action-title"
            >
              <header>
                <div>
                  <p class="admin-breadcrumb">Access Control / Roles & Permissions</p>
                  <h2 id="role-action-title">{{ roleActionTitle(roleAction) }}</h2>
                </div>
                <button type="button" class="icon-only-button" aria-label="Close role action" (click)="closeRoleAction()">
                  <span class="material-symbols-outlined" aria-hidden="true">close</span>
                </button>
              </header>

              <section class="role-action-summary" aria-label="Selected role">
                <span class="material-symbols-outlined" aria-hidden="true">security</span>
                <div>
                  <strong>{{ roleAction.name }}</strong>
                  <span>{{ roleAction.scope }} scope - {{ roleAction.userCount }} assigned users</span>
                </div>
                <span
                  class="table-status"
                  [class.success]="roleAction.status === 'Active'"
                  matTooltip="Role lifecycle state. System/custom/protected are role attributes, not lifecycle statuses."
                  matTooltipPosition="above"
                >
                  {{ roleAction.status }}
                </span>
              </section>

              @switch (roleAction.action) {
                @case ('edit-role') {
                  @if (roleAction.protectedRole) {
                    <div class="confirmation-copy">
                      <span class="material-symbols-outlined" aria-hidden="true">lock</span>
                      <div>
                        <strong>Protected system role</strong>
                        <p>This role is seeded by the application. You can review its permissions, but tenant admins cannot rename it or change grants from the UI.</p>
                      </div>
                    </div>
                  }

                  <div class="modal-form-grid">
                    <label class="stitch-field">
                      <span>Role Name</span>
                      <input [value]="roleAction.name" aria-label="Role name" [disabled]="roleAction.protectedRole" />
                    </label>
                    <label class="stitch-field">
                      <span>Lifecycle Status</span>
                      <select aria-label="Role status" [disabled]="roleAction.protectedRole">
                        <option [selected]="roleAction.status === 'Active'">Active</option>
                        <option [selected]="roleAction.status === 'Inactive'">Inactive</option>
                      </select>
                    </label>
                    <label class="stitch-field">
                      <span>Scope</span>
                      <input [value]="roleAction.scope" aria-label="Role scope" disabled />
                    </label>
                    <label class="stitch-field">
                      <span>Assigned Users</span>
                      <input [value]="roleAction.userCount" aria-label="Assigned users" disabled />
                    </label>
                    <fieldset class="checkbox-group-field">
                      <legend>Permission Grants</legend>
                      <div class="permission-checkbox-grid">
                        @for (permission of rolePermissionOptions; track permission.id) {
                          <label class="checkbox-card permission-checkbox-card">
                            <input
                              type="checkbox"
                              [checked]="roleHasPermission(roleAction, permission)"
                              [disabled]="roleAction.protectedRole"
                            />
                            <span>
                              <strong>{{ permission.label }}</strong>
                              <small>{{ permission.description }}</small>
                            </span>
                          </label>
                        }
                      </div>
                    </fieldset>
                  </div>
                }

                @case ('view-permissions') {
                  <section class="role-permission-review">
                    <header>
                      <h3>Effective Grants</h3>
                      <span class="table-status custom">{{ permissionResolutionLabel() }}</span>
                    </header>
                    <div class="permission-review-grid">
                      @for (permission of rolePermissionOptions; track permission.id) {
                        <article [class.active]="roleHasPermission(roleAction, permission)">
                          <span class="material-symbols-outlined" aria-hidden="true">
                            {{ roleHasPermission(roleAction, permission) ? 'check_circle' : 'radio_button_unchecked' }}
                          </span>
                          <div>
                            <strong>{{ permission.label }}</strong>
                            <small>{{ permission.group }}</small>
                          </div>
                        </article>
                      }
                    </div>
                  </section>
                }

                @case ('bulk-assign-users') {
                  @if (!roleBulkAssignmentAllowed(roleAction)) {
                    <div class="confirmation-copy warning">
                      <span class="material-symbols-outlined" aria-hidden="true">lock</span>
                      <div>
                        <strong>Bulk assignment unavailable</strong>
                        <p>
                          Protected, platform, and portal roles are managed through controlled access paths.
                          Bulk assignment is available for tenant-managed roles only.
                        </p>
                      </div>
                    </div>
                  } @else {
                    <div class="bulk-assignment-layout">
                      <section class="bulk-filter-card">
                        <h3>Find Matching Users</h3>
                        <div class="modal-form-grid compact">
                          <label class="stitch-field">
                            <span>Search Query</span>
                            <input placeholder="Name, email, department, or skill" aria-label="Bulk assignment search query" />
                          </label>
                          <label class="stitch-field">
                            <span>Account Status</span>
                            <select aria-label="Bulk assignment account status filter">
                              <option>Active users only</option>
                              <option>Invited users</option>
                              <option>Any status</option>
                            </select>
                          </label>
                          <label class="stitch-field">
                            <span>Department</span>
                            <select aria-label="Bulk assignment department filter">
                              <option>Any department</option>
                              <option>Engineering</option>
                              <option>QA</option>
                              <option>DevOps</option>
                              <option>Recruitment</option>
                              <option>Presales</option>
                            </select>
                          </label>
                          <label class="stitch-field">
                            <span>Current Role</span>
                            <select aria-label="Bulk assignment current role filter">
                              <option>Any current role</option>
                              <option>Employee</option>
                              <option>Interviewer</option>
                              <option>Recruiter</option>
                              <option>PMO</option>
                              <option>Presales</option>
                            </select>
                          </label>
                        </div>
                      </section>

                      <section class="bulk-preview-card">
                        <header>
                          <div>
                            <span>Preview</span>
                            <strong>{{ bulkAssignmentPreviewCount(roleAction) }}</strong>
                            <small>matching users</small>
                          </div>
                          <span class="table-status custom">{{ bulkAssignmentSelectedCount(roleAction) }} selected</span>
                        </header>
                        <label class="bulk-select-all">
                          <input
                            type="checkbox"
                            [checked]="bulkAssignmentAllSelected(roleAction)"
                            (change)="toggleBulkAssignmentAll(roleAction, $event)"
                            aria-label="Select all matching users"
                          />
                          <span>Select all {{ bulkAssignmentPreviewCount(roleAction) }} users returned by this filter</span>
                        </label>
                        <div class="bulk-preview-list">
                          @for (user of bulkAssignmentPreviewUsers(roleAction); track user.email) {
                            <article [class.selected]="bulkAssignmentUserSelected(user.email)">
                              <input
                                type="checkbox"
                                [checked]="bulkAssignmentUserSelected(user.email)"
                                (change)="toggleBulkAssignmentUser(user.email, $event)"
                                aria-label="Select {{ user.name }}"
                              />
                              <span class="user-avatar">{{ userInitials(user.name) }}</span>
                              <div>
                                <strong>{{ user.name }}</strong>
                                <small>{{ user.email }} - {{ user.department }}</small>
                              </div>
                              <span class="user-role-pill">{{ user.currentRole }}</span>
                            </article>
                          }
                          @empty {
                            <article>
                              <div>
                                <strong>No users matched this filter.</strong>
                                <small>Change the filters and preview again.</small>
                              </div>
                            </article>
                          }
                        </div>
                        <p>
                          This adds <strong>{{ roleAction.name }}</strong> to selected users.
                          Existing roles remain assigned, and the displayed highest-priority role is recalculated by backend policy.
                        </p>
                      </section>
                    </div>
                  }
                }

                @case ('audit-history') {
                  <section class="user-audit-panel">
                    <header>
                      <h3>Recent Role Audit Events</h3>
                      <span class="table-status custom">UTC stored, local display</span>
                    </header>
                    <table>
                      <thead>
                        <tr>
                          <th>Local Time</th>
                          <th>Actor</th>
                          <th>Event</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (event of roleAuditEvents(roleAction); track event.occurredAtUtc + event.event) {
                          <tr>
                            <td>
                              <time [attr.datetime]="event.occurredAtUtc" [matTooltip]="auditTimestampTooltip(event.occurredAtUtc)">
                                {{ formatAuditTimestamp(event.occurredAtUtc) }}
                              </time>
                            </td>
                            <td>{{ event.actor }}</td>
                            <td>{{ event.event }}</td>
                          </tr>
                        }
                        @empty {
                          <tr>
                            <td colspan="3">No audit events returned by the backend.</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </section>
                }
              }

              <footer>
                <button mat-stroked-button type="button" class="stitch-secondary-button" (click)="closeRoleAction()">
                  {{ roleAction.action === 'audit-history' || roleAction.action === 'view-permissions' || !roleBulkAssignmentAllowed(roleAction) ? 'Close' : 'Cancel' }}
                </button>
                @if (roleAction.action === 'edit-role' && !roleAction.protectedRole) {
                  <button
                    mat-flat-button
                    type="button"
                    class="stitch-primary-button"
                    (click)="confirmRoleAction(roleAction)"
                    [disabled]="!canManageRoles()"
                  >
                    Save Role
                  </button>
                }
                @if (roleAction.action === 'bulk-assign-users' && roleBulkAssignmentAllowed(roleAction)) {
                  <button
                    mat-flat-button
                    type="button"
                    class="stitch-primary-button"
                    [disabled]="bulkAssignmentSelectedCount(roleAction) === 0 || !canManageRoles()"
                    (click)="confirmRoleAction(roleAction)"
                  >
                    Assign {{ bulkAssignmentSelectedCount(roleAction) }} Users
                  </button>
                }
              </footer>
            </section>
          }

          <footer class="admin-context-note">
            <span class="material-symbols-outlined" aria-hidden="true">info</span>
            <div>
              <strong>Permission Summary</strong>
              <p>Access model is role based. Custom roles use known permissions. Groups route work only.</p>
              <small>
                Detailed permission selection happens inside role edit screens. All changes are logged in Audit History.
              </small>
            </div>
          </footer>
        } @else if (isWorkflowsPage()) {
          <header class="admin-stitch-header">
            <div>
              <p class="admin-breadcrumb">Configuration / Workflows</p>
              <h1>{{ page().title }}</h1>
              <p>{{ page().subtitle }}</p>
            </div>
            <div class="header-actions">
              <button
                mat-stroked-button
                type="button"
                class="stitch-secondary-button"
                [disabled]="!canManageCurrentAdminPage()"
                [matTooltip]="permissionTooltip(canManageCurrentAdminPage())"
              >
                <span class="material-symbols-outlined" aria-hidden="true">download</span>
                Export Logic
              </button>
              <button
                mat-flat-button
                type="button"
                class="stitch-primary-button"
                [disabled]="!canManageCurrentAdminPage()"
                [matTooltip]="permissionTooltip(canManageCurrentAdminPage())"
              >
                <span class="material-symbols-outlined" aria-hidden="true">add</span>
                Create Routing Rule
              </button>
            </div>
          </header>

          <nav class="admin-tabs" aria-label="Workflow sections" role="tablist">
            @for (tab of workflowTabs; track tab.id) {
              <button
                type="button"
                role="tab"
                [class.active]="activeWorkflowTab() === tab.id"
                [attr.aria-selected]="activeWorkflowTab() === tab.id"
                (click)="setActiveWorkflowTab(tab.id)"
              >
                {{ tab.label }}
              </button>
            }
          </nav>

          @switch (activeWorkflowTab()) {
            @case ('policies') {
              <section class="workflow-settings-grid">
                <article class="admin-data-card workflow-policy-card">
                  <header class="admin-data-card-header">
                    <h2>Global Workflow Policies</h2>
                    <span class="table-status success">Active</span>
                  </header>
                  <div class="workflow-policy-list">
                    <div class="workflow-policy-row">
                      <span class="material-symbols-outlined" aria-hidden="true">admin_panel_settings</span>
                      <div>
                        <strong>Fallback owner</strong>
                        <p>Tenant Admins receive work when the configured group has no active members.</p>
                      </div>
                      <span class="code-chip">Tenant Admin</span>
                    </div>
                    <div class="workflow-policy-row">
                      <span class="material-symbols-outlined" aria-hidden="true">groups</span>
                      <div>
                        <strong>Group assignment</strong>
                        <p>Routing rules assign work to groups first. Permissions stay role based.</p>
                      </div>
                      <span class="code-chip">Groups only</span>
                    </div>
                    <div class="workflow-policy-row">
                      <span class="material-symbols-outlined" aria-hidden="true">checklist_rtl</span>
                      <div>
                        <strong>Baton ownership</strong>
                        <p>Workflow policies decide the next owner for each active handoff.</p>
                      </div>
                      <span class="code-chip">Owner rules</span>
                    </div>
                  </div>
                </article>

                <aside class="admin-data-card workflow-policy-card compact">
                  <header class="admin-data-card-header">
                    <h2>Policy Scope</h2>
                  </header>
                  <div class="workflow-policy-summary">
                    <strong>Resource request workflow</strong>
                    <p>Presales creates a request, PMO reviews bench matches, and recruiters continue sourcing when needed.</p>
                    <strong>Candidate workflow</strong>
                    <p>Interview stages and hiring manager review are controlled by the selected hiring pipeline template.</p>
                  </div>
                </aside>
              </section>
            }

            @case ('routing-rules') {
              <div class="admin-info-banner">
                <span class="material-symbols-outlined" aria-hidden="true">info</span>
                <p>
                  <strong>Group-routing fallback is managed at the tenant level.</strong>
                  Tasks with no active group members route to Tenant Admins.
                </p>
              </div>

              @if (page().table; as table) {
                <section class="admin-data-card">
                  <div class="admin-table-toolbar">
                    <label>
                      <span class="material-symbols-outlined" aria-hidden="true">filter_list</span>
                      <select aria-label="Filter actions">
                        <option>All Actions</option>
                        <option>CREATE_BY_PRESALES</option>
                        <option>FORWARD_TO_RECRUITER</option>
                      </select>
                    </label>
                    <label>
                      <span class="material-symbols-outlined" aria-hidden="true">search</span>
                      <input type="search" placeholder="Search targets..." aria-label="Search workflow targets" />
                    </label>
                    <div class="admin-table-filter-pills">
                      <span>Show:</span>
                      <button type="button" class="active">All Rules</button>
                      <button type="button">Active Only</button>
                    </div>
                  </div>

                  <div class="table-wrap">
                    <table class="admin-stitch-table workflow-table">
                      <thead>
                        <tr>
                          @for (column of table.columns; track column) {
                            <th>{{ column }}</th>
                          }
                        </tr>
                      </thead>
                      <tbody>
                        @for (row of table.rows; track row.join('|')) {
                          <tr>
                            <td><span class="code-chip">{{ row[0] }}</span></td>
                            <td>{{ row[1] }}</td>
                            <td>{{ row[2] }}</td>
                            <td>
                              <span class="workflow-assignment">
                                <span class="material-symbols-outlined" aria-hidden="true">{{ workflowAssignmentIcon(row[3]) }}</span>
                                {{ row[3] }}
                              </span>
                            </td>
                            <td><strong class="link-like">{{ row[4] }}</strong></td>
                            <td>
                              <button
                                type="button"
                                class="workflow-status-toggle"
                                [class.active]="row[5] === 'Active'"
                                [matTooltip]="row[5]"
                                matTooltipPosition="above"
                                [attr.aria-label]="row[0] + ' status: ' + row[5]"
                              >
                                <span></span>
                              </button>
                            </td>
                            <td class="actions-cell">
                              <div class="row-action-buttons" aria-label="Actions for {{ row[0] }}">
                                <button
                                  type="button"
                                  class="icon-only-button"
                                  matTooltip="Edit routing rule"
                                  matTooltipPosition="above"
                                  aria-label="Edit routing rule {{ row[0] }}"
                                  (click)="handleAdminRowAction('Edit routing rule', row[0])"
                                  [disabled]="!canManageCurrentAdminPage()"
                                >
                                  <span class="material-symbols-outlined" aria-hidden="true">edit</span>
                                </button>
                                <button
                                  type="button"
                                  class="icon-only-button"
                                  matTooltip="Test resolver"
                                  matTooltipPosition="above"
                                  aria-label="Test resolver for {{ row[0] }}"
                                  (click)="handleAdminRowAction('Test resolver', row[0])"
                                  [disabled]="!canManageCurrentAdminPage()"
                                >
                                  <span class="material-symbols-outlined" aria-hidden="true">play_arrow</span>
                                </button>
                                <button
                                  type="button"
                                  class="icon-only-button"
                                  matTooltip="Audit history"
                                  matTooltipPosition="above"
                                  aria-label="View audit history for {{ row[0] }}"
                                  (click)="handleAdminRowAction('View audit history', row[0])"
                                  [disabled]="!canViewAuditLogs()"
                                >
                                  <span class="material-symbols-outlined" aria-hidden="true">history</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                  <footer class="admin-table-footer">
                    <span>Showing 1-{{ table.rows.length }} of {{ table.rows.length }} rules</span>
                    <div>
                      <button type="button" class="active">1</button>
                    </div>
                  </footer>
                </section>
              }

            }

            @case ('transition-triggers') {
              <section class="workflow-trigger-grid">
                <article class="admin-data-card workflow-trigger-card">
                  <header class="admin-data-card-header">
                    <h2>Transition Triggers</h2>
                    <span class="table-status success">Configured</span>
                  </header>
                  <div class="workflow-trigger-list">
                    <div class="workflow-trigger-row">
                      <span class="code-chip">PMO_TO_RECRUITER</span>
                      <div>
                        <strong>PMO forwards request</strong>
                        <p>Recruiters receive the job request when no bench candidate is selected.</p>
                      </div>
                    </div>
                    <div class="workflow-trigger-row">
                      <span class="code-chip">INTERVIEW_ASSIGNED</span>
                      <div>
                        <strong>Interview stage assigned</strong>
                        <p>Selected interviewer receives the active stage with candidate context.</p>
                      </div>
                    </div>
                    <div class="workflow-trigger-row">
                      <span class="code-chip">FINAL_REVIEW_READY</span>
                      <div>
                        <strong>Final interview completed</strong>
                        <p>Hiring Manager receives the candidate packet for offer decision.</p>
                      </div>
                    </div>
                  </div>
                </article>
              </section>
            }
          }
        } @else if (isAiSettingsPage()) {
          <header class="admin-stitch-header">
            <div>
              <p class="admin-breadcrumb">{{ page().eyebrow }}</p>
              <h1>{{ page().title }}</h1>
              <p>{{ page().subtitle }}</p>
            </div>
            <button
              mat-flat-button
              type="button"
              class="stitch-primary-button"
              [matTooltip]="pageActionTooltip()"
              matTooltipPosition="below"
            >
              <span class="material-symbols-outlined" aria-hidden="true">{{ pageActionIcon() }}</span>
              {{ pageActionLabel() }}
            </button>
          </header>

          <section class="admin-stitch-metrics">
            @for (metric of page().metrics; track metric.label; let index = $index) {
              <article
                class="admin-stitch-metric"
                [matTooltip]="metric.tooltip ?? ''"
                [matTooltipDisabled]="!metric.tooltip"
                matTooltipPosition="above"
              >
                <p>{{ metric.label }}</p>
                <div>
                  <strong>{{ metric.value }}</strong>
                  <span class="material-symbols-outlined" aria-hidden="true">{{ adminMetricIcon(index) }}</span>
                </div>
                @if (metric.note) {
                  <small>{{ metric.note }}</small>
                }
              </article>
            }
          </section>

          <nav class="admin-tabs" aria-label="AI settings sections" role="tablist">
            @for (tab of aiSettingsTabs; track tab.id) {
              <button
                type="button"
                role="tab"
                [class.active]="activeAiSettingsTab() === tab.id"
                [attr.aria-selected]="activeAiSettingsTab() === tab.id"
                (click)="setActiveAiSettingsTab(tab.id)"
              >
                {{ tab.label }}
              </button>
            }
          </nav>

          @switch (activeAiSettingsTab()) {
            @case ('runtime') {
              <section class="admin-config-layout">
                @if (page().table; as table) {
                  <section class="admin-data-card">
                    <header class="admin-data-card-header">
                      <h2>Runtime Guardrails</h2>
                      @if (page().status) {
                        <span class="table-status custom">{{ page().status }}</span>
                      }
                    </header>
                    <div class="admin-table-toolbar compact">
                      <label>
                        <span class="material-symbols-outlined" aria-hidden="true">search</span>
                        <input type="search" placeholder="Search guardrails" aria-label="Search AI runtime guardrails" />
                      </label>
                    </div>
                    <div class="table-wrap">
                      <table class="admin-stitch-table ai-settings-table">
                        <thead>
                          <tr>
                            @for (column of table.columns; track column) {
                              <th>{{ column }}</th>
                            }
                          </tr>
                        </thead>
                        <tbody>
                          @for (row of table.rows; track row.join('|')) {
                            <tr>
                              @for (cell of row; track cellIndex; let cellIndex = $index) {
                                <td>
                                  @if (isStatusValue(cell)) {
                                    <span
                                      class="table-status"
                                      [class.success]="isSuccessStatus(cell)"
                                      [class.warning]="isWarningStatus(cell)"
                                      [class.custom]="isCustomStatus(cell)"
                                    >
                                      {{ cell }}
                                    </span>
                                  } @else {
                                    {{ cell }}
                                  }
                                </td>
                              }
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                    <footer class="admin-table-footer">
                      <span>Showing {{ table.rows.length }} runtime guardrail</span>
                      <div>
                        <button type="button">Previous</button>
                        <button type="button" class="active">1</button>
                        <button type="button">Next</button>
                      </div>
                    </footer>
                  </section>
                }

                <aside class="admin-config-rail">
                  @for (card of page().cards; track card.title) {
                    <article
                      class="admin-rail-card"
                      [matTooltip]="card.tooltip ?? ''"
                      [matTooltipDisabled]="!card.tooltip"
                      matTooltipPosition="above"
                    >
                      <h2>{{ card.title }}</h2>
                      <ul>
                        @for (line of card.lines; track line) {
                          <li>{{ line }}</li>
                        }
                      </ul>
                    </article>
                  }
                </aside>
              </section>
            }

            @case ('agents') {
              <section class="admin-info-banner ai-agent-count-banner">
                <span class="material-symbols-outlined" aria-hidden="true">smart_toy</span>
                <p>
                  <strong>{{ aiAgents.length }} AI agents are active in the MVP.</strong>
                  Each agent provides recommendations, parsing, or summaries only. Humans keep control of workflow and hiring decisions.
                </p>
              </section>

              <section class="ai-agent-grid" aria-label="AI agent responsibilities">
                @for (agent of aiAgents; track agent.name) {
                  <article class="ai-agent-card">
                    <header>
                      <span class="material-symbols-outlined" aria-hidden="true">smart_toy</span>
                      <div>
                        <h2>{{ agent.name }}</h2>
                        <p>{{ agent.responsibility }}</p>
                      </div>
                    </header>
                    <dl>
                      <div>
                        <dt>Input</dt>
                        <dd>{{ agent.input }}</dd>
                      </div>
                      <div>
                        <dt>Output</dt>
                        <dd>{{ agent.output }}</dd>
                      </div>
                      <div>
                        <dt>MVP Boundary</dt>
                        <dd>{{ agent.boundary }}</dd>
                      </div>
                    </dl>
                  </article>
                }
              </section>

              <footer class="admin-context-note ai-agent-boundary-note">
                <span class="material-symbols-outlined" aria-hidden="true">verified_user</span>
                <div>
                  <strong>Decision boundary</strong>
                  <p>AI output is advisory. PMO, recruiters, interviewers, and hiring managers remain responsible for every business decision.</p>
                  <small>Each agent run should be logged with input source, output summary, model version, and UTC timestamp for auditability.</small>
                </div>
              </footer>
            }
          }
        } @else {
          <header class="admin-stitch-header">
            <div>
              <p class="admin-breadcrumb">{{ page().eyebrow }}</p>
              <h1>{{ page().title }}</h1>
              <p>{{ page().subtitle }}</p>
            </div>
            @if (showPageAction()) {
              <button
                mat-flat-button
                type="button"
                class="stitch-primary-button"
                [matTooltip]="pageActionTooltip()"
                [matTooltipDisabled]="!pageActionTooltip()"
                matTooltipPosition="below"
                (click)="handlePageAction()"
                [disabled]="!canRunPageAction()"
              >
                <span class="material-symbols-outlined" aria-hidden="true">{{ pageActionIcon() }}</span>
                {{ pageActionLabel() }}
              </button>
            }
          </header>

          <section class="admin-stitch-metrics">
            @for (metric of page().metrics; track metric.label; let index = $index) {
              <article
                class="admin-stitch-metric"
                [matTooltip]="metric.tooltip ?? ''"
                [matTooltipDisabled]="!metric.tooltip"
                matTooltipPosition="above"
              >
                <p>{{ metric.label }}</p>
                <div>
                  <strong>{{ metric.value }}</strong>
                  <span class="material-symbols-outlined" aria-hidden="true">{{ adminMetricIcon(index) }}</span>
                </div>
                @if (metric.note) {
                  <small>{{ metric.note }}</small>
                }
              </article>
            }
          </section>

          <section class="admin-config-layout" [class.single-column]="!page().table">
            @if (page().table; as table) {
              <section class="admin-data-card">
                <header class="admin-data-card-header">
                  <h2>{{ adminDetailsTitle() }}</h2>
                  @if (adminDetailsStatus(); as status) {
                    <span class="table-status custom">{{ status }}</span>
                  }
                </header>
                <div class="admin-table-toolbar compact">
                  <label>
                    <span class="material-symbols-outlined" aria-hidden="true">search</span>
                    <input type="search" placeholder="Search {{ page().title.toLowerCase() }}" [attr.aria-label]="'Search ' + page().title" />
                  </label>
                </div>
                <div class="table-wrap">
                  <table
                    class="admin-stitch-table"
                    [class.pipeline-template-table]="isHiringPipelinePage()"
                    [class.groups-table]="isGroupsPage()"
                    [class.departments-table]="isDepartmentsPage()"
                    [class.skills-table]="isSkillsPage()"
                    [class.notifications-table]="isNotificationsPage()"
                    [class.ai-settings-table]="isAiSettingsPage()"
                    [class.integrations-table]="isIntegrationsPage()"
                    [class.audit-logs-table]="isAuditLogsPage()"
                  >
                    <thead>
                      <tr>
                        @for (column of table.columns; track column) {
                          <th>{{ column }}</th>
                        }
                      </tr>
                    </thead>
                    <tbody>
                      @for (row of table.rows; track row.join('|')) {
                        <tr>
                          @for (cell of row; track cellIndex; let cellIndex = $index) {
                            <td
                              [class.mono-cell]="cellIndex === 0 && isCodeLike(cell)"
                              [class.stage-flow-cell]="isPipelineStageCell(cellIndex)"
                            >
                              @if (isPipelineStageCell(cellIndex)) {
                                <div class="pipeline-stage-flow" [attr.aria-label]="cell">
                                  @for (stage of stageSteps(cell); track stage; let last = $last) {
                                    <span class="pipeline-stage-chip">{{ stage }}</span>
                                    @if (!last) {
                                      <span class="material-symbols-outlined pipeline-stage-arrow" aria-hidden="true">
                                        chevron_right
                                      </span>
                                    }
                                  }
                                </div>
                              } @else if (isAuditTimestampCell(cellIndex)) {
                                <time [attr.datetime]="cell" [matTooltip]="auditTimestampTooltip(cell)" matTooltipPosition="above">
                                  {{ formatAuditTimestamp(cell) }}
                                </time>
                              } @else {
                                @if (isStatusValue(cell)) {
                                  <span
                                    class="table-status"
                                    [class.success]="isSuccessStatus(cell)"
                                    [class.warning]="isWarningStatus(cell)"
                                    [class.custom]="isCustomStatus(cell)"
                                  >
                                    {{ cell }}
                                  </span>
                                } @else if (cellIndex === 0 && isCodeLike(cell)) {
                                  <span class="code-chip">{{ cell }}</span>
                                } @else {
                                  {{ cell }}
                                }
                              }
                            </td>
                          }
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
                <footer class="admin-table-footer">
                  <span>Showing {{ table.rows.length }} {{ page().title.toLowerCase() }}</span>
                  <div>
                    <button type="button">Previous</button>
                    <button type="button" class="active">1</button>
                    <button type="button">Next</button>
                  </div>
                </footer>
              </section>
            }

            <aside class="admin-config-rail">
              @for (card of page().cards; track card.title) {
                <article
                  class="admin-rail-card"
                  [matTooltip]="card.tooltip ?? ''"
                  [matTooltipDisabled]="!card.tooltip"
                  matTooltipPosition="above"
                >
                  <h2>{{ card.title }}</h2>
                  <ul>
                    @for (line of card.lines; track line) {
                      <li>{{ line }}</li>
                    }
                  </ul>
                </article>
              }
            </aside>
          </section>

          @if (isNotificationsPage()) {
            <section class="admin-data-card notification-template-card">
              <header class="admin-data-card-header">
                <h2>Email Templates</h2>
                <span class="table-status custom">Editable content</span>
              </header>
              <div class="table-wrap">
                <table class="admin-stitch-table notification-template-table">
                  <thead>
                    <tr>
                      <th>Template</th>
                      <th>Linked Event</th>
                      <th>Subject</th>
                      <th>Recipient</th>
                      <th>Updated</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (template of notificationTemplates; track template.templateId) {
                      <tr>
                        <td><strong>{{ template.name }}</strong></td>
                        <td><span class="code-chip">{{ template.eventCode }}</span></td>
                        <td>{{ template.subject }}</td>
                        <td>{{ template.recipient }}</td>
                        <td>
                          <time [attr.datetime]="template.updatedAtUtc" [matTooltip]="auditTimestampTooltip(template.updatedAtUtc)" matTooltipPosition="above">
                            {{ formatAuditTimestamp(template.updatedAtUtc) }}
                          </time>
                        </td>
                        <td class="actions-cell">
                          <button
                            type="button"
                            class="icon-only-button"
                            matTooltip="Edit email template"
                            matTooltipPosition="above"
                            aria-label="Edit template {{ template.name }}"
                            (click)="openNotificationTemplate(template)"
                            [disabled]="!canManageNotifications()"
                          >
                            <span class="material-symbols-outlined" aria-hidden="true">edit</span>
                          </button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
              <footer class="admin-table-footer">
                <span>Showing {{ notificationTemplates.length }} email templates</span>
                <div>
                  <button type="button">Previous</button>
                  <button type="button" class="active">1</button>
                  <button type="button">Next</button>
                </div>
              </footer>
            </section>
          }
        }
      }

      @if (selectedNotificationTemplate(); as template) {
        <div class="admin-modal-backdrop" aria-hidden="true" (click)="closeNotificationTemplate()"></div>
        <section class="admin-modal-panel notification-template-modal" role="dialog" aria-modal="true" aria-labelledby="notification-template-title">
          <header>
            <div>
              <p class="admin-breadcrumb">Configuration / Notifications</p>
              <h2 id="notification-template-title">Edit Email Template</h2>
            </div>
            <button type="button" class="icon-only-button" aria-label="Close email template" (click)="closeNotificationTemplate()">
              <span class="material-symbols-outlined" aria-hidden="true">close</span>
            </button>
          </header>

          <section class="notification-template-summary">
            <span class="material-symbols-outlined" aria-hidden="true">mark_email_read</span>
            <div>
              <strong>{{ template.name }}</strong>
              <span>{{ template.eventCode }} - {{ template.recipient }}</span>
            </div>
            <span class="table-status success">Active</span>
          </section>

          <div class="modal-form-grid notification-template-form">
            <label class="stitch-field">
              <span>Subject</span>
              <input [value]="template.subject" aria-label="Email template subject" />
            </label>
            <label class="stitch-field full-span">
              <span>Email Body</span>
              <textarea rows="8" aria-label="Email template body">{{ template.body }}</textarea>
            </label>
          </div>

          <section class="template-variable-panel">
            <h3>Available Variables</h3>
            <div>
              @for (variable of template.variables; track variable) {
                <span class="code-chip">{{ '{{' + variable + '}}' }}</span>
              }
            </div>
          </section>

          <footer>
            <button mat-button type="button" class="stitch-secondary-button" (click)="closeNotificationTemplate()">Cancel</button>
            <button
              mat-flat-button
              type="button"
              class="stitch-primary-button"
              (click)="saveNotificationTemplate(template)"
              [disabled]="!canManageNotifications()"
            >
              Save Template
            </button>
          </footer>
        </section>
      }
    </main>
  `,
})
export class AdminPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder);
  private readonly adminSettingsApi = inject(AdminSettingsApiService);
  private readonly adminCenterApi = inject(AdminCenterApiService);
  private readonly notifications = inject(NotificationService);
  private readonly permissionService = inject(PermissionService);
  private readonly store = inject(TalentPilotStoreService);
  private readonly pageId = toSignal(this.route.paramMap.pipe(map((params) => params.get('pageId'))), {
    initialValue: 'tenant-profile',
  });
  private readonly savedTenantProfile = this.adminSettingsApi.tenantProfile;

  readonly tenantProfileForm = this.formBuilder.nonNullable.group({
    displayName: [this.savedTenantProfile().displayName, [Validators.required, Validators.minLength(2)]],
    slug: [
      this.savedTenantProfile().slug,
      [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)],
    ],
    domain: [this.savedTenantProfile().domain, [Validators.required]],
    adminContactEmail: [this.savedTenantProfile().adminContactEmail, [Validators.required, Validators.email]],
    defaultTimezone: [this.savedTenantProfile().defaultTimezone, [Validators.required, timezoneValidator]],
    defaultCurrency: [this.savedTenantProfile().defaultCurrency as TenantCurrency, [Validators.required]],
    status: [this.savedTenantProfile().status as TenantStatus, [Validators.required]],
    careerDisplayName: [this.savedTenantProfile().careerDisplayName, [Validators.required]],
    primaryColor: [this.savedTenantProfile().primaryColor, [Validators.required, Validators.pattern(/^#[0-9a-f]{6}$/i)]],
    candidateLoginRequired: [this.savedTenantProfile().candidateLoginRequired],
    candidateCvFormat: [this.savedTenantProfile().candidateCvFormat as CandidateCvFormat, [Validators.required]],
    publicJobsEnabled: [this.savedTenantProfile().publicJobsEnabled],
    inviteExpiryDays: [this.savedTenantProfile().inviteExpiryDays, [Validators.required, Validators.min(1), Validators.max(30)]],
    reapplyCooldownDays: [
      this.savedTenantProfile().reapplyCooldownDays,
      [Validators.required, Validators.min(1), Validators.max(365)],
    ],
  });

  private readonly backendPageOverrides = signal<Record<string, AdminPage>>({});
  private readonly backendPageErrors = signal<Record<string, string>>({});
  private readonly userAuditEventsByUserId = signal<Record<string, AuditEventRow[]>>({});
  private readonly roleAuditEventsByRoleId = signal<Record<string, AuditEventRow[]>>({});
  private readonly bulkAssignmentPreviewByRoleId = signal<Record<string, BulkAssignmentPreviewUser[]>>({});

  readonly page = computed(() => {
    const id = this.pageId() ?? 'tenant-profile';
    const override = this.backendPageOverrides()[id];
    if (override) {
      return override;
    }

    const basePage = getAdminPage(id);
    if (this.requiresBackendData(id)) {
      return this.backendLoadingPage(basePage, this.backendPageErrors()[id]);
    }

    return basePage;
  });
  readonly guardrailSummary = computed(() => this.page().guardrails.join(' '));
  readonly isTenantProfile = computed(() => this.page().id === 'tenant-profile');
  readonly isUsersPage = computed(() => this.page().id === 'users');
  readonly isRolesPage = computed(() => this.page().id === 'roles-permissions');
  readonly isGroupsPage = computed(() => this.page().id === 'groups');
  readonly isDepartmentsPage = computed(() => this.page().id === 'departments');
  readonly isSkillsPage = computed(() => this.page().id === 'skills');
  readonly isWorkflowsPage = computed(() => this.page().id === 'workflows');
  readonly isNotificationsPage = computed(() => this.page().id === 'notifications');
  readonly isAiSettingsPage = computed(() => this.page().id === 'ai-settings');
  readonly isIntegrationsPage = computed(() => this.page().id === 'integrations');
  readonly isAuditLogsPage = computed(() => this.page().id === 'audit-logs');
  readonly isHiringPipelinePage = computed(() => this.page().id === 'hiring-pipeline');
  readonly canManageTenantProfile = computed(() =>
    this.permissionService.hasAny([Permission.ManageTenantProfile, Permission.ManageAdminCenter]),
  );
  readonly canManageUsers = computed(() => this.permissionService.has(Permission.ManageUsers));
  readonly canManageRoles = computed(() => this.permissionService.has(Permission.ManageRoles));
  readonly canViewAuditLogs = computed(() => this.permissionService.has(Permission.ViewAuditLogs));
  readonly canManageNotifications = computed(() =>
    this.permissionService.hasAny([Permission.ManageNotifications, Permission.ManageAdminCenter]),
  );
  readonly canManageCurrentAdminPage = computed(() => this.permissionService.canAccessAdminPage(this.page().id));
  readonly saving = signal(false);
  readonly formMessage = signal('');
  readonly formMessageIsError = signal(false);
  readonly addUserDialogOpen = signal(false);
  readonly selectedUserAction = signal<UserActionContext | null>(null);
  readonly addRoleDialogOpen = signal(false);
  readonly selectedRoleAction = signal<RoleActionContext | null>(null);
  readonly bulkAssignmentSelectedEmails = signal<Set<string>>(new Set());
  readonly selectedNotificationTemplate = signal<NotificationTemplateDefinition | null>(null);
  readonly sendingTestNotification = signal(false);
  readonly activeTenantTab = signal<TenantProfileTab>('profile');
  readonly activeWorkflowTab = signal<WorkflowTab>('routing-rules');
  readonly activeAiSettingsTab = signal<AiSettingsTab>('runtime');
  readonly permissionResolutionMode = signal<PermissionResolutionMode>('merge');
  readonly timezoneOptions = buildTimezoneOptions(this.savedTenantProfile().defaultTimezone);
  notificationTemplates: NotificationTemplateDefinition[] = [];
  userRoleOptions: string[] = [];
  routingGroupOptions: string[] = [];
  readonly accountStatusOptions = ['Active', 'Invited', 'Disabled'];
  rolePermissionOptions: RolePermissionOption[] = [];
  readonly defaultNewRolePermissions: string[] = [];
  readonly tenantDraft = toSignal(
    this.tenantProfileForm.valueChanges.pipe(
      startWith(this.tenantProfileForm.getRawValue()),
      map((formValue) => ({
        ...this.savedTenantProfile(),
        ...formValue,
      })),
    ),
    {
      initialValue: {
        ...this.savedTenantProfile(),
        ...this.tenantProfileForm.getRawValue(),
      },
    },
  );
  readonly previewColor = computed(() => {
    const color = this.tenantDraft().primaryColor;
    return /^#[0-9a-f]{6}$/i.test(color) ? color : '#0A66C2';
  });
  readonly tenantLogoText = computed(() => {
    const text = this.tenantDraft().displayName.replace(/[^a-z0-9]/gi, '').slice(0, 2).toUpperCase();
    return text || 'TP';
  });
  readonly tenantTabs: Array<{ id: TenantProfileTab; label: string }> = [
    { id: 'profile', label: 'Profile' },
    { id: 'branding', label: 'Branding' },
    { id: 'career-page', label: 'Career Page' },
    { id: 'security', label: 'Security' },
  ];
  readonly workflowTabs: Array<{ id: WorkflowTab; label: string }> = [
    { id: 'policies', label: 'Global Policies' },
    { id: 'routing-rules', label: 'Routing Rules' },
    { id: 'transition-triggers', label: 'Transition Triggers' },
  ];
  readonly aiSettingsTabs: Array<{ id: AiSettingsTab; label: string }> = [
    { id: 'runtime', label: 'Runtime & Guardrails' },
    { id: 'agents', label: 'AI Agents' },
  ];
  aiAgents: AiAgentDefinition[] = [];

  constructor() {
    effect(() => {
      const profile = this.savedTenantProfile();
      if (!profile.tenantId || !this.tenantProfileForm.pristine) {
        return;
      }

      this.patchTenantProfileForm(profile);
    });

    effect(() => {
      const id = this.pageId() ?? 'tenant-profile';
      if (this.requiresBackendData(id)) {
        void this.loadBackendPage(id);
      }
    });
  }

  private requiresBackendData(pageId: string): boolean {
    return pageId !== 'tenant-profile';
  }

  private backendLoadingPage(basePage: AdminPage, error?: string): AdminPage {
    return {
      ...basePage,
      subtitle: error
        ? `Backend data is required for this screen. ${error}`
        : 'Loading this screen from the backend...',
      status: error ? 'Backend required' : 'Loading',
      metrics: [],
      cards: [],
      table: undefined,
      guardrails: [],
    };
  }

  private async loadBackendPage(pageId: string): Promise<void> {
    try {
      if (pageId === 'users') {
        const [response, roles, groups] = await Promise.all([
          this.adminCenterApi.listUsers(),
          this.adminCenterApi.listRoles(),
          this.adminCenterApi.listGroups(),
        ]);
        this.userRoleOptions = roles.items.map((role) => role.name);
        this.routingGroupOptions = groups.items.map((group) => group.name);
        this.setBackendPageOverride(pageId, this.toUsersPage(response));
        return;
      }

      if (pageId === 'roles-permissions') {
        const [roles, permissions, policy] = await Promise.all([
          this.adminCenterApi.listRoles(),
          this.adminCenterApi.listPermissions(),
          this.adminCenterApi.getPermissionResolutionPolicy(),
        ]);
        this.rolePermissionOptions = permissions
          .filter((permission) => permission.status === 'Active')
          .map((permission) => this.toRolePermissionOption(permission));
        this.permissionResolutionMode.set(
          policy.mode === 'HighestPriorityRoleOnly' ? 'highest-priority' : 'merge',
        );
        this.setBackendPageOverride(pageId, this.toRolesPage(roles.items, roles.summary));
        return;
      }

      if (pageId === 'groups') {
        const response = await this.adminCenterApi.listGroups();
        this.routingGroupOptions = response.items.map((group) => group.name);
        this.setBackendPageOverride(pageId, this.toGroupsPage(response.items));
        return;
      }

      if (pageId === 'notifications') {
        const [events, templates] = await Promise.all([
          this.adminCenterApi.listNotificationEvents(),
          this.adminCenterApi.listNotificationTemplates(),
        ]);
        this.notificationTemplates = templates.map((template) => this.toNotificationTemplate(template));
        this.setBackendPageOverride(pageId, this.toNotificationsPage(events.items, events.summary));
        return;
      }

      if (pageId === 'integrations') {
        const response = await this.adminCenterApi.getIntegrationsStatus();
        this.setBackendPageOverride(pageId, this.toIntegrationsPage(response.items, response.readOnly));
        return;
      }

      if (pageId === 'ai-settings') {
        const [runtime, agents, guardrails] = await Promise.all([
          this.adminCenterApi.getAiRuntime(),
          this.adminCenterApi.getAiAgents(),
          this.adminCenterApi.getAiGuardrails(),
        ]);
        this.aiAgents = agents.items.map((agent) => this.toAiAgentDefinition(agent));
        this.setBackendPageOverride(pageId, {
          ...getAdminPage(pageId),
          metrics: [
            { label: 'Provider', value: runtime.provider, note: runtime.runtimeEditable ? 'Editable' : 'Read-only' },
            { label: 'LLM', value: runtime.llmModel, note: 'From appsettings' },
            { label: 'Embedding', value: runtime.embeddingModel, note: `${runtime.embeddingDimensions} dimensions` },
            {
              label: 'Human Review',
              value: guardrails.humanReviewRequired ? 'Required' : 'Optional',
              note: guardrails.decisionBoundary,
            },
          ],
          table: {
            columns: ['Guardrail', 'Value', 'Reason'],
            rows: [
              [
                'Auto Reject',
                guardrails.autoRejectEnabled ? 'Enabled' : 'Disabled',
                guardrails.autoRejectEnabled ? 'Backend allows automatic rejection' : 'AI cannot reject candidates',
              ],
            ],
          },
          cards: [],
          guardrails: [],
        });
        return;
      }

      if (pageId === 'audit-logs') {
        const response = await this.adminCenterApi.listAuditLogs();
        this.setBackendPageOverride(pageId, this.toAuditLogsPage(response.items, response.summary));
        return;
      }

      this.setBackendPageError(pageId, 'The backend endpoint for this screen is not implemented yet.');
    } catch (error) {
      this.setBackendPageError(pageId, error instanceof Error ? error.message : 'Request failed.');
    }
  }

  private setBackendPageOverride(pageId: string, page: AdminPage): void {
    this.backendPageErrors.update((errors) => {
      const next = { ...errors };
      delete next[pageId];
      return next;
    });
    this.backendPageOverrides.update((pages) => ({ ...pages, [pageId]: page }));
  }

  private setBackendPageError(pageId: string, message: string): void {
    this.backendPageOverrides.update((pages) => {
      const next = { ...pages };
      delete next[pageId];
      return next;
    });
    this.backendPageErrors.update((errors) => ({ ...errors, [pageId]: message }));
  }

  private toUsersPage(response: Awaited<ReturnType<AdminCenterApiService['listUsers']>>): AdminPage {
    const base = getAdminPage('users');
    const tenantAdminCount = response.items.filter((user) => user.roleNames.includes('Tenant Admin')).length;

    return {
      ...base,
      metrics: [
        {
          label: 'Internal users',
          value: String(response.summary.internalUserCount),
          note: 'Active accounts',
        },
        {
          label: 'Tenant admins',
          value: String(tenantAdminCount),
          note: 'Admin access users',
        },
        {
          label: 'Bench viewers',
          value: response.summary.benchVisibilityPolicy.roleName,
          note: response.summary.benchVisibilityPolicy.configuredIn,
          configureRoute: '/admin-center/roles-permissions',
          configureLabel: 'Configure',
        },
      ],
      table: {
        columns: ['User', 'Highest Priority Role', 'Account', 'Last Active', 'Actions'],
        rows: response.items.map((user) => [
          user.displayName,
          user.email,
          user.highestPriorityRoleName,
          user.accountStatus,
          this.formatRelativeDate(user.lastActiveAt),
          user.id,
          user.groupNames.join(', '),
        ]),
      },
      cards: [],
      guardrails: [],
    };
  }

  private toRolesPage(
    roles: AdminRoleListItem[],
    summary: Awaited<ReturnType<AdminCenterApiService['listRoles']>>['summary'],
  ): AdminPage {
    const base = getAdminPage('roles-permissions');

    return {
      ...base,
      metrics: [
        { label: 'Roles', value: String(summary.activeRoleCount), note: 'Active tenant roles' },
        { label: 'Protected roles', value: String(summary.protectedRoleCount), note: 'System-owned roles' },
        { label: 'Custom roles', value: String(summary.customRoleCount), note: 'Tenant-created roles' },
      ],
      table: {
        columns: ['Role', 'Type', 'Scope', 'Users', 'Key Permissions', 'Lifecycle', 'Actions'],
        rows: roles.map((role) => [
          role.name,
          role.type,
          role.scope,
          String(role.assignedUserCount),
          role.permissionSummary,
          role.lifecycleStatus,
          role.roleId,
          String(role.isProtected),
          String(role.isBulkAssignable),
        ]),
      },
      cards: [],
      guardrails: [],
    };
  }

  private toGroupsPage(groups: AdminGroupListItem[]): AdminPage {
    const base = getAdminPage('groups');
    const activeGroups = groups.filter((group) => group.status === 'Active');
    const memberCount = groups.reduce((total, group) => total + group.memberCount, 0);
    const emptyGroups = groups.filter((group) => group.memberCount === 0).length;

    return {
      ...base,
      metrics: [
        { label: 'Routing groups', value: String(activeGroups.length), note: 'Active workflow groups' },
        { label: 'Assigned members', value: String(memberCount), note: 'Across routing groups' },
        { label: 'Empty groups', value: String(emptyGroups), note: 'Need fallback review' },
      ],
      table: {
        columns: ['Group', 'Routing Purpose', 'Members', 'Status'],
        rows: groups.map((group) => [
          group.name,
          group.purpose,
          String(group.memberCount),
          group.status,
          group.groupId,
        ]),
      },
      cards: [],
      guardrails: [],
    };
  }

  private toNotificationsPage(
    events: AdminNotificationEventListItem[],
    summary: Awaited<ReturnType<AdminCenterApiService['listNotificationEvents']>>['summary'],
  ): AdminPage {
    const base = getAdminPage('notifications');

    return {
      ...base,
      subtitle: 'Review notification events and editable email templates for recruitment handoffs.',
      metrics: [
        { label: 'Events', value: String(summary.activeEventCount), note: 'Active notification events' },
        { label: 'Email templates', value: String(summary.editableTemplateCount), note: 'Linked templates' },
        { label: 'Pending', value: String(summary.pendingOutboxCount), note: 'Queued deliveries' },
        { label: 'Failed', value: String(summary.failedOutboxCount), note: 'Delivery failures' },
      ],
      table: {
        columns: ['Event', 'Recipient', 'Template', 'Status'],
        rows: events.map((event) => [
          event.eventCode,
          event.recipient,
          event.templateName,
          event.lifecycleStatus,
          event.eventId,
        ]),
      },
      cards: [],
      guardrails: [],
    };
  }

  private toIntegrationsPage(integrations: AdminIntegrationStatusItem[], readOnly: boolean): AdminPage {
    const base = getAdminPage('integrations');
    const enabledCount = integrations.filter((integration) => integration.enabled).length;
    const editableCount = integrations.filter((integration) => integration.editable).length;
    const mockedCount = integrations.filter((integration) => integration.status === 'Mock Only').length;

    return {
      ...base,
      status: readOnly ? 'Read-only' : 'Editable',
      subtitle: 'Review local/free integration contracts used by the MVP. Delivery behavior is owned by backend code, not tenant configuration.',
      metrics: [
        { label: 'Integrations', value: String(integrations.length), note: 'MVP contracts' },
        { label: 'Enabled', value: String(enabledCount), note: 'Active in backend' },
        { label: 'Read-only', value: readOnly ? 'Yes' : 'No', note: 'No credentials required' },
        { label: 'Mocked', value: String(mockedCount), note: 'Demo-only boundaries' },
      ],
      table: {
        columns: ['Integration', 'Category', 'Runtime Mode', 'Delivery Path', 'Runtime Metrics', 'Status'],
        rows: integrations.map((integration) => [
          integration.displayName,
          integration.category,
          integration.runtimeMode,
          integration.deliveryPath,
          this.formatIntegrationMetrics(integration),
          integration.status,
        ]),
      },
      cards: [
        {
          title: 'MVP Boundary',
          lines: [
            'No paid providers, external credentials, or production job-board automation are required.',
            'Notification transport is implemented in backend code and is not configurable from this screen.',
            'LinkedIn publishing remains a mock demonstration until a real approved API path exists.',
          ],
        },
        {
          title: 'After MVP',
          lines: [
            'Add real provider credentials only when approval and security storage are available.',
            'Add health checks for calendar, job-board, parser, and AI provider integrations.',
            'Keep candidate-facing application capture inside Talent Pilot unless a partner API is approved.',
          ],
        },
      ],
      guardrails: [],
    };
  }

  private formatIntegrationMetrics(integration: AdminIntegrationStatusItem): string {
    if (!integration.metrics.length) {
      return integration.editable ? 'Editable' : 'Not editable';
    }

    return integration.metrics.map((metric) => `${metric.name}: ${metric.value}`).join(', ');
  }

  private toAuditLogsPage(
    logs: Awaited<ReturnType<AdminCenterApiService['listAuditLogs']>>['items'],
    summary: Awaited<ReturnType<AdminCenterApiService['listAuditLogs']>>['summary'],
  ): AdminPage {
    const base = getAdminPage('audit-logs');

    return {
      ...base,
      metrics: [
        { label: 'Events today', value: String(summary.eventsToday), note: 'Recent activity' },
        { label: 'Config changes', value: String(summary.configChanges), note: 'Tenant admin actions' },
        { label: 'Workflow decisions', value: String(summary.workflowDecisions), note: 'Recruitment actions' },
        { label: 'AI events', value: String(summary.aiEvents), note: 'Agent activity' },
      ],
      table: {
        columns: ['Time', 'Actor', 'Event', 'Record', 'Area'],
        rows: logs.map((log) => [
          log.occurredAtUtc,
          log.actorDisplayName,
          log.eventSummary,
          log.recordLabel,
          log.area,
          log.id,
        ]),
      },
      cards: [],
      guardrails: [],
    };
  }

  private toRolePermissionOption(permission: PermissionCatalogItem): RolePermissionOption {
    return {
      id: permission.permissionId,
      label: permission.displayName,
      group: permission.groupName,
      description: permission.description,
    };
  }

  private toNotificationTemplate(template: NotificationTemplateSummary): NotificationTemplateDefinition {
    return {
      templateId: template.templateId,
      eventCode: template.eventCode,
      name: template.name,
      subject: template.subject,
      body: template.body,
      recipient: template.recipient,
      variables: template.variables,
      updatedAtUtc: template.updatedAtUtc,
    };
  }

  private toAiAgentDefinition(agent: AdminAiAgentDefinition): AiAgentDefinition {
    return {
      name: agent.displayName,
      responsibility: agent.responsibility,
      input: agent.inputSummary,
      output: agent.outputSummary,
      boundary: agent.mvpBoundary,
    };
  }

  private formatRelativeDate(value?: string | null): string {
    if (!value) {
      return 'Never';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    const today = new Date();
    const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const valueLocal = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const diffDays = Math.round((todayLocal - valueLocal) / 86_400_000);

    if (diffDays === 0) {
      return 'Today';
    }

    if (diffDays === 1) {
      return 'Yesterday';
    }

    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
  }

  private toAuditEventRows(
    logs: Awaited<ReturnType<AdminCenterApiService['listAuditLogs']>>['items'],
  ): AuditEventRow[] {
    return logs.map((log) => ({
      occurredAtUtc: log.occurredAtUtc,
      actor: log.actorDisplayName,
      event: log.eventSummary,
    }));
  }

  private async loadUserAuditEvents(userId: string): Promise<void> {
    if (!userId) {
      return;
    }

    try {
      const query = `entityType=User&entityId=${encodeURIComponent(userId)}`;
      const response = await this.adminCenterApi.listAuditLogs(query);
      this.userAuditEventsByUserId.update((events) => ({
        ...events,
        [userId]: this.toAuditEventRows(response.items),
      }));
    } catch {
      this.userAuditEventsByUserId.update((events) => ({ ...events, [userId]: [] }));
      this.notifications.error('User audit history could not be loaded from the backend.');
    }
  }

  private async loadRoleAuditEvents(roleId: string): Promise<void> {
    if (!roleId) {
      return;
    }

    try {
      const query = `entityType=Role&entityId=${encodeURIComponent(roleId)}`;
      const response = await this.adminCenterApi.listAuditLogs(query);
      this.roleAuditEventsByRoleId.update((events) => ({
        ...events,
        [roleId]: this.toAuditEventRows(response.items),
      }));
    } catch {
      this.roleAuditEventsByRoleId.update((events) => ({ ...events, [roleId]: [] }));
      this.notifications.error('Role audit history could not be loaded from the backend.');
    }
  }

  private async loadBulkAssignmentPreview(actionContext: RoleActionContext): Promise<void> {
    try {
      const response = await this.adminCenterApi.previewRoleAssignments(actionContext.roleId);
      const previewUsers = response.sampleUsers.map((user) => this.toBulkAssignmentPreviewUser(user));
      this.bulkAssignmentPreviewByRoleId.update((previews) => ({
        ...previews,
        [actionContext.roleId]: previewUsers,
      }));
      this.bulkAssignmentSelectedEmails.set(new Set(previewUsers.map((user) => user.email)));
    } catch {
      this.bulkAssignmentPreviewByRoleId.update((previews) => ({ ...previews, [actionContext.roleId]: [] }));
      this.bulkAssignmentSelectedEmails.set(new Set());
      this.notifications.error('Bulk assignment preview could not be loaded from the backend.');
    }
  }

  private toBulkAssignmentPreviewUser(user: RoleUserAssignmentPreviewItem): BulkAssignmentPreviewUser {
    return {
      userId: user.userId,
      name: user.displayName,
      email: user.email,
      department: user.departmentName ?? 'Unassigned',
      currentRole: user.currentHighestPriorityRoleName ?? 'No role assigned',
    };
  }

  permissionTooltip(hasPermission: boolean): string {
    return hasPermission ? '' : 'Your current role does not include permission for this action.';
  }

  openAddUserDialog(): void {
    if (!this.canManageUsers()) {
      this.notifications.error('You do not have permission to manage users.');
      return;
    }

    this.addUserDialogOpen.set(true);
  }

  closeAddUserDialog(): void {
    this.addUserDialogOpen.set(false);
  }

  submitInternalUserInvite(): void {
    if (!this.canManageUsers()) {
      this.notifications.error('You do not have permission to invite users.');
      return;
    }

    this.addUserDialogOpen.set(false);
    this.notifications.info('Invitation queued.');
  }

  openUserAction(action: UserRowAction, row: string[]): void {
    if (!this.canOpenUserAction(action)) {
      this.notifications.error('You do not have permission for this user action.');
      return;
    }

    this.selectedUserAction.set({
      action,
      userId: row[5] ?? '',
      displayName: row[0] ?? '',
      email: row[1] ?? '',
      roleName: row[2] ?? '',
      groupNames: this.userGroupsFromRow(row),
      accountStatus: row[3] ?? '',
      lastActive: row[4] ?? '',
    });

    if (action === 'audit-history') {
      void this.loadUserAuditEvents(row[5] ?? '');
    }
  }

  closeUserAction(): void {
    this.selectedUserAction.set(null);
  }

  confirmUserAction(actionContext: UserActionContext): void {
    if (!this.canConfirmUserAction(actionContext)) {
      this.notifications.error('You do not have permission for this user action.');
      return;
    }

    this.selectedUserAction.set(null);
    this.notifications.info(`${this.userActionPrimaryLabel(actionContext)} saved.`);
  }

  canConfirmUserAction(actionContext: UserActionContext): boolean {
    return this.canOpenUserAction(actionContext.action);
  }

  userActionTitle(actionContext: UserActionContext): string {
    const titles: Record<UserRowAction, string> = {
      'edit-access': 'Edit User Access',
      'resend-invite': 'Resend Invitation',
      'deactivate-user': 'Deactivate User',
      'audit-history': 'User Audit History',
    };

    return titles[actionContext.action];
  }

  userActionPrimaryLabel(actionContext: UserActionContext): string {
    const labels: Record<Exclude<UserRowAction, 'audit-history'>, string> = {
      'edit-access': 'Save Access',
      'resend-invite': 'Send Invite',
      'deactivate-user': 'Deactivate User',
    };

    return actionContext.action === 'audit-history' ? 'Close' : labels[actionContext.action];
  }

  userAuditEvents(actionContext: UserActionContext): AuditEventRow[] {
    return this.userAuditEventsByUserId()[actionContext.userId] ?? [];
  }

  private userGroupsFromRow(row: string[]): string[] {
    return String(row[6] ?? '')
      .split(',')
      .map((group) => group.trim())
      .filter(Boolean);
  }

  handleAdminRowAction(action: string, itemName: string): void {
    const actionRequiresAudit = action.toLowerCase().includes('audit');
    if (actionRequiresAudit && !this.canViewAuditLogs()) {
      this.notifications.error('You do not have permission to view audit history.');
      return;
    }

    if (!actionRequiresAudit && !this.canManageCurrentAdminPage()) {
      this.notifications.error('You do not have permission for this admin action.');
      return;
    }

    this.notifications.info(`${action} for ${itemName} saved.`);
  }

  async handlePageAction(): Promise<void> {
    if (!this.canRunPageAction()) {
      this.notifications.error('You do not have permission for this action.');
      return;
    }

    if (this.isNotificationsPage()) {
      await this.sendTestNotification();
    }
  }

  canRunPageAction(): boolean {
    if (this.isNotificationsPage()) {
      return this.canManageNotifications() && !this.sendingTestNotification();
    }

    if (this.isAuditLogsPage()) {
      return this.canViewAuditLogs();
    }

    return this.canManageCurrentAdminPage();
  }

  async sendTestNotification(): Promise<void> {
    if (!this.canManageNotifications()) {
      this.notifications.error('You do not have permission to send test notifications.');
      return;
    }

    this.sendingTestNotification.set(true);

    try {
      const notification = await this.adminCenterApi.sendTestNotification();
      if (this.store.upsertNotification(notification)) {
        this.notifications.showOperationalNotification(notification);
      }
    } catch (error) {
      this.notifications.error(error instanceof Error ? error.message : 'Test notification could not be sent.');
    } finally {
      this.sendingTestNotification.set(false);
    }
  }

  openNotificationTemplate(template: NotificationTemplateDefinition): void {
    if (!this.canManageNotifications()) {
      this.notifications.error('You do not have permission to edit notification templates.');
      return;
    }

    this.selectedNotificationTemplate.set(template);
  }

  closeNotificationTemplate(): void {
    this.selectedNotificationTemplate.set(null);
  }

  saveNotificationTemplate(template: NotificationTemplateDefinition): void {
    if (!this.canManageNotifications()) {
      this.notifications.error('You do not have permission to edit notification templates.');
      return;
    }

    this.selectedNotificationTemplate.set(null);
    this.notifications.info(`${template.name} template saved.`);
  }

  openAddRoleDialog(): void {
    if (!this.canManageRoles()) {
      this.notifications.error('You do not have permission to manage roles.');
      return;
    }

    this.addRoleDialogOpen.set(true);
  }

  closeAddRoleDialog(): void {
    this.addRoleDialogOpen.set(false);
  }

  submitRole(): void {
    if (!this.canManageRoles()) {
      this.notifications.error('You do not have permission to save roles.');
      return;
    }

    this.addRoleDialogOpen.set(false);
    this.notifications.info('Role saved.');
  }

  openRoleAction(action: RoleRowAction, row: string[]): void {
    if (!this.canOpenRoleAction(action)) {
      this.notifications.error('You do not have permission for this role action.');
      return;
    }

    const status = row[5] ?? '';
    const type = row[1] ?? '';
    const scope = row[2] ?? '';
    const roleId = row[6] ?? '';
    const isProtected = row[7] === 'true' || type === 'System' || scope === 'Platform' || scope === 'Portal';

    const roleAction: RoleActionContext = {
      action,
      roleId,
      name: row[0] ?? '',
      type,
      scope,
      userCount: row[3] ?? '0',
      permissionSummary: row[4] ?? '',
      status,
      protectedRole: isProtected,
      isBulkAssignable: row[8] === 'true',
    };

    this.selectedRoleAction.set(roleAction);

    if (action === 'bulk-assign-users' && this.roleBulkAssignmentAllowed(roleAction)) {
      void this.loadBulkAssignmentPreview(roleAction);
    } else {
      this.bulkAssignmentSelectedEmails.set(new Set());
    }

    if (action === 'audit-history') {
      void this.loadRoleAuditEvents(roleId);
    }
  }

  closeRoleAction(): void {
    this.selectedRoleAction.set(null);
    this.bulkAssignmentSelectedEmails.set(new Set());
  }

  confirmRoleAction(actionContext: RoleActionContext): void {
    if (!this.canOpenRoleAction(actionContext.action)) {
      this.notifications.error('You do not have permission for this role action.');
      return;
    }

    const selectedCount = this.bulkAssignmentSelectedCount(actionContext);
    this.selectedRoleAction.set(null);
    if (actionContext.action === 'bulk-assign-users') {
      this.bulkAssignmentSelectedEmails.set(new Set());
      this.notifications.info(`${actionContext.name} assignment queued for ${selectedCount} users.`);
      return;
    }

    this.notifications.info(`${actionContext.name} role saved.`);
  }

  roleActionTitle(actionContext: RoleActionContext): string {
    const titles: Record<RoleRowAction, string> = {
      'edit-role': actionContext.protectedRole ? 'Role Details' : 'Edit Role',
      'bulk-assign-users': 'Bulk Assign Users',
      'view-permissions': 'Role Permissions',
      'audit-history': 'Role Audit History',
    };

    return titles[actionContext.action];
  }

  roleBulkAssignmentAllowed(actionContext: RoleActionContext): boolean {
    return actionContext.scope === 'Tenant' && !actionContext.protectedRole && actionContext.isBulkAssignable;
  }

  private canOpenUserAction(action: UserRowAction): boolean {
    return action === 'audit-history' ? this.canViewAuditLogs() : this.canManageUsers();
  }

  private canOpenRoleAction(action: RoleRowAction): boolean {
    return action === 'audit-history' ? this.canViewAuditLogs() : this.canManageRoles();
  }

  roleTypeTooltip(type: string, scope: string): string {
    if (type === 'System') {
      return scope === 'Portal'
        ? 'Application-owned portal role. Tenant admins can review it, but cannot edit or bulk assign it.'
        : 'Application-owned role. Tenant admins can review it, but cannot edit or bulk assign it.';
    }

    if (type === 'Custom') {
      return 'Tenant-created role that admins can edit and assign.';
    }

    return 'Tenant-managed role that admins can edit and assign.';
  }

  bulkAssignmentAllSelected(actionContext: RoleActionContext): boolean {
    const users = this.bulkAssignmentPreviewUsers(actionContext);
    const selectedEmails = this.bulkAssignmentSelectedEmails();

    return users.length > 0 && users.every((user) => selectedEmails.has(user.email));
  }

  bulkAssignmentSelectedCount(actionContext: RoleActionContext): number {
    const previewEmails = new Set(this.bulkAssignmentPreviewUsers(actionContext).map((user) => user.email));

    return [...this.bulkAssignmentSelectedEmails()].filter((email) => previewEmails.has(email)).length;
  }

  bulkAssignmentUserSelected(email: string): boolean {
    return this.bulkAssignmentSelectedEmails().has(email);
  }

  toggleBulkAssignmentAll(actionContext: RoleActionContext, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;

    this.bulkAssignmentSelectedEmails.set(
      checked ? new Set(this.bulkAssignmentPreviewUsers(actionContext).map((user) => user.email)) : new Set(),
    );
  }

  toggleBulkAssignmentUser(email: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const selectedEmails = new Set(this.bulkAssignmentSelectedEmails());

    if (checked) {
      selectedEmails.add(email);
    } else {
      selectedEmails.delete(email);
    }

    this.bulkAssignmentSelectedEmails.set(selectedEmails);
  }

  bulkAssignmentPreviewCount(actionContext: RoleActionContext): number {
    return this.bulkAssignmentPreviewUsers(actionContext).length;
  }

  bulkAssignmentPreviewUsers(actionContext: RoleActionContext): BulkAssignmentPreviewUser[] {
    return this.bulkAssignmentPreviewByRoleId()[actionContext.roleId] ?? [];
  }

  roleHasPermission(actionContext: RoleActionContext, permission: RolePermissionOption): boolean {
    const summary = actionContext.permissionSummary.toLowerCase();
    const roleName = actionContext.name.toLowerCase();

    if (actionContext.name === 'Super Admin') {
      return true;
    }

    if (roleName.includes('tenant admin')) {
      return this.roleIncludesPermission(permission, [
        Permission.ManageAdminCenter,
        Permission.ManageUsers,
        Permission.ManageRoles,
        Permission.ViewAuditLogs,
        Permission.ManageTenantProfile,
        Permission.ManageNotifications,
        Permission.ViewAiSettings,
        Permission.ViewJobRequests,
        Permission.CreateJobRequests,
        Permission.ClaimWorkflowTasks,
        Permission.ViewBenchMatches,
        Permission.ManageCandidates,
        Permission.ManageInterviews,
        Permission.ManageHiringDecisions,
      ]);
    }

    if (roleName.includes('presales')) {
      return this.roleIncludesPermission(permission, [Permission.ViewJobRequests, Permission.CreateJobRequests]);
    }

    if (roleName.includes('pmo')) {
      return this.roleIncludesPermission(permission, [
        Permission.ViewJobRequests,
        Permission.ClaimWorkflowTasks,
        Permission.ViewBenchMatches,
      ]);
    }

    if (roleName.includes('recruiter')) {
      return this.roleIncludesPermission(permission, [
        Permission.ViewJobRequests,
        Permission.ClaimWorkflowTasks,
        Permission.ManageCandidates,
        Permission.ManageInterviews,
      ]);
    }

    if (roleName.includes('hiring manager')) {
      return this.roleIncludesPermission(permission, [
        Permission.ViewJobRequests,
        Permission.ClaimWorkflowTasks,
        Permission.ManageHiringDecisions,
      ]);
    }

    if (roleName.includes('interviewer')) {
      return this.roleIncludesPermission(permission, [Permission.ClaimWorkflowTasks, Permission.ManageInterviews]);
    }

    if (roleName.includes('candidate')) {
      return false;
    }

    return summary.includes(permission.label.toLowerCase().split(' ')[0]);
  }

  private roleIncludesPermission(permission: RolePermissionOption, permissions: readonly string[]): boolean {
    return permissions.includes(permission.id);
  }

  permissionResolutionLabel(): string {
    return this.permissionResolutionMode() === 'merge' ? 'Merged effective permissions' : 'Highest-priority role only';
  }

  roleAuditEvents(actionContext: RoleActionContext): AuditEventRow[] {
    return this.roleAuditEventsByRoleId()[actionContext.roleId] ?? [];
  }

  setActiveTenantTab(tab: TenantProfileTab): void {
    this.activeTenantTab.set(tab);
  }

  setActiveWorkflowTab(tab: WorkflowTab): void {
    this.activeWorkflowTab.set(tab);
  }

  setActiveAiSettingsTab(tab: AiSettingsTab): void {
    this.activeAiSettingsTab.set(tab);
  }

  setPermissionResolutionMode(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as PermissionResolutionMode;
    this.permissionResolutionMode.set(value);
  }

  savePermissionResolutionPolicy(): void {
    this.notifications.info('Permission resolution policy saved.');
  }

  setPrimaryColor(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.tenantProfileForm.controls.primaryColor.setValue(input.value.toUpperCase());
    this.tenantProfileForm.controls.primaryColor.markAsDirty();
  }

  adminMetricIcon(index: number): string {
    if (this.isUsersPage()) {
      return ['group', 'hub', 'visibility'][index] ?? 'insights';
    }

    if (this.isGroupsPage()) {
      return ['hub', 'sync_alt', 'admin_panel_settings', 'verified_user'][index] ?? 'insights';
    }

    if (this.isDepartmentsPage()) {
      return ['domain', 'manage_search', 'work', 'assignment_ind'][index] ?? 'insights';
    }

    if (this.isSkillsPage()) {
      return ['psychology', 'account_tree', 'fact_check', 'edit_note'][index] ?? 'insights';
    }

    if (this.isHiringPipelinePage()) {
      return ['account_tree', 'work', 'route', 'rule_settings'][index] ?? 'insights';
    }

    if (this.isNotificationsPage()) {
      return ['mark_email_unread', 'notifications_active', 'edit_note', 'account_tree'][index] ?? 'insights';
    }

    if (this.isAiSettingsPage()) {
      return ['smart_toy', 'memory', 'database', 'verified_user'][index] ?? 'insights';
    }

    if (this.isIntegrationsPage()) {
      return ['extension', 'check_circle', 'lock', 'edit_off'][index] ?? 'insights';
    }

    if (this.isAuditLogsPage()) {
      return ['event_note', 'manage_accounts', 'account_tree', 'smart_toy'][index] ?? 'insights';
    }

    return ['business', 'groups', 'admin_panel_settings', 'settings_suggest'][index] ?? 'insights';
  }

  roleMetricIcon(index: number): string {
    return ['shield', 'groups', 'account_tree'][index] ?? 'security';
  }

  adminDetailsTitle(): string {
    const titles: Record<string, string> = {
      groups: 'Routing Groups',
      departments: 'Departments',
      skills: 'Skill Dictionary',
      'hiring-pipeline': 'Interview Stage Templates',
      notifications: 'Notification Events',
      integrations: 'MVP Integration Status',
      'audit-logs': 'Audit Log Entries',
    };

    return titles[this.page().id] ?? `${this.page().title} Details`;
  }

  adminDetailsStatus(): string {
    return this.page().status ?? '';
  }

  showPageAction(): boolean {
    return !this.isIntegrationsPage();
  }

  pageActionLabel(): string {
    const actions: Record<string, string> = {
      groups: 'Create Group',
      departments: 'Add Department',
      skills: 'Add Skill',
      'hiring-pipeline': 'Create Template',
      notifications: this.sendingTestNotification() ? 'Sending...' : 'Send Test',
      'ai-settings': 'View Runtime',
      'audit-logs': 'Export Logs',
    };

    return actions[this.page().id] ?? 'Add Item';
  }

  pageActionIcon(): string {
    const icons: Record<string, string> = {
      notifications: 'send',
      'ai-settings': 'visibility',
      'audit-logs': 'download',
    };

    return icons[this.page().id] ?? 'add';
  }

  pageActionTooltip(): string {
    const tooltips: Record<string, string> = {
      'ai-settings': 'Shows the AI runtime currently configured in appsettings, including the LLM and embedding model. These values are read-only here.',
      notifications: 'Send a backend-generated test notification to the current admin user.',
    };

    return tooltips[this.page().id] ?? '';
  }

  isStatusValue(value: string): boolean {
    return [
      'Active',
      'Inactive',
      'Custom',
      'Protected',
      'Disabled',
      'Enabled',
      'Invited',
      'Available',
      'Contracted',
      'Mock Only',
      'In-App Available',
      'Degraded',
      'Read-only',
      'Not editable',
      'Editable',
    ].includes(value);
  }

  isSuccessStatus(value: string): boolean {
    return ['Active', 'Enabled', 'Available', 'Contracted', 'In-App Available'].includes(value);
  }

  isWarningStatus(value: string): boolean {
    return ['Degraded', 'Mock Only'].includes(value);
  }

  isCustomStatus(value: string): boolean {
    return ['Custom', 'Protected', 'Read-only', 'Not editable', 'Editable', 'Invited'].includes(value);
  }

  isCodeLike(value: string): boolean {
    return value.includes('_') || /^[A-Z][A-Z0-9_]+$/.test(value);
  }

  isPipelineStageCell(cellIndex: number): boolean {
    return this.isHiringPipelinePage() && cellIndex === 1;
  }

  isAuditTimestampCell(cellIndex: number): boolean {
    return this.isAuditLogsPage() && cellIndex === 0;
  }

  formatAuditTimestamp(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }

  auditTimestampTooltip(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return `Stored UTC: ${date.toISOString()}`;
  }

  stageSteps(value: string): string[] {
    return value
      .split(/\s*->\s*/)
      .map((stage) => stage.trim())
      .filter(Boolean);
  }

  workflowAssignmentIcon(assignmentType: string): string {
    return assignmentType === 'Group' ? 'group' : 'hub';
  }

  userInitials(name: string): string {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  async saveTenantProfile(): Promise<void> {
    if (!this.canManageTenantProfile()) {
      this.formMessageIsError.set(true);
      this.formMessage.set('You do not have permission to update tenant settings.');
      this.notifications.error(this.formMessage());
      return;
    }

    if (this.tenantProfileForm.invalid) {
      this.tenantProfileForm.markAllAsTouched();
      this.formMessageIsError.set(true);
      this.formMessage.set('Fix validation errors before saving tenant settings.');
      return;
    }

    this.saving.set(true);
    this.formMessage.set('');

    try {
      const saved = await this.adminSettingsApi.updateTenantProfile(this.tenantProfileForm.getRawValue());
      this.patchTenantProfileForm(saved);
      this.formMessageIsError.set(false);
      this.formMessage.set('Tenant settings saved.');
      this.notifications.success('Tenant settings saved.');
    } catch (error) {
      this.formMessageIsError.set(true);
      this.formMessage.set(error instanceof Error ? error.message : 'Tenant settings could not be saved.');
      this.notifications.error(this.formMessage());
    } finally {
      this.saving.set(false);
    }
  }

  async resetTenantProfileForm(): Promise<void> {
    if (!this.canManageTenantProfile()) {
      this.notifications.error('You do not have permission to reset tenant settings.');
      return;
    }

    const saved = await this.adminSettingsApi.resetTenantProfileToSaved();
    this.patchTenantProfileForm(saved);
    this.formMessageIsError.set(false);
    this.formMessage.set('Unsaved tenant changes were reset.');
    this.notifications.info('Unsaved tenant changes were reset.');
  }

  private patchTenantProfileForm(saved: TenantProfileSettings): void {
    this.tenantProfileForm.reset({
      displayName: saved.displayName,
      slug: saved.slug,
      domain: saved.domain,
      adminContactEmail: saved.adminContactEmail,
      defaultTimezone: saved.defaultTimezone,
      defaultCurrency: saved.defaultCurrency,
      status: saved.status,
      careerDisplayName: saved.careerDisplayName,
      primaryColor: saved.primaryColor,
      candidateLoginRequired: saved.candidateLoginRequired,
      candidateCvFormat: saved.candidateCvFormat,
      publicJobsEnabled: saved.publicJobsEnabled,
      inviteExpiryDays: saved.inviteExpiryDays,
      reapplyCooldownDays: saved.reapplyCooldownDays,
    });
  }
}
