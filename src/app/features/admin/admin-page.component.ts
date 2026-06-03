import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, ParamMap, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, startWith } from 'rxjs';
import { AdminCreateDepartmentDialogComponent } from './admin-create-department-dialog.component';
import { AdminCreateGroupDialogComponent } from './admin-create-group-dialog.component';
import { AdminCreateSkillDialogComponent } from './admin-create-skill-dialog.component';
import { AdminGroupMembershipDialogComponent } from './admin-group-membership-dialog.component';
import { AdminInterviewTemplateDialogComponent } from './admin-interview-template-dialog.component';
import { AdminPage, AdminTable, getAdminPage } from './admin-center.data';
import { AdminPaginationComponent } from './components/admin-pagination/admin-pagination.component';
import { AdminTableToolbarComponent } from './components/admin-table-toolbar/admin-table-toolbar.component';
import {
  ADMIN_LIST_PAGE_SIZE_OPTIONS,
  DEFAULT_ADMIN_LIST_PAGE_SIZE,
  MAX_LOGO_BYTES,
  SUPPORTED_LOGO_CONTENT_TYPES,
} from './constants/admin-page.constants';
import {
  AccessOption,
  AdminGroupMembershipDialogContext,
  AdminListState,
  AiAgentDefinition,
  AiSettingsTab,
  AuditEventRow,
  AuditLogFilter,
  BulkAssignmentPreviewUser,
  NotificationChannelTab,
  NotificationTemplateDefinition,
  PermissionResolutionMode,
  RoleActionContext,
  RolePermissionOption,
  RoleRowAction,
  TenantProfileTab,
  TimezoneOption,
  UserActionContext,
  UserRowAction,
} from './models/admin-page.models';
import { buildTimezoneOptions, timezoneValidator } from './utils/timezone-options';
import { AdminSettingsApiService } from '../../core/admin-settings-api.service';
import { AuthService } from '../../core/auth.service';
import { GoogleCalendarApiService, GoogleCalendarConnectionStatus } from '../../core/google-calendar-api.service';
import {
  AdminAiAgentDefinition,
  AdminAiRuntimeResponse,
  AdminSemanticSimilarityHealthResponse,
  AdminCandidateSourceListItem,
  AdminCenterApiService,
  AdminDepartmentListItem,
  AdminGroupListItem,
  AdminHiringPipelineTemplateDetails,
  AdminHiringPipelineTemplateItem,
  AdminListQuery,
  AdminNotificationOutboxItem,
  AdminNotificationWorkerStatus,
  AdminRoleListItem,
  AdminSkillListItem,
  AdminUserListItem,
  AdminWorkflowConfigurationResponse,
  AdminWorkflowIntakeRoutingRuleItem,
  NotificationTemplateSummary,
  NotificationEmailSenderProviderConfiguration,
  PermissionCatalogItem,
  RoleUserAssignmentPreviewItem,
} from '../../core/admin-center-api.service';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  CandidateCvFormat,
  NotificationEmailProvider,
  TenantCurrency,
  TenantProfileSettings,
  TenantStatus,
  UpdateTenantProfileSettingsInput,
} from '../../core/models';
import { Permission } from '../../core/permissions';
import { FileDownloadService } from '../../core/services/file-download.service';
import { NotificationService } from '../../core/services/notification.service';
import { PermissionService } from '../../core/services/permission.service';
import { RealtimeNotificationService } from '../../core/services/realtime-notification.service';
import { TalentPilotStoreService } from '../../core/talent-pilot-store.service';

@Component({
  selector: 'app-admin-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    AdminCreateDepartmentDialogComponent,
    AdminCreateGroupDialogComponent,
    AdminCreateSkillDialogComponent,
    AdminGroupMembershipDialogComponent,
    AdminInterviewTemplateDialogComponent,
    AdminPaginationComponent,
    AdminTableToolbarComponent,
    MatButtonModule,
    MatCardModule,
    MatSlideToggleModule,
    MatTooltipModule,
  ],
  templateUrl: './admin-page.component.html',
  styleUrl: './admin-page.component.scss',
})
export class AdminPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder);
  private readonly adminSettingsApi = inject(AdminSettingsApiService);
  private readonly adminCenterApi = inject(AdminCenterApiService);
  private readonly googleCalendarApi = inject(GoogleCalendarApiService);
  private readonly auth = inject(AuthService);
  private readonly notifications = inject(NotificationService);
  private readonly fileDownloads = inject(FileDownloadService);
  private readonly permissionService = inject(PermissionService);
  private readonly realtimeNotifications = inject(RealtimeNotificationService);
  private readonly store = inject(TalentPilotStoreService);
  private readonly pageId = toSignal(this.route.paramMap.pipe(map((params) => params.get('pageId'))), {
    initialValue: 'tenant-profile',
  });
  private readonly auditLogFilter = toSignal(
    this.route.queryParamMap.pipe(map((params) => this.toAuditLogFilter(params))),
    {
      initialValue: this.toAuditLogFilter(this.route.snapshot.queryParamMap),
    },
  );
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
    companyAddress: [this.savedTenantProfile().companyAddress ?? ''],
    companyCity: [this.savedTenantProfile().companyCity ?? ''],
    companyCountry: [this.savedTenantProfile().companyCountry ?? ''],
    officialEmail: [this.savedTenantProfile().officialEmail ?? '', [Validators.email]],
    officialPhone: [this.savedTenantProfile().officialPhone ?? ''],
    primaryColor: [this.savedTenantProfile().primaryColor, [Validators.required, Validators.pattern(/^#[0-9a-f]{6}$/i)]],
    candidateLoginRequired: [this.savedTenantProfile().candidateLoginRequired],
    candidateCvFormat: [this.savedTenantProfile().candidateCvFormat as CandidateCvFormat, [Validators.required]],
    publicJobsEnabled: [this.savedTenantProfile().publicJobsEnabled],
    inviteExpiryDays: [this.savedTenantProfile().inviteExpiryDays, [Validators.required, Validators.min(1), Validators.max(30)]],
    reapplyCooldownDays: [
      this.savedTenantProfile().reapplyCooldownDays,
      [Validators.required, Validators.min(1), Validators.max(365)],
    ],
    notificationEmailProvider: [
      this.savedTenantProfile().notificationEmailProvider as NotificationEmailProvider,
      [Validators.required],
    ],
  });

  private readonly backendPageOverrides = signal<Record<string, AdminPage>>({});
  private readonly backendPageErrors = signal<Record<string, string>>({});
  private readonly adminListStates = signal<Record<string, AdminListState>>({});
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
  readonly isNotificationOutboxPage = computed(() => this.page().id === 'notification-outbox');
  readonly isAiSettingsPage = computed(() => this.page().id === 'ai-settings');
  readonly isCandidateSourcesPage = computed(() => this.page().id === 'candidate-sources');
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
  readonly canSendNotificationTestEmail = computed(() => this.auth.isAdmin());
  readonly canSendNotificationRealtimeTest = computed(() => this.auth.isAdmin());
  readonly realtimeConnectionStatus = this.realtimeNotifications.status;
  readonly canManageCurrentAdminPage = computed(() => this.permissionService.canAccessAdminPage(this.page().id));
  readonly saving = signal(false);
  readonly formMessage = signal('');
  readonly formMessageIsError = signal(false);
  readonly companyLogoPreviewUrl = signal<string | null>(null);
  readonly companyLogoFileName = signal('');
  private readonly companyLogoContentType = signal<string | null>(null);
  private readonly companyLogoContentBase64 = signal<string | null>(null);
  readonly companyLogoDirty = signal(false);
  readonly addUserDialogOpen = signal(false);
  readonly selectedUserAction = signal<UserActionContext | null>(null);
  readonly userActionSaving = signal(false);
  readonly addRoleDialogOpen = signal(false);
  readonly selectedRoleAction = signal<RoleActionContext | null>(null);
  readonly bulkAssignmentSelectedEmails = signal<Set<string>>(new Set());
  readonly createGroupDialogOpen = signal(false);
  readonly createDepartmentDialogOpen = signal(false);
  readonly createSkillDialogOpen = signal(false);
  readonly selectedSkillForEdit = signal<AdminSkillListItem | null>(null);
  readonly skillDeleteTarget = signal<AdminSkillListItem | null>(null);
  readonly skillActionSaving = signal(false);
  readonly selectedGroupMembership = signal<AdminGroupMembershipDialogContext | null>(null);
  readonly selectedInterviewTemplate = signal<AdminHiringPipelineTemplateDetails | null>(null);
  readonly selectedNotificationTemplate = signal<NotificationTemplateDefinition | null>(null);
  readonly notificationTemplateSaving = signal(false);
  readonly notificationOutboxSummary = signal({
    pendingOutboxCount: 0,
    sentOutboxCount: 0,
    failedOutboxCount: 0,
  });
  readonly notificationOutboxItems = signal<AdminNotificationOutboxItem[]>([]);
  readonly notificationOutboxTotalCount = signal(0);
  readonly selectedNotificationOutboxItem = signal<AdminNotificationOutboxItem | null>(null);
  readonly notificationOutboxRetryingIds = signal<Set<string>>(new Set());
  readonly notificationWorkerStatus = signal<AdminNotificationWorkerStatus>(this.defaultNotificationWorkerStatus());
  readonly testEmailRecipient = signal('');
  readonly testEmailSending = signal(false);
  readonly realtimeTestSending = signal(false);
  readonly realtimeConnectedClientCount = signal<number | null>(null);
  readonly notificationEmailSenderConfigurations = signal<NotificationEmailSenderProviderConfiguration[]>([]);
  readonly googleCalendarStatus = signal<GoogleCalendarConnectionStatus | null>(null);
  readonly googleCalendarConnecting = signal(false);
  readonly workflowIntakeRoutingRules = signal<AdminWorkflowIntakeRoutingRuleItem[]>([]);
  readonly workflowIntakeRoutingSaving = signal(false);
  readonly realtimeConnectedClientCountLabel = computed(() => {
    const count = this.realtimeConnectedClientCount();
    return count === null ? 'Checking...' : String(count);
  });
  readonly activeTenantTab = signal<TenantProfileTab>('profile');
  readonly activeAiSettingsTab = signal<AiSettingsTab>('runtime');
  readonly activeNotificationTab = signal<NotificationChannelTab>('email');
  readonly permissionResolutionMode = signal<PermissionResolutionMode>('merge');
  readonly timezoneOptions = buildTimezoneOptions(this.savedTenantProfile().defaultTimezone);
  notificationTemplates: NotificationTemplateDefinition[] = [];
  userRoleOptions: string[] = [];
  userRoleChoices: AccessOption[] = [];
  routingGroupOptions: string[] = [];
  routingGroupChoices: AccessOption[] = [];
  workflowIntakeUserChoices: AccessOption[] = [];
  workflowIntakeGroupChoices: AccessOption[] = [];
  readonly accountStatusOptions = ['Active', 'Invited', 'Disabled'];
  readonly notificationEmailProviderOptions: Array<{ value: NotificationEmailProvider; label: string }> = [
    { value: 'Resend', label: 'Resend' },
    { value: 'MicrosoftGraph', label: 'Microsoft Graph' },
  ];
  readonly adminListPageSizeOptions = ADMIN_LIST_PAGE_SIZE_OPTIONS;
  rolePermissionOptions: RolePermissionOption[] = [];
  interviewTemplateDepartmentChoices: AccessOption[] = [];
  interviewTemplateInterviewerChoices: AdminUserListItem[] = [];
  readonly defaultNewRolePermissions: string[] = [];
  private readonly tenantProfileFormValue = toSignal(
    this.tenantProfileForm.valueChanges.pipe(
      startWith(this.tenantProfileForm.getRawValue()),
    ),
    {
      initialValue: this.tenantProfileForm.getRawValue(),
    },
  );
  readonly tenantDraft = computed(() => ({
    ...this.savedTenantProfile(),
    ...this.tenantProfileFormValue(),
  }));
  readonly selectedNotificationEmailSenderConfiguration = computed(() => {
    const selectedProvider =
      this.tenantProfileFormValue().notificationEmailProvider ?? this.savedTenantProfile().notificationEmailProvider;

    return this.notificationEmailSenderConfigurations().find(
      (configuration) => configuration.provider === selectedProvider,
    ) ?? null;
  });
  readonly tenantAuditQueryParams = computed(() => ({
    area: 'Admin Center',
    entityType: 'Tenant',
    entityId: this.tenantDraft().tenantId,
  }));
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
  readonly workflowIntakeColumnGuides: Array<{ column: string; description: string }> = [
    {
      column: 'Department',
      description: 'The department selected on a new Job Request, such as Engineering or QA.',
    },
    {
      column: 'Recipient Type',
      description: 'Choose whether the configured PMO recipient is a user or group.',
    },
    {
      column: 'Target',
      description:
        'The PMO user or PMO group that receives new requests created by Presales users. PMO group names come from Groups.',
    },
    {
      column: 'Status',
      description: 'Active routes apply to new requests created by Presales users.',
    },
  ];
  readonly aiSettingsTabs: Array<{ id: AiSettingsTab; label: string }> = [
    { id: 'runtime', label: 'Runtime & Guardrails' },
    { id: 'agents', label: 'AI Agents' },
  ];
  readonly notificationTabs: Array<{ id: NotificationChannelTab; label: string; icon: string }> = [
    { id: 'email', label: 'Email Notifications', icon: 'mail' },
    { id: 'realtime', label: 'Realtime Notifications', icon: 'sensors' },
  ];
  readonly notificationOutboxStatusOptions = [
    { value: '', label: 'All statuses' },
    { value: 'Failed', label: 'Failed' },
    { value: 'Sent', label: 'Sent' },
    { value: 'Pending', label: 'Pending' },
    { value: 'Processing', label: 'Processing' },
  ];
  readonly activeAiAgentCount = signal(0);
  readonly aiDecisionBoundary = signal('');
  aiAgents: AiAgentDefinition[] = [];

  constructor() {
    effect(() => {
      const profile = this.savedTenantProfile();
      if (!profile.tenantId) {
        return;
      }

      if (this.tenantProfileForm.pristine) {
        this.patchTenantProfileForm(profile);
        this.patchCompanyLogoPreview(profile);
        return;
      }

      this.patchPristineTenantProfileControls(profile);
      if (!this.companyLogoDirty()) {
        this.patchCompanyLogoPreview(profile);
      }
    });

    effect(() => {
      const id = this.pageId() ?? 'tenant-profile';
      if (this.requiresBackendData(id)) {
        const auditLogFilter = id === 'audit-logs' ? this.auditLogFilter() : {};
        untracked(() => void this.loadBackendPage(id, auditLogFilter));
      }
    });

    effect(() => {
      const isNotificationsPage = (this.pageId() ?? 'tenant-profile') === 'notifications';
      const canSendRealtimeTest = this.canSendNotificationRealtimeTest();
      const connectionStatus = this.realtimeConnectionStatus();
      if (isNotificationsPage && canSendRealtimeTest && connectionStatus === 'Connected') {
        void this.refreshRealtimeConnectionStatus();
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
        : 'Loading...',
      status: error ? 'Backend required' : 'Loading',
      metrics: [],
      cards: [],
      table: undefined,
      guardrails: [],
    };
  }

  private async loadBackendPage(pageId: string, auditLogFilter: AuditLogFilter = {}): Promise<void> {
    try {
      const listQuery = this.toAdminListQuery(pageId);
      if (pageId !== 'notification-outbox') {
        this.selectedNotificationOutboxItem.set(null);
      }

      if (pageId === 'users') {
        const [response, roles, groups] = await Promise.all([
          this.adminCenterApi.listUsers(listQuery),
          this.adminCenterApi.listRoles({ page: 1, pageSize: 100 }),
          this.adminCenterApi.listGroups({ page: 1, pageSize: 100 }),
        ]);
        this.userRoleOptions = roles.items.map((role) => role.name);
        this.userRoleChoices = roles.items.map((role) => ({ id: role.roleId, name: role.name }));
        this.routingGroupOptions = groups.items.map((group) => group.name);
        this.routingGroupChoices = groups.items.map((group) => ({ id: group.groupId, name: group.name }));
        this.setListResult(pageId, response.page, response.pageSize, response.totalCount);
        this.setBackendPageOverride(pageId, this.toUsersPage(response));
        return;
      }

      if (pageId === 'roles-permissions') {
        const [roles, permissions, policy] = await Promise.all([
          this.adminCenterApi.listRoles(listQuery),
          this.adminCenterApi.listPermissions(),
          this.adminCenterApi.getPermissionResolutionPolicy(),
        ]);
        this.rolePermissionOptions = permissions
          .filter((permission) => permission.status === 'Active')
          .map((permission) => this.toRolePermissionOption(permission));
        this.permissionResolutionMode.set(
          policy.mode === 'HighestPriorityRoleOnly' ? 'highest-priority' : 'merge',
        );
        this.setListResult(pageId, roles.page, roles.pageSize, roles.totalCount);
        this.setBackendPageOverride(pageId, this.toRolesPage(roles.items, roles.summary));
        return;
      }

      if (pageId === 'groups') {
        const response = await this.adminCenterApi.listGroups(listQuery);
        this.routingGroupOptions = response.items.map((group) => group.name);
        this.routingGroupChoices = response.items.map((group) => ({ id: group.groupId, name: group.name }));
        this.setListResult(pageId, response.page, response.pageSize, response.totalCount);
        this.setBackendPageOverride(pageId, this.toGroupsPage(response.items));
        return;
      }

      if (pageId === 'departments') {
        const response = await this.adminCenterApi.listDepartments(listQuery);
        this.setListResult(pageId, response.page, response.pageSize, response.totalCount);
        this.setBackendPageOverride(pageId, this.toDepartmentsPage(response.items, response.summary));
        return;
      }

      if (pageId === 'skills') {
        const response = await this.adminCenterApi.listSkills(listQuery);
        this.setListResult(pageId, response.page, response.pageSize, response.totalCount);
        this.setBackendPageOverride(pageId, this.toSkillsPage(response.items, response.summary));
        return;
      }

      if (pageId === 'hiring-pipeline') {
        const response = await this.adminCenterApi.listHiringPipelineTemplates(listQuery);
        this.setListResult(pageId, response.page, response.pageSize, response.totalCount);
        this.setBackendPageOverride(pageId, this.toHiringPipelinePage(response.items, response.summary));
        return;
      }

      if (pageId === 'workflows') {
        const [response, users, groups] = await Promise.all([
          this.adminCenterApi.getWorkflowConfiguration(),
          this.adminCenterApi.listUsers({ page: 1, pageSize: 200, includeInactive: false }),
          this.adminCenterApi.listGroups({ page: 1, pageSize: 200, includeInactive: false }),
        ]);
        this.workflowIntakeUserChoices = users.items
          .filter((user) => user.accountStatus === 'Active')
          .map((user) => ({ id: user.id, name: user.displayName }));
        const activeWorkflowGroups = groups.items
          .filter((group) => group.status === 'Active')
          .sort((left, right) => left.name.localeCompare(right.name));
        const pmoIntakeGroups = activeWorkflowGroups.filter((group) => this.isPmoIntakeGroupName(group.name));
        this.workflowIntakeGroupChoices = (pmoIntakeGroups.length > 0 ? pmoIntakeGroups : activeWorkflowGroups)
          .map((group) => ({ id: group.groupId, name: group.name }));
        this.workflowIntakeRoutingRules.set(response.intakeRoutingRules);
        this.setBackendPageOverride(pageId, this.toWorkflowsPage(response));
        return;
      }

      if (pageId === 'notifications') {
        const [templates, outbox] = await Promise.all([
          this.adminCenterApi.listNotificationTemplates(listQuery),
          this.adminCenterApi
            .listNotificationOutbox({ page: 1, pageSize: 1 })
            .catch(() => ({
              workerStatus: this.unavailableNotificationWorkerStatus(),
              items: [],
              page: 1,
              pageSize: 1,
              totalCount: 0,
            })),
        ]);
        this.notificationTemplates = templates.items.map((template) => this.toNotificationTemplate(template));
        this.notificationOutboxSummary.set({
          pendingOutboxCount: templates.summary.pendingOutboxCount ?? 0,
          sentOutboxCount: templates.summary.sentOutboxCount ?? 0,
          failedOutboxCount: templates.summary.failedOutboxCount ?? 0,
        });
        this.notificationWorkerStatus.set(outbox.workerStatus ?? this.defaultNotificationWorkerStatus());
        this.notificationOutboxItems.set(outbox.items);
        this.notificationOutboxTotalCount.set(outbox.totalCount);
        this.setListResult(pageId, templates.page, templates.pageSize, templates.totalCount);
        this.setBackendPageOverride(pageId, this.toNotificationsPage(templates.items, templates.summary));
        if (this.canSendNotificationRealtimeTest()) {
          void this.refreshRealtimeConnectionStatus();
        }
        return;
      }

      if (pageId === 'notification-outbox') {
        const [templates, outbox] = await Promise.all([
          this.adminCenterApi.listNotificationTemplates({ page: 1, pageSize: 1 }),
          this.adminCenterApi.listNotificationOutbox(listQuery),
        ]);
        this.notificationOutboxSummary.set({
          pendingOutboxCount: templates.summary.pendingOutboxCount ?? 0,
          sentOutboxCount: templates.summary.sentOutboxCount ?? 0,
          failedOutboxCount: templates.summary.failedOutboxCount ?? 0,
        });
        this.notificationWorkerStatus.set(outbox.workerStatus ?? this.defaultNotificationWorkerStatus());
        this.notificationOutboxItems.set(outbox.items);
        this.notificationOutboxTotalCount.set(outbox.totalCount);
        this.setListResult(pageId, outbox.page, outbox.pageSize, outbox.totalCount);
        this.setBackendPageOverride(pageId, this.toNotificationOutboxPage(outbox, templates.summary));
        return;
      }

      if (pageId === 'ai-settings') {
        const [runtime, agents, guardrails] = await Promise.all([
          this.adminCenterApi.getAiRuntime(),
          this.adminCenterApi.getAiAgents(),
          this.adminCenterApi.getAiGuardrails(),
        ]);
        const semanticHealth = await this.adminCenterApi.getAiSemanticSimilarityHealth()
          .catch((error) => this.semanticSimilarityDiagnosticUnavailable(error, runtime));
        this.aiAgents = agents.items.map((agent) => this.toAiAgentDefinition(agent));
        this.activeAiAgentCount.set(agents.activeAgentCount);
        this.aiDecisionBoundary.set(guardrails.decisionBoundary);
        this.setBackendPageOverride(pageId, {
          ...getAdminPage(pageId),
          metrics: [
            { label: 'Provider', value: runtime.provider, note: runtime.runtimeEditable ? 'Editable' : 'Read-only' },
            {
              label: 'LLM',
              value: runtime.llmModel,
              note: runtime.vectorStore,
            },
            { label: 'Embedding', value: runtime.embeddingModel, note: `${runtime.embeddingDimensions} dimensions` },
            {
              label: 'Semantic Similarity',
              value: this.semanticSimilarityMetricValue(semanticHealth),
              note: semanticHealth.available
                ? `Ready at ${semanticHealth.ollamaBaseUrl}`
                : semanticHealth.message,
              tooltip: semanticHealth.status,
            },
            {
              label: 'Human Review',
              value: guardrails.humanReviewRequired ? 'Required' : 'Optional',
              note: guardrails.decisionBoundary,
            },
          ],
          table: {
            columns: ['Guardrail', 'Value', 'Reason'],
            rows: guardrails.items.map((item) => [item.name, item.value, item.reason]),
          },
          cards: [],
          guardrails: [],
        });
        return;
      }

      if (pageId === 'candidate-sources') {
        const response = await this.adminCenterApi.listCandidateSources(listQuery);
        this.setListResult(pageId, response.page, response.pageSize, response.totalCount);
        this.setBackendPageOverride(pageId, this.toCandidateSourcesPage(response.items, response.summary));
        return;
      }

      if (pageId === 'integrations') {
        const [status, emailSenders] = await Promise.all([
          this.googleCalendarApi.getStatus(),
          this.adminCenterApi
            .listNotificationEmailSenders()
            .catch(() => ({ providers: [] })),
        ]);
        this.googleCalendarStatus.set(status);
        this.notificationEmailSenderConfigurations.set(emailSenders.providers);
        this.setBackendPageOverride(pageId, this.toIntegrationsPage(status));
        return;
      }

      if (pageId === 'audit-logs') {
        const response = await this.adminCenterApi.listAuditLogs(this.toAuditLogQuery(auditLogFilter, listQuery));
        this.setListResult(pageId, response.page, response.pageSize, response.totalCount);
        this.setBackendPageOverride(pageId, this.toAuditLogsPage(response.items, response.summary, auditLogFilter));
        return;
      }

      this.setBackendPageError(pageId, 'The backend endpoint for this screen is not implemented yet.');
    } catch (error) {
      this.setBackendPageError(pageId, error instanceof Error ? error.message : 'Request failed.');
    }
  }

  private semanticSimilarityMetricValue(health: AdminSemanticSimilarityHealthResponse): string {
    if (health.status.startsWith('Diagnostic unavailable:')) {
      return 'Unknown';
    }

    return health.available ? 'Available' : 'Unavailable';
  }

  private semanticSimilarityDiagnosticUnavailable(
    error: unknown,
    runtime: AdminAiRuntimeResponse,
  ): AdminSemanticSimilarityHealthResponse {
    return {
      available: false,
      status: `Diagnostic unavailable: ${this.semanticSimilarityDiagnosticErrorLabel(error)}`,
      message: 'Health diagnostic could not be read. Runtime settings are loaded, but live similarity status is unknown.',
      provider: runtime.provider,
      embeddingModel: runtime.embeddingModel,
      embeddingDimensions: runtime.embeddingDimensions,
      vectorStore: runtime.vectorStore,
      ollamaBaseUrl: 'Configured embedding endpoint',
    };
  }

  private semanticSimilarityDiagnosticErrorLabel(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const backendMessage = this.httpErrorMessage(error);
      if (backendMessage) {
        return backendMessage;
      }

      if (error.status === 0) {
        return 'API request did not complete.';
      }

      return `HTTP ${error.status}${error.statusText ? ` ${error.statusText}` : ''}.`;
    }

    return error instanceof Error ? error.message : 'Request failed.';
  }

  private httpErrorMessage(error: HttpErrorResponse): string {
    const body = error.error;
    if (!body) {
      return '';
    }

    if (typeof body === 'string') {
      return body.trim();
    }

    if (typeof body === 'object' && 'message' in body && typeof body.message === 'string') {
      return body.message.trim();
    }

    if (typeof body === 'object' && 'title' in body && typeof body.title === 'string') {
      return body.title.trim();
    }

    return '';
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

  listState(): AdminListState {
    return this.listStateFor(this.page().id);
  }

  listPageNumbers(): number[] {
    const state = this.listState();
    const totalPages = this.listTotalPages();
    const firstPage = Math.max(1, Math.min(state.page - 2, totalPages - 4));
    const lastPage = Math.min(totalPages, firstPage + 4);

    return Array.from({ length: lastPage - firstPage + 1 }, (_, index) => firstPage + index);
  }

  listTotalPages(): number {
    const state = this.listState();
    return Math.max(1, Math.ceil(state.totalCount / state.pageSize));
  }

  listRangeLabel(itemLabel: string): string {
    const state = this.listState();
    if (state.totalCount === 0) {
      return `No ${itemLabel} found`;
    }

    const start = (state.page - 1) * state.pageSize + 1;
    const end = Math.min(state.totalCount, state.page * state.pageSize);
    return `Showing ${start}-${end} of ${state.totalCount} ${itemLabel}`;
  }

  adminListItemLabel(): string {
    const labels: Record<string, string> = {
      notifications: 'email templates',
      'notification-outbox': 'outbox emails',
      'candidate-sources': 'candidate source labels',
      'audit-logs': 'audit log entries',
      'hiring-pipeline': 'interview templates',
      'roles-permissions': 'roles',
    };

    return labels[this.page().id] ?? this.page().title.toLowerCase();
  }

  canGoToPreviousListPage(): boolean {
    return this.listState().page > 1;
  }

  canGoToNextListPage(): boolean {
    return this.listState().page < this.listTotalPages();
  }

  setListSearch(event: Event): void {
    this.setListSearchValue((event.target as HTMLInputElement).value);
  }

  setListSearchValue(search: string): void {
    this.updateListState(this.page().id, { search, page: 1 });
    void this.reloadCurrentBackendPage();
  }

  setListPageSize(event: Event): void {
    this.setListPageSizeValue(Number((event.target as HTMLSelectElement).value));
  }

  setListPageSizeValue(pageSizeValue: number): void {
    const pageSize = pageSizeValue || DEFAULT_ADMIN_LIST_PAGE_SIZE;
    this.updateListState(this.page().id, { pageSize, page: 1 });
    void this.reloadCurrentBackendPage();
  }

  setListStatusValue(status: string): void {
    this.updateListState(this.page().id, { status, page: 1 });
    void this.reloadCurrentBackendPage();
  }

  goToListPage(page: number): void {
    const nextPage = Math.min(Math.max(1, page), this.listTotalPages());
    if (nextPage === this.listState().page) {
      return;
    }

    this.updateListState(this.page().id, { page: nextPage });
    void this.reloadCurrentBackendPage();
  }

  isCurrentPagePageable(): boolean {
    return this.isPageableAdminPage(this.page().id);
  }

  private listStateFor(pageId: string): AdminListState {
    const existing = this.adminListStates()[pageId];
    if (existing) {
      return existing;
    }

    return {
      search: '',
      status: '',
      page: 1,
      pageSize: DEFAULT_ADMIN_LIST_PAGE_SIZE,
      totalCount: 0,
    };
  }

  private updateListState(pageId: string, patch: Partial<AdminListState>): void {
    this.adminListStates.update((states) => ({
      ...states,
      [pageId]: {
        ...this.listStateFor(pageId),
        ...patch,
      },
    }));
  }

  private setListResult(pageId: string, page: number, pageSize: number, totalCount: number): void {
    this.updateListState(pageId, { page, pageSize, totalCount });
  }

  private toAdminListQuery(pageId: string): AdminListQuery {
    const state = this.listStateFor(pageId);
    return {
      search: state.search,
      status: state.status,
      page: state.page,
      pageSize: state.pageSize,
    };
  }

  private reloadCurrentBackendPage(): Promise<void> {
    const pageId = this.page().id;
    return this.loadBackendPage(pageId, pageId === 'audit-logs' ? this.auditLogFilter() : {});
  }

  private isPageableAdminPage(pageId: string): boolean {
    return [
      'users',
      'roles-permissions',
      'groups',
      'departments',
      'skills',
      'hiring-pipeline',
      'notifications',
      'notification-outbox',
      'candidate-sources',
      'audit-logs',
    ].includes(pageId);
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
          user.roleIds.join(','),
          user.groupIds.join(','),
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
        { label: 'Tenant roles', value: String(summary.tenantRoleCount), note: 'Seeded and custom tenant roles' },
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
        columns: ['Group', 'Routing Purpose', 'Members', 'Status', 'Actions'],
        rows: groups.map((group) => [
          group.name,
          group.purpose,
          String(group.memberCount),
          group.status,
          'Manage',
          group.groupId,
        ]),
      },
      cards: [],
      guardrails: [],
    };
  }

  private toDepartmentsPage(
    departments: AdminDepartmentListItem[],
    summary: Awaited<ReturnType<AdminCenterApiService['listDepartments']>>['summary'],
  ): AdminPage {
    const base = getAdminPage('departments');

    return {
      ...base,
      subtitle: 'Manage department structure for jobs, employees, routing context, and reporting.',
      metrics: [
        { label: 'Active departments', value: String(summary.activeDepartmentCount), note: 'Available for routing' },
        { label: 'Employees', value: String(summary.totalEmployeeCount), note: 'Assigned to departments' },
        { label: 'Open requests', value: String(summary.openJobRequestCount), note: 'Not closed or cancelled' },
        { label: 'Inactive', value: String(summary.inactiveDepartmentCount), note: 'Archived departments' },
      ],
      table: {
        columns: ['Department', 'Lead', 'Employees', 'Open Requests', 'Status'],
        rows: departments.map((department) => [
          department.name,
          department.leadName || 'Unassigned',
          String(department.employeeCount),
          String(department.openJobRequestCount),
          department.status,
          department.departmentId,
        ]),
      },
      cards: [],
      guardrails: [],
    };
  }

  private toSkillsPage(
    skills: AdminSkillListItem[],
    summary: Awaited<ReturnType<AdminCenterApiService['listSkills']>>['summary'],
  ): AdminPage {
    const base = getAdminPage('skills');

    return {
      ...base,
      subtitle: 'Manage normalized skills used by parsing, candidate matching, and bench recommendations.',
      metrics: [
        { label: 'Active skills', value: String(summary.activeSkillCount), note: 'Available for matching' },
        { label: 'Categories', value: String(summary.categoryCount), note: 'Skill taxonomy groups' },
        { label: 'Aliases', value: String(summary.aliasCount), note: 'Alternative parser terms' },
      ],
      table: {
        columns: ['Skill', 'Category', 'Aliases', 'Status', 'Actions'],
        rows: skills.map((skill) => [
          skill.name,
          skill.category,
          skill.aliases.length > 0 ? skill.aliases.join(', ') : 'No aliases',
          skill.status,
          'Actions',
          skill.skillId,
          skill.normalizedName,
        ]),
      },
      cards: [],
      guardrails: [],
    };
  }

  private toHiringPipelinePage(
    templates: AdminHiringPipelineTemplateItem[],
    summary: Awaited<ReturnType<AdminCenterApiService['listHiringPipelineTemplates']>>['summary'],
  ): AdminPage {
    const base = getAdminPage('hiring-pipeline');

    return {
      ...base,
      subtitle:
        'Configure fixed interview templates that recruiters select for job postings. Candidate applications inherit the selected round sequence.',
      status: 'Template based',
      metrics: [
        { label: 'Selectable templates', value: String(summary.activeTemplateCount), note: 'Available when creating a job post' },
        {
          label: 'Department-specific',
          value: String(summary.departmentSpecificTemplateCount),
          note: 'Templates scoped to a department',
        },
        { label: 'Configured rounds', value: String(summary.activeRoundCount), note: 'Active interview steps in use' },
        {
          label: 'Needs interviewer',
          value: String(summary.missingInterviewerRoundCount),
          note:
            summary.missingInterviewerRoundCount === 0
              ? 'All active rounds have a default interviewer'
              : 'Assign default interviewers before using these templates',
        },
      ],
      table: {
        columns: ['Template', 'Stage Sequence', 'Department', 'Default Interviewers', 'Status', 'Actions'],
        rows: templates.map((template) => [
          template.name,
          template.stageFlow,
          template.departmentName,
          template.defaultInterviewers,
          template.status,
          'Actions',
          template.interviewTemplateId,
          template.description,
          template.updatedAtUtc,
          String(template.roundCount),
        ]),
      },
      cards: [
        {
          title: 'What This Configures',
          lines: [
            'Ordered interview rounds that a job posting can use.',
            'Default interviewer for each round, selected from active tenant users.',
            'Required rounds and default duration for scheduling.',
          ],
        },
        {
          title: 'What This Does Not Configure',
          lines: [
            'Job Request baton routing between Presales, PMO, Recruiter, and Hiring Manager.',
            'Per-candidate custom stage overrides. That remains outside MVP scope.',
          ],
        },
      ],
      guardrails: [],
    };
  }

  private toWorkflowsPage(
    response: Awaited<ReturnType<AdminCenterApiService['getWorkflowConfiguration']>>,
  ): AdminPage {
    const base = getAdminPage('workflows');
    const primaryDefinition = response.definitions[0];

    return {
      ...base,
      subtitle:
        'Configure who receives Job Request work and which tenant roles can act. Talent Pilot defines the workflow stages and action names.',
      status: primaryDefinition?.status ?? 'Configured',
      metrics: [
        {
          label: 'Department routes',
          value: String(response.summary.activeIntakeRoutingRuleCount),
          note: 'PMO recipient rules',
        },
        {
          label: 'Needs routing',
          value: String(response.summary.departmentsNeedingIntakeRoutingCount),
          note:
            response.summary.departmentsNeedingIntakeRoutingCount === 0
              ? 'All active departments covered'
              : 'Missing PMO recipient',
        },
        { label: 'System stages', value: String(response.summary.activeStageCount), note: 'Read-only reference' },
        { label: 'System actions', value: String(response.summary.activeTransitionCount), note: primaryDefinition?.entityType ?? 'JobRequest' },
      ],
      cards: [],
      table: {
        columns: ['Action', 'From', 'To', 'Assignment', 'Target', 'Status'],
        rows: response.routingRules.map((rule) => [
          rule.actionKey,
          rule.fromStage,
          rule.toStage,
          rule.assignmentType,
          rule.assignmentTarget,
          rule.status,
          rule.workflowRoutingRuleId,
          rule.actionName,
          rule.resolverKey,
        ]),
      },
      guardrails: [],
    };
  }

  private toNotificationsPage(
    templates: NotificationTemplateSummary[],
    summary: Awaited<ReturnType<AdminCenterApiService['listNotificationTemplates']>>['summary'],
  ): AdminPage {
    const base = getAdminPage('notifications');

    return {
      ...base,
      subtitle: 'Manage editable email templates for system-defined notification events.',
      metrics: [
        { label: 'System events', value: String(summary.activeEventCount), note: 'Code-owned triggers' },
        { label: 'Email templates', value: String(summary.editableTemplateCount), note: 'Linked templates' },
      ],
      table: {
        columns: ['Template', 'Linked Event', 'Subject', 'Recipient', 'Updated', 'Actions'],
        rows: templates.map((template) => [
          template.name,
          template.eventCode,
          template.subject,
          template.recipient,
          template.updatedAtUtc,
          'Actions',
          template.templateId,
          template.body,
          template.variables.join(','),
        ]),
      },
      cards: [],
      guardrails: [],
    };
  }

  private toNotificationOutboxPage(
    outbox: Awaited<ReturnType<AdminCenterApiService['listNotificationOutbox']>>,
    summary: Awaited<ReturnType<AdminCenterApiService['listNotificationTemplates']>>['summary'],
  ): AdminPage {
    const base = getAdminPage('notification-outbox');

    return {
      ...base,
      status: this.listRangeLabel('outbox emails'),
      metrics: [
        { label: 'Pending', value: String(summary.pendingOutboxCount ?? 0), note: 'Waiting for worker' },
        { label: 'Sent', value: String(summary.sentOutboxCount ?? 0), note: 'Provider accepted' },
        { label: 'Failed', value: String(summary.failedOutboxCount ?? 0), note: 'Requires review' },
        { label: 'Rows', value: String(outbox.totalCount), note: 'Current outbox records' },
      ],
      cards: [],
      guardrails: [],
    };
  }

  private toCandidateSourcesPage(
    sources: AdminCandidateSourceListItem[],
    summary: Awaited<ReturnType<AdminCenterApiService['listCandidateSources']>>['summary'],
  ): AdminPage {
    const base = getAdminPage('candidate-sources');

    return {
      ...base,
      metrics: [
        { label: 'Active sources', value: String(summary.activeSourceCount), note: 'Available for candidate intake' },
        { label: 'Reporting categories', value: String(summary.reportingCategoryCount), note: 'Analytics grouping' },
        { label: 'Inactive sources', value: String(summary.inactiveSourceCount), note: 'Hidden from new intake' },
      ],
      table: {
        columns: ['Source', 'Code', 'Reporting Category', 'Status'],
        rows: sources.map((source) => [
          source.displayName,
          source.code,
          source.reportingCategory,
          source.status,
          source.candidateSourceLabelId,
        ]),
      },
      cards: [],
      guardrails: [],
    };
  }

  private toIntegrationsPage(status: GoogleCalendarConnectionStatus): AdminPage {
    const base = getAdminPage('integrations');

    return {
      ...base,
      status: status.connected ? 'Connected' : 'Not connected',
      metrics: [],
      cards: [],
      table: undefined,
      guardrails: [],
    };
  }

  private toAuditLogsPage(
    logs: Awaited<ReturnType<AdminCenterApiService['listAuditLogs']>>['items'],
    summary: Awaited<ReturnType<AdminCenterApiService['listAuditLogs']>>['summary'],
    filter: AuditLogFilter = {},
  ): AdminPage {
    const base = getAdminPage('audit-logs');
    const isTenantAuditFilter = filter.entityType === 'Tenant' && Boolean(filter.entityId);

    return {
      ...base,
      title: isTenantAuditFilter ? 'Tenant Audit Logs' : base.title,
      subtitle: isTenantAuditFilter
        ? 'Review tenant profile and tenant configuration audit events for this tenant.'
        : base.subtitle,
      status: isTenantAuditFilter ? 'Tenant filtered' : base.status,
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

  notificationTemplateFromRow(row: string[]): NotificationTemplateDefinition {
    return {
      name: row[0] ?? '',
      eventCode: row[1] ?? '',
      subject: row[2] ?? '',
      recipient: row[3] ?? '',
      updatedAtUtc: row[4] ?? '',
      templateId: row[6] ?? '',
      body: row[7] ?? '',
      variables: (row[8] ?? '')
        .split(',')
        .map((variable) => variable.trim())
        .filter(Boolean),
    };
  }

  notificationWorkerStatusIcon(): string {
    const state = this.notificationWorkerStatus().state;
    if (state === 'Running') {
      return 'check_circle';
    }

    if (state === 'Error') {
      return 'error';
    }

    if (state === 'NotConfigured') {
      return 'settings_alert';
    }

    return 'sync_problem';
  }

  notificationWorkerLastHeartbeatLabel(): string {
    const value = this.notificationWorkerStatus().lastHeartbeatUtc;
    return value ? this.formatAuditTimestamp(value) : 'Never';
  }

  notificationWorkerLastProcessedLabel(): string {
    const status = this.notificationWorkerStatus();
    if (!status.lastProcessedAtUtc) {
      return 'No processed batch';
    }

    const processedCount = status.lastProcessedCount ?? 0;
    return `${processedCount} in latest batch - ${this.formatAuditTimestamp(status.lastProcessedAtUtc)}`;
  }

  notificationWorkerHostLabel(): string {
    const status = this.notificationWorkerStatus();
    if (!status.hostName && !status.processId) {
      return 'Not recorded';
    }

    return [status.hostName, status.processId ? `PID ${status.processId}` : null].filter(Boolean).join(' / ');
  }

  notificationEmailProviderLabel(provider: string): string {
    return provider === 'MicrosoftGraph' ? 'Microsoft Graph' : 'Resend';
  }

  isMicrosoftGraphEmailProvider(provider?: string | null): boolean {
    return provider === 'MicrosoftGraph';
  }

  notificationEmailSenderAddressLabel(): string {
    const senderEmail = this.selectedNotificationEmailSenderConfiguration()?.senderEmail?.trim();
    return senderEmail || 'Not configured';
  }

  notificationEmailSenderStatusLabel(): string {
    return this.selectedNotificationEmailSenderConfiguration()?.senderConfigured ? 'Configured' : 'Missing sender';
  }

  openNotificationOutboxEmail(item: AdminNotificationOutboxItem): void {
    this.selectedNotificationOutboxItem.set(item);
  }

  closeNotificationOutboxEmail(): void {
    this.selectedNotificationOutboxItem.set(null);
  }

  canRetryNotificationOutboxEmail(item: AdminNotificationOutboxItem): boolean {
    return item.status === 'Failed' && !this.isNotificationOutboxRetrying(item);
  }

  isNotificationOutboxRetrying(item: AdminNotificationOutboxItem): boolean {
    return this.notificationOutboxRetryingIds().has(item.outboxId);
  }

  async retryNotificationOutboxEmail(item: AdminNotificationOutboxItem): Promise<void> {
    if (!this.canRetryNotificationOutboxEmail(item)) {
      return;
    }

    this.notificationOutboxRetryingIds.update((ids) => new Set(ids).add(item.outboxId));

    try {
      const requeued = await this.adminCenterApi.retryNotificationOutboxEmail(item.outboxId);
      this.notificationOutboxItems.update((items) =>
        items.map((current) => (current.outboxId === requeued.outboxId ? requeued : current)),
      );

      if (this.selectedNotificationOutboxItem()?.outboxId === requeued.outboxId) {
        this.selectedNotificationOutboxItem.set(requeued);
      }

      this.notifications.success('Email requeued. The worker will retry it shortly.');
      await this.reloadCurrentBackendPage();
    } catch (error) {
      this.notifications.error(this.toErrorMessage(error, 'Email could not be requeued.'));
    } finally {
      this.notificationOutboxRetryingIds.update((ids) => {
        const next = new Set(ids);
        next.delete(item.outboxId);
        return next;
      });
    }
  }

  notificationOutboxRecipient(item: AdminNotificationOutboxItem): string {
    const email = item.recipientEmail?.trim();
    const displayName = item.recipientDisplayName?.trim();
    if (displayName && email) {
      return `${displayName} <${email}>`;
    }

    return email || displayName || 'Recipient not recorded';
  }

  notificationOutboxSender(item: AdminNotificationOutboxItem): string {
    return item.senderDisplayName?.trim() || 'Talent Pilot workflow';
  }

  notificationOutboxEntityLabel(item: AdminNotificationOutboxItem): string {
    if (!item.entityType && !item.entityId) {
      return 'No linked entity';
    }

    return [item.entityType, item.entityId].filter(Boolean).join(' / ');
  }

  notificationOutboxDetailTimestamp(item: AdminNotificationOutboxItem): string {
    return this.formatAuditTimestamp(this.notificationOutboxActivityTimestamp(item));
  }

  notificationOutboxActivityTimestamp(item: AdminNotificationOutboxItem): string {
    return item.processedAtUtc ?? item.updatedAtUtc ?? item.createdAtUtc;
  }

  notificationOutboxActivityLabel(item: AdminNotificationOutboxItem): string {
    if (item.status === 'Sent') {
      return 'Sent';
    }

    if (item.status === 'Failed') {
      return item.attemptCount > 1 ? 'Last retry' : 'Last attempt';
    }

    if (item.status === 'Processing') {
      return item.attemptCount > 1 ? 'Retrying since' : 'Processing since';
    }

    if (item.status === 'Pending') {
      return item.attemptCount > 0 ? 'Retry queued' : 'Queued';
    }

    return 'Updated';
  }

  notificationOutboxSenderInitial(item: AdminNotificationOutboxItem): string {
    return this.notificationOutboxSender(item).trim().charAt(0).toUpperCase() || 'T';
  }

  notificationOutboxDiagnostic(item: AdminNotificationOutboxItem): string {
    if (item.status === 'Sent') {
      return item.processedAtUtc ? `Sent ${this.formatAuditTimestamp(item.processedAtUtc)}.` : 'Sent by the worker.';
    }

    if (item.status === 'Failed') {
      return item.lastError?.trim()
        ? 'Delivery failed. Review the provider error below.'
        : 'The worker marked this row failed without an error message.';
    }

    if (item.status === 'Processing') {
      return 'The worker has claimed this row and has not completed it yet.';
    }

    if (item.attemptCount > 0) {
      return 'The row returned to pending after a previous delivery attempt. Check the worker and provider configuration.';
    }

    const availableAt = new Date(item.availableAtUtc);
    if (!Number.isNaN(availableAt.getTime()) && availableAt.getTime() > Date.now()) {
      return `Waiting until ${this.formatAuditTimestamp(item.availableAtUtc)} before the worker can send it.`;
    }

    return 'Still pending because the outbox worker has not claimed it yet. Start TalentPilot.Worker with the same database connection and configured email provider settings.';
  }

  private defaultNotificationWorkerStatus(): AdminNotificationWorkerStatus {
    return {
      state: 'Unknown',
      label: 'Checking',
      message: 'Worker status is loading.',
      lastHeartbeatUtc: null,
      startedAtUtc: null,
      lastProcessedAtUtc: null,
      lastProcessedCount: null,
      hostName: null,
      processId: null,
      lastError: null,
      pollIntervalSeconds: 30,
      staleAfterSeconds: 90,
      pendingDueCount: 0,
      processingCount: 0,
    };
  }

  private unavailableNotificationWorkerStatus(): AdminNotificationWorkerStatus {
    return {
      ...this.defaultNotificationWorkerStatus(),
      state: 'Unknown',
      label: 'Status unavailable',
      message: 'The outbox status endpoint did not return worker health. Restart the API after applying the latest backend build.',
    };
  }

  private isValidEmailAddress(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
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

  private async loadUserDetailsForAction(userId: string): Promise<void> {
    if (!userId) {
      return;
    }

    try {
      const user = await this.adminCenterApi.getUser(userId);
      this.selectedUserAction.update((current) => {
        if (!current || current.userId !== user.id) {
          return current;
        }

        const groupNames = this.routingGroupChoices
          .filter((group) => user.groupIds.includes(group.id))
          .map((group) => group.name);

        return {
          ...current,
          displayName: user.displayName,
          email: user.email,
          roleIds: user.roleIds,
          groupIds: user.groupIds,
          groupNames,
          accountStatus: user.accountStatus,
        };
      });
    } catch {
      this.notifications.error('User details could not be loaded from the backend.');
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
      roleIds: this.idsFromRow(row[7]),
      groupNames: this.userGroupsFromRow(row),
      groupIds: this.idsFromRow(row[8]),
      accountStatus: row[3] ?? '',
      lastActive: row[4] ?? '',
      deactivationReason: '',
    });

    if (action === 'audit-history') {
      void this.loadUserAuditEvents(row[5] ?? '');
    } else if (action === 'edit-access') {
      void this.loadUserDetailsForAction(row[5] ?? '');
    }
  }

  closeUserAction(): void {
    if (this.userActionSaving()) {
      return;
    }

    this.selectedUserAction.set(null);
  }

  async confirmUserAction(actionContext: UserActionContext): Promise<void> {
    if (!this.canConfirmUserAction(actionContext)) {
      this.notifications.error('You do not have permission for this user action.');
      return;
    }

    this.userActionSaving.set(true);

    try {
      if (actionContext.action === 'edit-access') {
        await this.adminCenterApi.updateUser(actionContext.userId, {
          displayName: actionContext.displayName,
          email: actionContext.email,
          roleIds: actionContext.roleIds,
          groupIds: actionContext.groupIds,
          accountStatus: actionContext.accountStatus,
        });
        this.notifications.success(`${actionContext.displayName} access updated.`);
      }

      if (actionContext.action === 'resend-invite') {
        await this.adminCenterApi.resendUserInvite(actionContext.userId);
        this.notifications.success(`Invitation queued for ${actionContext.displayName}.`);
      }

      if (actionContext.action === 'deactivate-user') {
        await this.adminCenterApi.updateUserStatus(actionContext.userId, {
          accountStatus: 'Disabled',
          reason: actionContext.deactivationReason.trim() || null,
        });
        this.notifications.success(`${actionContext.displayName} deactivated.`);
      }

      this.selectedUserAction.set(null);
      await this.loadBackendPage('users');
    } catch (error) {
      this.notifications.error(error instanceof Error ? error.message : 'User action could not be saved.');
    } finally {
      this.userActionSaving.set(false);
    }
  }

  canConfirmUserAction(actionContext: UserActionContext): boolean {
    if (!this.canOpenUserAction(actionContext.action)) {
      return false;
    }

    if (actionContext.action === 'edit-access') {
      return actionContext.roleIds.length > 0;
    }

    if (actionContext.action === 'deactivate-user') {
      return actionContext.accountStatus !== 'Disabled';
    }

    return actionContext.action !== 'audit-history';
  }

  toggleUserActionRole(roleId: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedUserAction.update((current) => {
      if (!current) {
        return current;
      }

      const roleIds = this.toggleId(current.roleIds, roleId, checked);
      return {
        ...current,
        roleIds,
        roleName: this.userRoleChoices.find((role) => role.id === roleIds[0])?.name ?? current.roleName,
      };
    });
  }

  toggleUserActionGroup(groupId: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedUserAction.update((current) => {
      if (!current) {
        return current;
      }

      const groupIds = this.toggleId(current.groupIds, groupId, checked);
      return {
        ...current,
        groupIds,
        groupNames: this.routingGroupChoices
          .filter((group) => groupIds.includes(group.id))
          .map((group) => group.name),
      };
    });
  }

  setUserActionStatus(event: Event): void {
    const accountStatus = (event.target as HTMLSelectElement).value;
    this.selectedUserAction.update((current) => (current ? { ...current, accountStatus } : current));
  }

  setUserActionDeactivationReason(event: Event): void {
    const deactivationReason = (event.target as HTMLTextAreaElement).value;
    this.selectedUserAction.update((current) => (current ? { ...current, deactivationReason } : current));
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

  private idsFromRow(value: string | undefined): string[] {
    return String(value ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
  }

  private toggleId(ids: readonly string[], id: string, checked: boolean): string[] {
    const next = new Set(ids);
    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }

    return [...next];
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

    if (this.isAuditLogsPage()) {
      await this.exportAuditLogs();
    }

    if (this.isGroupsPage()) {
      this.openCreateGroupDialog();
    }

    if (this.isDepartmentsPage()) {
      this.openCreateDepartmentDialog();
    }

    if (this.isSkillsPage()) {
      this.openCreateSkillDialog();
    }

    if (this.isHiringPipelinePage()) {
      await this.openCreateInterviewTemplateDialog();
    }
  }

  canRunPageAction(): boolean {
    if (this.isAuditLogsPage()) {
      return this.canViewAuditLogs();
    }

    return this.canManageCurrentAdminPage();
  }

  openNotificationTemplate(template: NotificationTemplateDefinition): void {
    if (!this.canManageNotifications()) {
      this.notifications.error('You do not have permission to edit notification templates.');
      return;
    }

    this.selectedNotificationTemplate.set({ ...template, variables: [...template.variables] });
  }

  closeNotificationTemplate(): void {
    if (this.notificationTemplateSaving()) {
      return;
    }

    this.selectedNotificationTemplate.set(null);
  }

  updateSelectedNotificationSubject(event: Event): void {
    const subject = (event.target as HTMLInputElement).value;
    this.selectedNotificationTemplate.update((template) => (template ? { ...template, subject } : template));
  }

  updateSelectedNotificationBody(event: Event): void {
    const body = (event.target as HTMLTextAreaElement).value;
    this.selectedNotificationTemplate.update((template) => (template ? { ...template, body } : template));
  }

  async saveNotificationTemplate(template: NotificationTemplateDefinition): Promise<void> {
    if (!this.canManageNotifications()) {
      this.notifications.error('You do not have permission to edit notification templates.');
      return;
    }

    this.notificationTemplateSaving.set(true);

    try {
      await this.adminCenterApi.updateNotificationTemplate(template.templateId, {
        subject: template.subject,
        body: template.body,
      });
      this.selectedNotificationTemplate.set(null);
      this.notifications.success(`${template.name} template saved.`);
      await this.loadBackendPage('notifications');
    } catch (error) {
      this.notifications.error(error instanceof Error ? error.message : 'Notification template could not be saved.');
    } finally {
      this.notificationTemplateSaving.set(false);
    }
  }

  updateTestEmailRecipient(event: Event): void {
    this.testEmailRecipient.set((event.target as HTMLInputElement).value);
  }

  canSubmitNotificationTestEmail(): boolean {
    return (
      this.canSendNotificationTestEmail() &&
      !this.testEmailSending() &&
      this.isValidEmailAddress(this.testEmailRecipient())
    );
  }

  async sendNotificationTestEmail(): Promise<void> {
    if (!this.canSendNotificationTestEmail()) {
      this.notifications.error('Only admins can send notification test emails.');
      return;
    }

    if (!this.canSubmitNotificationTestEmail()) {
      this.notifications.error('Enter a valid recipient email.');
      return;
    }

    this.testEmailSending.set(true);

    try {
      const result = await this.adminCenterApi.sendNotificationTestEmail({
        toEmail: this.testEmailRecipient().trim(),
      });
      this.notifications.success(`Test email sent through ${this.notificationEmailProviderLabel(result.provider)}.`);
    } catch (error) {
      this.notifications.error(this.toErrorMessage(error, 'Test email could not be sent.'));
    } finally {
      this.testEmailSending.set(false);
    }
  }

  async sendNotificationRealtimeTest(): Promise<void> {
    if (!this.canSendNotificationRealtimeTest()) {
      this.notifications.error('Only admins can send realtime notification tests.');
      return;
    }

    this.realtimeTestSending.set(true);

    try {
      const result = await this.adminCenterApi.sendNotificationRealtimeTest();
      const currentUser = this.auth.currentUser();
      this.store.addRealtimeNotification(
        {
          notificationId: result.notificationId,
          tenantId: currentUser?.tenantId ?? '',
          recipientUserId: currentUser?.id ?? null,
          title: result.title,
          message: result.message,
          category: 'AdminCenter',
          severity: 'Info',
          entityType: 'AdminCenter',
          entityId: currentUser?.tenantId ?? null,
          createdAtUtc: result.sentAtUtc,
          metadata: { source: 'admin_notifications_test' },
        },
        currentUser?.id,
      );
      this.realtimeConnectedClientCount.set(result.connectedClientCount);
      this.notifications.success(`Realtime test sent to ${result.connectedClientCount} connected client(s).`);
    } catch (error) {
      this.notifications.error(error instanceof Error ? error.message : 'Realtime test notification could not be sent.');
    } finally {
      this.realtimeTestSending.set(false);
    }
  }

  private async refreshRealtimeConnectionStatus(): Promise<void> {
    try {
      const status = await this.adminCenterApi.getNotificationRealtimeConnectionStatus();
      this.realtimeConnectedClientCount.set(status.connectedClientCount);
    } catch {
      this.realtimeConnectedClientCount.set(null);
    }
  }

  async connectGoogleCalendar(): Promise<void> {
    if (!this.canManageCurrentAdminPage()) {
      this.notifications.error('You do not have permission to manage integrations.');
      return;
    }

    this.googleCalendarConnecting.set(true);
    try {
      const response = await this.googleCalendarApi.getConnectUrl();
      globalThis.location.assign(response.authorizationUrl);
    } catch (error) {
      this.notifications.error(this.toErrorMessage(error, 'Google Calendar connection could not be started.'));
      this.googleCalendarConnecting.set(false);
    }
  }

  private toErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const responseMessage = error.error?.message;
      if (typeof responseMessage === 'string' && responseMessage.trim()) {
        return responseMessage;
      }

      if (error.status === 0) {
        return 'Unable to reach the server. Check the API connection.';
      }
    }

    return error instanceof Error && error.message ? error.message : fallback;
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
    const isProtected = row[7] === 'true';

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
      return 'Platform System Admin role. It is not managed from tenant Admin Center.';
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
        Permission.CreateJobRequests,
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

  setActiveAiSettingsTab(tab: AiSettingsTab): void {
    this.activeAiSettingsTab.set(tab);
  }

  setActiveNotificationTab(tab: NotificationChannelTab): void {
    this.activeNotificationTab.set(tab);
    if (tab !== 'email') {
      this.selectedNotificationOutboxItem.set(null);
    }

    if (tab === 'realtime' && this.canSendNotificationRealtimeTest()) {
      void this.refreshRealtimeConnectionStatus();
    }
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

  private toAuditLogFilter(params: ParamMap): AuditLogFilter {
    return {
      area: params.get('area') || undefined,
      actorId: params.get('actorId') || undefined,
      search: params.get('search') || undefined,
      entityType: params.get('entityType') || undefined,
      entityId: params.get('entityId') || undefined,
    };
  }

  private toAuditLogQuery(filter: AuditLogFilter, listQuery: AdminListQuery = {}): string {
    const params = new URLSearchParams();

    if (filter.area) {
      params.set('area', filter.area);
    }

    if (filter.actorId) {
      params.set('actorId', filter.actorId);
    }

    const search = listQuery.search?.trim() || filter.search;
    if (search) {
      params.set('search', search);
    }

    if (filter.entityType) {
      params.set('entityType', filter.entityType);
    }

    if (filter.entityId) {
      params.set('entityId', filter.entityId);
    }

    if (listQuery.page) {
      params.set('page', String(listQuery.page));
    }

    if (listQuery.pageSize) {
      params.set('pageSize', String(listQuery.pageSize));
    }

    return params.toString();
  }

  private async exportAuditLogs(): Promise<void> {
    try {
      const file = await this.adminCenterApi.exportAuditLogs(
        this.toAuditLogQuery(this.auditLogFilter(), { search: this.listStateFor('audit-logs').search }),
      );
      const result = this.fileDownloads.saveBlob(file.blob, file.fileName);
      this.notifications.success(
        result.method === 'open' ? 'Audit logs export opened in a new tab.' : 'Audit logs export started.',
      );
    } catch (error) {
      this.notifications.error(error instanceof Error ? error.message : 'Audit logs could not be exported.');
    }
  }

  setCompanyLogo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    if (!SUPPORTED_LOGO_CONTENT_TYPES.has(file.type)) {
      input.value = '';
      this.notifications.error('Upload a PNG, JPEG, WebP, or SVG image for the company logo.');
      return;
    }

    if (file.size > MAX_LOGO_BYTES) {
      input.value = '';
      this.notifications.error('Logo image cannot exceed 512 KB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const previewUrl = String(reader.result ?? '');
      const contentSeparator = previewUrl.indexOf(',');
      const logoContentBase64 = contentSeparator >= 0 ? previewUrl.slice(contentSeparator + 1) : '';
      if (!logoContentBase64) {
        input.value = '';
        this.notifications.error('Company logo could not be read.');
        return;
      }

      this.companyLogoPreviewUrl.set(previewUrl);
      this.companyLogoFileName.set(file.name);
      this.companyLogoContentType.set(file.type);
      this.companyLogoContentBase64.set(logoContentBase64);
      this.companyLogoDirty.set(true);
      this.formMessage.set('');
    };
    reader.onerror = () => {
      input.value = '';
      this.notifications.error('Company logo could not be previewed.');
    };
    reader.readAsDataURL(file);
  }

  canSaveTenantProfile(): boolean {
    return (
      !this.saving() &&
      this.tenantProfileForm.valid &&
      (this.tenantProfileForm.dirty || this.companyLogoDirty()) &&
      this.canManageTenantProfile()
    );
  }

  canSaveIntegrationEmailSender(): boolean {
    const control = this.tenantProfileForm.controls.notificationEmailProvider;

    return (
      !this.saving() &&
      control.valid &&
      control.value !== this.savedTenantProfile().notificationEmailProvider &&
      this.canManageCurrentAdminPage()
    );
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
      return ['rule_folder', 'domain', 'route', 'assignment_ind'][index] ?? 'insights';
    }

    if (this.isWorkflowsPage()) {
      return ['account_tree', 'route', 'swap_horiz', 'rule_settings'][index] ?? 'insights';
    }

    if (this.isNotificationsPage()) {
      return ['account_tree', 'mark_email_unread', 'edit_note', 'warning'][index] ?? 'insights';
    }

    if (this.isAiSettingsPage()) {
      return ['smart_toy', 'memory', 'database', 'verified_user'][index] ?? 'insights';
    }

    if (this.isCandidateSourcesPage()) {
      return ['source_environment', 'category', 'archive', 'label'][index] ?? 'insights';
    }

    if (this.isIntegrationsPage()) {
      return ['outgoing_mail', 'event_available'][index] ?? 'extension';
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
      'hiring-pipeline': 'Interview Templates',
      notifications: 'Email Templates',
      'notification-outbox': 'Email Outbox',
      'candidate-sources': 'Candidate Source Labels',
      'audit-logs': 'Audit Log Entries',
    };

    return titles[this.page().id] ?? `${this.page().title} Details`;
  }

  adminDetailsStatus(): string {
    if (this.isCandidateSourcesPage()) {
      return '';
    }

    return this.page().status ?? '';
  }

  showPageAction(): boolean {
    return (
      !this.isCandidateSourcesPage() &&
      !this.isAiSettingsPage() &&
      !this.isNotificationsPage() &&
      !this.isNotificationOutboxPage() &&
      !this.isIntegrationsPage() &&
      !this.isWorkflowsPage()
    );
  }

  pageActionLabel(): string {
    const actions: Record<string, string> = {
      groups: 'Create Group',
      departments: 'Add Department',
      skills: 'Add Skill',
      'hiring-pipeline': 'Create Template',
      'audit-logs': 'Export Logs',
    };

    return actions[this.page().id] ?? 'Add Item';
  }

  pageActionIcon(): string {
    const icons: Record<string, string> = {
      'audit-logs': 'download',
    };

    return icons[this.page().id] ?? 'add';
  }

  pageActionTooltip(): string {
    return '';
  }

  isStatusValue(value: string): boolean {
    return ['Active', 'Inactive', 'Custom', 'Protected', 'Disabled', 'Enabled', 'Invited', 'Required', 'Optional'].includes(value);
  }

  visibleTableCells(row: string[], table: AdminTable): string[] {
    return row.slice(0, table.columns.length);
  }

  isCodeLike(value: string): boolean {
    return value.includes('_') || /^[A-Z][A-Z0-9_]+$/.test(value);
  }

  isPipelineStageCell(cellIndex: number): boolean {
    return this.isHiringPipelinePage() && cellIndex === 1;
  }

  isHiringPipelineActionsCell(cellIndex: number): boolean {
    return this.isHiringPipelinePage() && cellIndex === 5;
  }

  isAuditTimestampCell(cellIndex: number): boolean {
    return this.isAuditLogsPage() && cellIndex === 0;
  }

  isNotificationTemplateEventCodeCell(cellIndex: number): boolean {
    return this.isNotificationsPage() && cellIndex === 1;
  }

  isNotificationTemplateUpdatedCell(cellIndex: number): boolean {
    return this.isNotificationsPage() && cellIndex === 4;
  }

  isNotificationTemplateActionsCell(cellIndex: number): boolean {
    return this.isNotificationsPage() && cellIndex === 5;
  }

  isGroupMembersCell(cellIndex: number): boolean {
    return this.isGroupsPage() && cellIndex === 2;
  }

  isGroupActionsCell(cellIndex: number): boolean {
    return this.isGroupsPage() && cellIndex === 4;
  }

  isSkillActionsCell(cellIndex: number): boolean {
    return this.isSkillsPage() && cellIndex === 4;
  }

  openCreateGroupDialog(): void {
    if (!this.canManageCurrentAdminPage()) {
      this.notifications.error('You do not have permission to create groups.');
      return;
    }

    this.createGroupDialogOpen.set(true);
  }

  closeCreateGroupDialog(): void {
    this.createGroupDialogOpen.set(false);
  }

  handleGroupCreated(): void {
    void this.loadBackendPage('groups');
  }

  openCreateDepartmentDialog(): void {
    if (!this.canManageCurrentAdminPage()) {
      this.notifications.error('You do not have permission to add departments.');
      return;
    }

    this.createDepartmentDialogOpen.set(true);
  }

  closeCreateDepartmentDialog(): void {
    this.createDepartmentDialogOpen.set(false);
  }

  handleDepartmentCreated(): void {
    void this.loadBackendPage('departments');
  }

  openCreateSkillDialog(): void {
    if (!this.canManageCurrentAdminPage()) {
      this.notifications.error('You do not have permission to add skills.');
      return;
    }

    this.createSkillDialogOpen.set(true);
  }

  closeCreateSkillDialog(): void {
    this.createSkillDialogOpen.set(false);
  }

  handleSkillSaved(): void {
    this.createSkillDialogOpen.set(false);
    this.selectedSkillForEdit.set(null);
    void this.loadBackendPage('skills');
  }

  async openInterviewTemplateDialog(row: string[]): Promise<void> {
    if (!this.canManageCurrentAdminPage()) {
      this.notifications.error('You do not have permission to edit interview templates.');
      return;
    }

    const templateId = row[6] ?? '';
    if (!templateId) {
      this.notifications.error('Interview template could not be opened.');
      return;
    }

    try {
      const [template] = await Promise.all([
        this.adminCenterApi.getHiringPipelineTemplate(templateId),
        this.loadInterviewTemplateEditorChoices(),
      ]);
      this.selectedInterviewTemplate.set(template);
    } catch (error) {
      this.notifications.error(error instanceof Error ? error.message : 'Interview template could not be opened.');
    }
  }

  async openCreateInterviewTemplateDialog(): Promise<void> {
    if (!this.canManageCurrentAdminPage()) {
      this.notifications.error('You do not have permission to create interview templates.');
      return;
    }

    try {
      await this.loadInterviewTemplateEditorChoices();
      this.selectedInterviewTemplate.set({
        interviewTemplateId: '',
        departmentId: null,
        name: '',
        departmentName: 'All departments',
        description: '',
        status: 'Active',
        updatedAtUtc: new Date().toISOString(),
        rounds: [
          {
            interviewTemplateRoundId: '',
            roundOrder: 1,
            name: 'Initial Interview',
            ownerRoleId: null,
            ownerRoleName: 'Unassigned',
            ownerUserId: null,
            ownerUserName: 'Unassigned',
            durationMinutes: 60,
            isRequired: true,
            status: 'Active',
          },
        ],
      });
    } catch (error) {
      this.notifications.error(error instanceof Error ? error.message : 'Interview template could not be created.');
    }
  }

  closeInterviewTemplateDialog(): void {
    this.selectedInterviewTemplate.set(null);
  }

  handleInterviewTemplateSaved(): void {
    this.selectedInterviewTemplate.set(null);
    void this.loadBackendPage('hiring-pipeline');
  }

  private async loadInterviewTemplateEditorChoices(): Promise<void> {
    const [departments, users] = await Promise.all([
      this.adminCenterApi.listDepartments({ page: 1, pageSize: 100 }),
      this.adminCenterApi.listUsers({ page: 1, pageSize: 200, accountStatus: 'Active' }),
    ]);

    this.interviewTemplateDepartmentChoices = departments.items
      .filter((department) => department.status === 'Active')
      .map((department) => ({ id: department.departmentId, name: department.name }));
    this.interviewTemplateInterviewerChoices = users.items
      .filter((user) => user.accountStatus === 'Active' && !user.roleNames.includes('Candidate'))
      .sort((left, right) => left.displayName.localeCompare(right.displayName));
  }

  openEditSkillDialog(row: string[]): void {
    if (!this.canManageCurrentAdminPage()) {
      this.notifications.error('You do not have permission to edit skills.');
      return;
    }

    this.selectedSkillForEdit.set(this.skillFromRow(row));
  }

  closeEditSkillDialog(): void {
    this.selectedSkillForEdit.set(null);
  }

  openDeleteSkillDialog(row: string[]): void {
    if (!this.canManageCurrentAdminPage()) {
      this.notifications.error('You do not have permission to delete skills.');
      return;
    }

    this.skillDeleteTarget.set(this.skillFromRow(row));
  }

  closeDeleteSkillDialog(): void {
    if (!this.skillActionSaving()) {
      this.skillDeleteTarget.set(null);
    }
  }

  async deleteSkill(skill: AdminSkillListItem): Promise<void> {
    if (!this.canManageCurrentAdminPage()) {
      this.notifications.error('You do not have permission to delete skills.');
      return;
    }

    this.skillActionSaving.set(true);

    try {
      await this.adminCenterApi.deleteSkill(skill.skillId);
      this.notifications.success(`${skill.name} skill deleted.`);
      this.skillDeleteTarget.set(null);
      await this.loadBackendPage('skills');
    } catch (error) {
      this.notifications.error(error instanceof Error ? error.message : 'Skill could not be deleted.');
    } finally {
      this.skillActionSaving.set(false);
    }
  }

  private skillFromRow(row: string[]): AdminSkillListItem {
    return {
      name: row[0] ?? '',
      category: row[1] ?? '',
      aliases: this.aliasesFromCell(row[2]),
      status: row[3] ?? 'Active',
      skillId: row[5] ?? '',
      normalizedName: row[6] ?? '',
      updatedAtUtc: '',
    };
  }

  private aliasesFromCell(value: string | undefined): string[] {
    if (!value || value === 'No aliases') {
      return [];
    }

    return value
      .split(',')
      .map((alias) => alias.trim())
      .filter(Boolean);
  }

  openGroupMembership(row: string[]): void {
    if (!this.canManageCurrentAdminPage()) {
      this.notifications.error('You do not have permission to manage group memberships.');
      return;
    }

    const groupId = row[5] ?? '';
    if (!groupId) {
      this.notifications.error('Group membership could not be opened.');
      return;
    }

    this.selectedGroupMembership.set({
      groupId,
      name: row[0] ?? 'Group',
      purpose: row[1] ?? '',
      memberCount: Number(row[2] ?? 0) || 0,
      status: row[3] ?? 'Active',
    });
  }

  closeGroupMembership(): void {
    this.selectedGroupMembership.set(null);
  }

  handleGroupMembershipChanged(): void {
    void this.loadBackendPage('groups');
  }

  formatAuditTimestamp(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
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

  workflowIntakeAssignmentType(rule: AdminWorkflowIntakeRoutingRuleItem): 'User' | 'Group' {
    return rule.assignmentType === 'User' ? 'User' : 'Group';
  }

  workflowIntakeTargetValue(rule: AdminWorkflowIntakeRoutingRuleItem): string {
    return this.workflowIntakeAssignmentType(rule) === 'User'
      ? rule.targetUserId ?? ''
      : rule.targetGroupId ?? '';
  }

  workflowIntakeTargetChoices(rule: AdminWorkflowIntakeRoutingRuleItem): AccessOption[] {
    return this.workflowIntakeAssignmentType(rule) === 'User'
      ? this.workflowIntakeUserChoices
      : this.workflowIntakeGroupChoices;
  }

  private isPmoIntakeGroupName(name: string): boolean {
    return name.trim().toLowerCase().startsWith('pmo');
  }

  setWorkflowIntakeAssignmentType(rule: AdminWorkflowIntakeRoutingRuleItem, event: Event): void {
    const assignmentType = (event.target as HTMLSelectElement).value === 'User' ? 'User' : 'Group';
    this.patchWorkflowIntakeRule(rule.departmentId, {
      assignmentType,
      targetUserId: null,
      targetGroupId: null,
      assignmentTarget: 'Select recipient',
      usesTenantAdminFallback: true,
      status: rule.status === 'Inactive' ? 'Inactive' : 'Active',
    });
  }

  setWorkflowIntakeTarget(rule: AdminWorkflowIntakeRoutingRuleItem, event: Event): void {
    const targetId = (event.target as HTMLSelectElement).value;
    const assignmentType = this.workflowIntakeAssignmentType(rule);
    const choice = this.workflowIntakeTargetChoices({ ...rule, assignmentType }).find((item) => item.id === targetId);
    this.patchWorkflowIntakeRule(rule.departmentId, {
      assignmentType,
      targetUserId: assignmentType === 'User' ? targetId || null : null,
      targetGroupId: assignmentType === 'Group' ? targetId || null : null,
      assignmentTarget: choice?.name ?? 'Select recipient',
      usesTenantAdminFallback: !targetId,
      status: rule.status === 'Inactive' ? 'Inactive' : 'Active',
    });
  }

  setWorkflowIntakeStatus(rule: AdminWorkflowIntakeRoutingRuleItem, event: Event): void {
    const status = (event.target as HTMLSelectElement).value === 'Inactive' ? 'Inactive' : 'Active';
    this.patchWorkflowIntakeRule(rule.departmentId, {
      status,
      usesTenantAdminFallback: status !== 'Active' || !this.workflowIntakeTargetValue(rule),
    });
  }

  async saveWorkflowIntakeRouting(): Promise<void> {
    if (!this.canManageCurrentAdminPage()) {
      this.notifications.error('You do not have permission to edit workflow routing.');
      return;
    }

    const rules = this.workflowIntakeRoutingRules()
      .filter((rule) => Boolean(this.workflowIntakeTargetValue(rule)))
      .map((rule) => ({
        departmentId: rule.departmentId,
        assignmentType: this.workflowIntakeAssignmentType(rule),
        targetUserId: this.workflowIntakeAssignmentType(rule) === 'User' ? rule.targetUserId ?? null : null,
        targetGroupId: this.workflowIntakeAssignmentType(rule) === 'Group' ? rule.targetGroupId ?? null : null,
        status: rule.status === 'Inactive' ? 'Inactive' : 'Active',
      }));

    if (rules.length === 0) {
      this.notifications.error('Select at least one department routing target before saving.');
      return;
    }

    this.workflowIntakeRoutingSaving.set(true);
    try {
      const response = await this.adminCenterApi.updateWorkflowIntakeRouting({ rules });
      this.workflowIntakeRoutingRules.set(response.intakeRoutingRules);
      this.setBackendPageOverride('workflows', this.toWorkflowsPage(response));
      this.notifications.success('Department routing saved.');
    } catch (error) {
      this.notifications.error(error instanceof Error ? error.message : 'Department routing could not be saved.');
    } finally {
      this.workflowIntakeRoutingSaving.set(false);
    }
  }

  private patchWorkflowIntakeRule(
    departmentId: string,
    patch: Partial<AdminWorkflowIntakeRoutingRuleItem>,
  ): void {
    this.workflowIntakeRoutingRules.update((rules) =>
      rules.map((rule) => (rule.departmentId === departmentId ? { ...rule, ...patch } : rule)),
    );
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
      const saved = await this.adminSettingsApi.updateTenantProfile(this.toTenantProfileUpdateInput());
      this.patchTenantProfileForm(saved);
      this.patchCompanyLogoPreview(saved);
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

  async saveIntegrationEmailSender(): Promise<void> {
    if (!this.canManageCurrentAdminPage()) {
      this.notifications.error('You do not have permission to manage integrations.');
      return;
    }

    const providerControl = this.tenantProfileForm.controls.notificationEmailProvider;
    providerControl.markAsTouched();

    if (providerControl.invalid) {
      this.notifications.error('Select a valid email sender provider.');
      return;
    }

    if (providerControl.value === this.savedTenantProfile().notificationEmailProvider) {
      return;
    }

    this.saving.set(true);
    this.formMessage.set('');

    try {
      const saved = await this.adminSettingsApi.updateTenantProfile(
        this.toTenantProfileUpdateInputWithEmailProvider(providerControl.value),
      );
      this.patchTenantProfileForm(saved);
      this.patchCompanyLogoPreview(saved);
      this.formMessageIsError.set(false);
      this.formMessage.set('Email sender saved.');
      this.notifications.success('Email sender saved.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Email sender could not be saved.';
      this.formMessageIsError.set(true);
      this.formMessage.set(message);
      this.notifications.error(message);
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
    this.patchCompanyLogoPreview(saved);
    this.formMessageIsError.set(false);
    this.formMessage.set('Unsaved tenant changes were reset.');
    this.notifications.info('Unsaved tenant changes were reset.');
  }

  private patchCompanyLogoPreview(saved: TenantProfileSettings): void {
    this.companyLogoFileName.set(saved.logoFileName ?? '');
    this.companyLogoContentType.set(saved.logoContentType ?? null);
    this.companyLogoContentBase64.set(saved.logoContentBase64 ?? null);
    this.companyLogoPreviewUrl.set(this.toLogoDataUrl(saved.logoContentType, saved.logoContentBase64));
    this.companyLogoDirty.set(false);
  }

  private patchTenantProfileForm(saved: TenantProfileSettings): void {
    this.tenantProfileForm.reset(this.toTenantProfileFormValue(saved));
  }

  private patchPristineTenantProfileControls(saved: TenantProfileSettings): void {
    const savedValues = this.toTenantProfileFormValue(saved);

    for (const [controlName, value] of Object.entries(savedValues)) {
      const control = this.tenantProfileForm.get(controlName);
      if (control?.pristine) {
        control.setValue(value, { emitEvent: false });
      }
    }

    this.tenantProfileForm.updateValueAndValidity({ emitEvent: true });
  }

  private toTenantProfileUpdateInput(): UpdateTenantProfileSettingsInput {
    return {
      ...this.tenantProfileForm.getRawValue(),
      logoFileName: this.companyLogoFileName() || null,
      logoContentType: this.companyLogoContentType(),
      logoContentBase64: this.companyLogoContentBase64(),
    };
  }

  private toTenantProfileUpdateInputWithEmailProvider(
    notificationEmailProvider: NotificationEmailProvider,
  ): UpdateTenantProfileSettingsInput {
    const saved = this.savedTenantProfile();

    return {
      displayName: saved.displayName,
      slug: saved.slug,
      domain: saved.domain,
      adminContactEmail: saved.adminContactEmail,
      defaultTimezone: saved.defaultTimezone,
      defaultCurrency: saved.defaultCurrency,
      status: saved.status,
      careerDisplayName: saved.careerDisplayName,
      companyAddress: saved.companyAddress ?? '',
      companyCity: saved.companyCity ?? '',
      companyCountry: saved.companyCountry ?? '',
      officialEmail: saved.officialEmail ?? '',
      officialPhone: saved.officialPhone ?? '',
      primaryColor: saved.primaryColor,
      candidateLoginRequired: saved.candidateLoginRequired,
      candidateCvFormat: saved.candidateCvFormat,
      publicJobsEnabled: saved.publicJobsEnabled,
      inviteExpiryDays: saved.inviteExpiryDays,
      reapplyCooldownDays: saved.reapplyCooldownDays,
      notificationEmailProvider,
      logoFileName: saved.logoFileName ?? null,
      logoContentType: saved.logoContentType ?? null,
      logoContentBase64: saved.logoContentBase64 ?? null,
    };
  }

  private toLogoDataUrl(contentType?: string | null, contentBase64?: string | null): string | null {
    return contentType && contentBase64 ? `data:${contentType};base64,${contentBase64}` : null;
  }

  private toTenantProfileFormValue(saved: TenantProfileSettings): ReturnType<typeof this.tenantProfileForm.getRawValue> {
    return {
      displayName: saved.displayName,
      slug: saved.slug,
      domain: saved.domain,
      adminContactEmail: saved.adminContactEmail,
      defaultTimezone: saved.defaultTimezone,
      defaultCurrency: saved.defaultCurrency,
      status: saved.status,
      careerDisplayName: saved.careerDisplayName,
      companyAddress: saved.companyAddress ?? '',
      companyCity: saved.companyCity ?? '',
      companyCountry: saved.companyCountry ?? '',
      officialEmail: saved.officialEmail ?? '',
      officialPhone: saved.officialPhone ?? '',
      primaryColor: saved.primaryColor,
      candidateLoginRequired: saved.candidateLoginRequired,
      candidateCvFormat: saved.candidateCvFormat,
      publicJobsEnabled: saved.publicJobsEnabled,
      inviteExpiryDays: saved.inviteExpiryDays,
      reapplyCooldownDays: saved.reapplyCooldownDays,
      notificationEmailProvider: saved.notificationEmailProvider,
    };
  }
}
