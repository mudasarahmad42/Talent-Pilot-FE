import { HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SUPPRESS_API_ERROR_TOAST } from './interceptors/api-error.interceptor';
import { ApiService } from './services/api.service';

export interface FileDownload {
  blob: Blob;
  fileName: string;
}

export interface AdminListQuery {
  search?: string;
  roleId?: string;
  groupId?: string;
  accountStatus?: string;
  status?: string;
  page?: number;
  pageSize?: number;
  includeInactive?: boolean;
}

export interface AdminUsersResponse {
  summary: {
    internalUserCount: number;
    routingGroupCount: number;
    benchVisibilityPolicy: {
      roleId: string;
      roleName: string;
      configuredIn: string;
    };
  };
  items: AdminUserListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface AdminUserListItem {
  id: string;
  displayName: string;
  email: string;
  initials: string;
  roleIds: string[];
  roleNames: string[];
  highestPriorityRoleId: string;
  highestPriorityRoleName: string;
  highestPriorityRolePriority: number;
  groupIds: string[];
  groupNames: string[];
  departmentId?: string | null;
  departmentName?: string | null;
  experienceYears?: number | null;
  joiningDate?: string | null;
  completedInterviewCount: number;
  accountStatus: string;
  lastActiveAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserDetails {
  id: string;
  displayName: string;
  email: string;
  initials: string;
  roleIds: string[];
  groupIds: string[];
  accountStatus: string;
  lastActiveAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SaveAdminUserInput {
  displayName: string;
  email: string;
  roleIds: string[];
  groupIds: string[];
  accountStatus: string;
}

export interface UpdateAdminUserStatusInput {
  accountStatus: string;
  reason: string | null;
}

export interface AdminRolesResponse {
  summary: {
    activeRoleCount: number;
    tenantRoleCount: number;
    customRoleCount: number;
  };
  items: AdminRoleListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface AdminRoleListItem {
  roleId: string;
  name: string;
  type: string;
  scope: string;
  assignedUserCount: number;
  permissionSummary: string;
  lifecycleStatus: string;
  isProtected: boolean;
  isBulkAssignable: boolean;
}

export interface PermissionCatalogItem {
  permissionId: string;
  displayName: string;
  groupName: string;
  description: string;
  status: string;
}

export interface PermissionResolutionPolicy {
  mode: 'MergeAllAssignedRoles' | 'HighestPriorityRoleOnly';
  updatedAtUtc: string;
  updatedByUserId: string;
}

export interface AdminGroupsResponse {
  items: AdminGroupListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface AdminDepartmentsResponse {
  summary: {
    activeDepartmentCount: number;
    totalEmployeeCount: number;
    openJobRequestCount: number;
    inactiveDepartmentCount: number;
  };
  items: AdminDepartmentListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface AdminDepartmentListItem {
  departmentId: string;
  code: string;
  name: string;
  leadName: string;
  employeeCount: number;
  openJobRequestCount: number;
  status: string;
}

export interface CreateDepartmentInput {
  code: string;
  name: string;
  status: string;
}

export interface AdminGroupListItem {
  groupId: string;
  name: string;
  purpose: string;
  status: string;
  memberCount: number;
}

export interface CreateGroupInput {
  name: string;
  purpose: string;
  status: string;
}

export type GroupMembershipFilter = 'All' | 'Members' | 'Available';

export interface AdminGroupMembershipQuery extends AdminListQuery {
  membership?: GroupMembershipFilter;
}

export interface AdminGroupMembershipResponse {
  group: AdminGroupListItem;
  summary: {
    memberCount: number;
    availableUserCount: number;
    filteredMemberCount: number;
    filteredAvailableUserCount: number;
  };
  items: AdminGroupMembershipUser[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface AdminGroupMembershipUser {
  userId: string;
  displayName: string;
  email: string;
  initials: string;
  roleNames: string[];
  accountStatus: string;
  isMember: boolean;
  isDefaultAssignee: boolean;
}

export interface UpdateGroupMembersInput {
  userIdsToAdd: string[];
  userIdsToRemove: string[];
  bulkSelection?: BulkGroupMembershipSelection | null;
}

export interface BulkGroupMembershipSelection {
  mode: 'AddMatching' | 'RemoveMatching';
  search?: string | null;
  membership?: GroupMembershipFilter | null;
}

export interface UpdateGroupMembersResult {
  addedCount: number;
  removedCount: number;
  memberCount: number;
}

export interface AdminSkillsResponse {
  summary: {
    activeSkillCount: number;
    categoryCount: number;
    aliasCount: number;
  };
  items: AdminSkillListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface AdminSkillListItem {
  skillId: string;
  name: string;
  normalizedName: string;
  category: string;
  aliases: string[];
  status: string;
  updatedAtUtc: string;
}

export interface CreateSkillInput {
  name: string;
  category: string;
  aliases: string[];
  status: string;
}

export interface UpdateSkillInput {
  name: string;
  category: string;
  aliases: string[];
  status: string;
}

export interface AdminNotificationEventsResponse {
  summary: {
    activeEventCount: number;
    editableTemplateCount: number;
    pendingOutboxCount: number;
    sentOutboxCount: number;
    failedOutboxCount: number;
  };
  items: AdminNotificationEventListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface AdminNotificationEventListItem {
  eventId: string;
  eventCode: string;
  name: string;
  recipient: string;
  templateName: string;
  lifecycleStatus: string;
  updatedAtUtc: string;
}

export interface AdminNotificationTemplatesResponse {
  summary: AdminNotificationEventsResponse['summary'];
  items: NotificationTemplateSummary[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface AdminNotificationOutboxResponse {
  workerStatus?: AdminNotificationWorkerStatus | null;
  items: AdminNotificationOutboxItem[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface AdminNotificationWorkerStatus {
  state: string;
  label: string;
  message: string;
  lastHeartbeatUtc?: string | null;
  startedAtUtc?: string | null;
  lastProcessedAtUtc?: string | null;
  lastProcessedCount?: number | null;
  hostName?: string | null;
  processId?: number | null;
  lastError?: string | null;
  pollIntervalSeconds: number;
  staleAfterSeconds: number;
  pendingDueCount: number;
  processingCount: number;
}

export interface AdminNotificationOutboxItem {
  outboxId: string;
  eventCode: string;
  eventName: string;
  templateName: string;
  senderDisplayName: string;
  recipientDisplayName?: string | null;
  recipientEmail?: string | null;
  channel: string;
  status: string;
  attemptCount: number;
  availableAtUtc: string;
  createdAtUtc: string;
  updatedAtUtc: string;
  processedAtUtc?: string | null;
  lastError?: string | null;
  subject: string;
  body: string;
  entityType?: string | null;
  entityId?: string | null;
}

export interface NotificationTemplateSummary {
  templateId: string;
  eventCode: string;
  name: string;
  recipient: string;
  subject: string;
  body: string;
  variables: string[];
  lifecycleStatus: string;
  updatedAtUtc: string;
  updatedByUserId: string;
}

export interface UpdateNotificationTemplateInput {
  subject: string;
  body: string;
}

export interface SendTestNotificationEmailInput {
  toEmail: string;
}

export interface SendTestNotificationEmailResponse {
  toEmail: string;
  subject: string;
  provider: string;
  messageId: string;
  submittedAtUtc: string;
}

export interface NotificationEmailSenderConfigurationResponse {
  providers: NotificationEmailSenderProviderConfiguration[];
}

export interface NotificationEmailSenderProviderConfiguration {
  provider: string;
  providerLabel: string;
  senderEmail?: string | null;
  senderConfigured: boolean;
}

export interface SendTestRealtimeNotificationResponse {
  notificationId: string;
  title: string;
  message: string;
  connectedClientCount: number;
  sentAtUtc: string;
}

export interface NotificationRealtimeConnectionStatusResponse {
  connectedClientCount: number;
  checkedAtUtc: string;
}

export interface AdminCandidateSourcesResponse {
  summary: {
    activeSourceCount: number;
    reportingCategoryCount: number;
    inactiveSourceCount: number;
  };
  items: AdminCandidateSourceListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface AdminCandidateSourceListItem {
  candidateSourceLabelId: string;
  code: string;
  displayName: string;
  reportingCategory: string;
  status: string;
  updatedAtUtc: string;
}

export interface AdminWorkflowConfigurationResponse {
  summary: {
    workflowDefinitionCount: number;
    activeStageCount: number;
    activeTransitionCount: number;
    activeRoutingRuleCount: number;
    activeIntakeRoutingRuleCount: number;
    departmentsNeedingIntakeRoutingCount: number;
  };
  definitions: AdminWorkflowDefinitionItem[];
  stages: AdminWorkflowStageItem[];
  routingRules: AdminWorkflowRoutingRuleItem[];
  intakeRoutingRules: AdminWorkflowIntakeRoutingRuleItem[];
}

export interface AdminWorkflowDefinitionItem {
  workflowDefinitionId: string;
  code: string;
  name: string;
  entityType: string;
  status: string;
  updatedAtUtc: string;
}

export interface AdminWorkflowStageItem {
  workflowStageId: string;
  stageKey: string;
  name: string;
  stageOrder: number;
  isTerminal: boolean;
  status: string;
}

export interface AdminWorkflowRoutingRuleItem {
  workflowRoutingRuleId: string;
  workflowTransitionId: string;
  actionKey: string;
  actionName: string;
  fromStage: string;
  toStage: string;
  assignmentType: string;
  assignmentTarget: string;
  resolverKey: string;
  status: string;
}

export interface AdminWorkflowIntakeRoutingRuleItem {
  jobRequestIntakeRoutingRuleId?: string | null;
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  assignmentType: string;
  targetUserId?: string | null;
  targetGroupId?: string | null;
  assignmentTarget: string;
  status: string;
  usesTenantAdminFallback: boolean;
}

export interface UpdateAdminWorkflowIntakeRoutingInput {
  rules: UpdateAdminWorkflowIntakeRoutingItem[];
}

export interface UpdateAdminWorkflowIntakeRoutingItem {
  departmentId: string;
  assignmentType: string;
  targetUserId?: string | null;
  targetGroupId?: string | null;
  status: string;
}

export interface AdminHiringPipelineTemplatesResponse {
  summary: {
    activeTemplateCount: number;
    departmentSpecificTemplateCount: number;
    activeRoundCount: number;
    missingInterviewerRoundCount: number;
  };
  items: AdminHiringPipelineTemplateItem[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface AdminHiringPipelineTemplateItem {
  interviewTemplateId: string;
  name: string;
  departmentName: string;
  description: string;
  stageFlow: string;
  defaultInterviewers: string;
  roundCount: number;
  status: string;
  updatedAtUtc: string;
}

export interface AdminHiringPipelineTemplateDetails {
  interviewTemplateId: string;
  departmentId?: string | null;
  name: string;
  departmentName: string;
  description: string;
  status: string;
  updatedAtUtc: string;
  rounds: AdminHiringPipelineTemplateRoundItem[];
}

export interface AdminHiringPipelineTemplateRoundItem {
  interviewTemplateRoundId: string;
  roundOrder: number;
  name: string;
  ownerRoleId?: string | null;
  ownerRoleName: string;
  ownerUserId?: string | null;
  ownerUserName: string;
  durationMinutes: number;
  isRequired: boolean;
  status: string;
}

export interface UpdateAdminHiringPipelineTemplateInput {
  name: string;
  departmentId?: string | null;
  description?: string | null;
  status: string;
  rounds: UpdateAdminHiringPipelineTemplateRoundInput[];
}

export interface UpdateAdminHiringPipelineTemplateRoundInput {
  interviewTemplateRoundId?: string | null;
  roundOrder: number;
  name: string;
  ownerRoleId?: string | null;
  ownerUserId?: string | null;
  durationMinutes: number;
  isRequired: boolean;
  status: string;
}

export interface AdminAiRuntimeResponse {
  provider: string;
  llmModel: string;
  embeddingModel: string;
  embeddingDimensions: number;
  vectorStore: string;
  runtimeEditable: boolean;
}

export interface AdminLlmHealthResponse {
  available: boolean;
  status: string;
  message: string;
  provider: string;
  llmModel: string;
  ollamaBaseUrl: string;
}

export interface AdminSemanticSimilarityHealthResponse {
  available: boolean;
  status: string;
  message: string;
  provider: string;
  embeddingModel: string;
  embeddingDimensions: number;
  vectorStore: string;
  ollamaBaseUrl: string;
}

export interface AdminAiAgentListResponse {
  activeAgentCount: number;
  items: AdminAiAgentDefinition[];
}

export interface AdminAiAgentDefinition {
  id: string;
  displayName: string;
  responsibility: string;
  inputSummary: string;
  outputSummary: string;
  mvpBoundary: string;
  enabled: boolean;
}

export interface AdminAiGuardrailsResponse {
  humanReviewRequired: boolean;
  autoRejectEnabled: boolean;
  decisionBoundary: string;
  items: AdminAiGuardrailItem[];
}

export interface AdminAiGuardrailItem {
  name: string;
  value: string;
  reason: string;
}

export interface AdminAiAgentRunListResponse {
  totalCount: number;
  items: AdminAiAgentRunListItem[];
}

export interface AdminAiAgentRunListItem {
  aiAgentRunId: string;
  agentId: string;
  agentName: string;
  sourceEntityType: string;
  sourceEntityId: string;
  modelName: string;
  embeddingModelName?: string | null;
  status: string;
  startedAtUtc: string;
  completedAtUtc?: string | null;
  durationMs?: number | null;
  outputSummary?: string | null;
  inputHash: string;
  promptVersion?: string | null;
  semanticSimilarityStatus?: string | null;
  humanDecisionRequired: boolean;
  failureType?: string | null;
}

export interface AdminAiEvaluationResponse {
  overallStatus: string;
  scorePercent: number;
  generatedAtUtc: string;
  items: AdminAiEvaluationItem[];
}

export interface AdminAiEvaluationItem {
  name: string;
  status: string;
  rubricArea: string;
  evidence: string;
  nextStep: string;
}

export interface AdminAuditLogListResponse {
  summary: {
    eventsToday: number;
    configChanges: number;
    workflowDecisions: number;
    aiEvents: number;
  };
  items: AdminAuditLogListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface AdminAuditLogListItem {
  id: string;
  occurredAtUtc: string;
  actorDisplayName: string;
  eventSummary: string;
  recordLabel: string;
  area: string;
}

export interface RoleUserAssignmentPreview {
  matchedCount: number;
  alreadyAssignedCount: number;
  assignableCount: number;
  sampleUsers: RoleUserAssignmentPreviewItem[];
}

export interface RoleUserAssignmentPreviewItem {
  userId: string;
  displayName: string;
  email: string;
  departmentName?: string | null;
  currentHighestPriorityRoleName?: string | null;
  accountStatus: string;
}

@Injectable({ providedIn: 'root' })
export class AdminCenterApiService {
  private readonly api = inject(ApiService);

  listUsers(query: AdminListQuery = {}): Promise<AdminUsersResponse> {
    return firstValueFrom(this.api.get<AdminUsersResponse>(`admin/users?${this.toQueryString(query)}`));
  }

  getUser(userId: string): Promise<AdminUserDetails> {
    return firstValueFrom(this.api.get<AdminUserDetails>(`admin/users/${encodeURIComponent(userId)}`));
  }

  updateUser(userId: string, input: SaveAdminUserInput): Promise<AdminUserDetails> {
    return firstValueFrom(
      this.api.put<AdminUserDetails, SaveAdminUserInput>(`admin/users/${encodeURIComponent(userId)}`, input),
    );
  }

  updateUserStatus(userId: string, input: UpdateAdminUserStatusInput): Promise<void> {
    return firstValueFrom(
      this.api.patch<void, UpdateAdminUserStatusInput>(`admin/users/${encodeURIComponent(userId)}/account-status`, input),
    );
  }

  resendUserInvite(userId: string): Promise<void> {
    return firstValueFrom(
      this.api.post<void, Record<string, never>>(`admin/users/${encodeURIComponent(userId)}/invites/resend`, {}),
    );
  }

  listRoles(query: AdminListQuery = {}): Promise<AdminRolesResponse> {
    return firstValueFrom(this.api.get<AdminRolesResponse>(`admin/roles?${this.toQueryString(query)}`));
  }

  listPermissions(): Promise<PermissionCatalogItem[]> {
    return firstValueFrom(this.api.get<PermissionCatalogItem[]>('admin/roles/permissions'));
  }

  getPermissionResolutionPolicy(): Promise<PermissionResolutionPolicy> {
    return firstValueFrom(this.api.get<PermissionResolutionPolicy>('admin/access-policies/permission-resolution'));
  }

  listGroups(query: AdminListQuery = {}): Promise<AdminGroupsResponse> {
    return firstValueFrom(this.api.get<AdminGroupsResponse>(`admin/groups?${this.toQueryString(query)}`));
  }

  listDepartments(query: AdminListQuery = {}): Promise<AdminDepartmentsResponse> {
    return firstValueFrom(this.api.get<AdminDepartmentsResponse>(`admin/departments?${this.toQueryString(query)}`));
  }

  createDepartment(input: CreateDepartmentInput): Promise<AdminDepartmentListItem> {
    return firstValueFrom(this.api.post<AdminDepartmentListItem, CreateDepartmentInput>('admin/departments', input));
  }

  createGroup(input: CreateGroupInput): Promise<AdminGroupListItem> {
    return firstValueFrom(this.api.post<AdminGroupListItem, CreateGroupInput>('admin/groups', input));
  }

  listGroupMembership(groupId: string, query: AdminGroupMembershipQuery = {}): Promise<AdminGroupMembershipResponse> {
    const params = new URLSearchParams(this.toQueryString(query));
    params.set('membership', query.membership ?? 'All');
    return firstValueFrom(
      this.api.get<AdminGroupMembershipResponse>(
        `admin/groups/${encodeURIComponent(groupId)}/membership?${params.toString()}`,
      ),
    );
  }

  updateGroupMembers(groupId: string, input: UpdateGroupMembersInput): Promise<UpdateGroupMembersResult> {
    return firstValueFrom(
      this.api.patch<UpdateGroupMembersResult, UpdateGroupMembersInput>(
        `admin/groups/${encodeURIComponent(groupId)}/members`,
        input,
      ),
    );
  }

  listSkills(query: AdminListQuery = {}): Promise<AdminSkillsResponse> {
    return firstValueFrom(this.api.get<AdminSkillsResponse>(`admin/skills?${this.toQueryString(query)}`));
  }

  createSkill(input: CreateSkillInput): Promise<AdminSkillListItem> {
    return firstValueFrom(this.api.post<AdminSkillListItem, CreateSkillInput>('admin/skills', input));
  }

  updateSkill(skillId: string, input: UpdateSkillInput): Promise<AdminSkillListItem> {
    return firstValueFrom(
      this.api.put<AdminSkillListItem, UpdateSkillInput>(`admin/skills/${encodeURIComponent(skillId)}`, input),
    );
  }

  deleteSkill(skillId: string): Promise<void> {
    return firstValueFrom(this.api.delete<void>(`admin/skills/${encodeURIComponent(skillId)}`));
  }

  listNotificationEvents(query: AdminListQuery = {}): Promise<AdminNotificationEventsResponse> {
    return firstValueFrom(
      this.api.get<AdminNotificationEventsResponse>(`admin/notifications/events?${this.toQueryString(query)}`),
    );
  }

  listNotificationTemplates(query: AdminListQuery = {}): Promise<AdminNotificationTemplatesResponse> {
    return firstValueFrom(
      this.api.get<AdminNotificationTemplatesResponse>(`admin/notifications/templates?${this.toQueryString(query)}`),
    );
  }

  listNotificationOutbox(query: AdminListQuery = {}): Promise<AdminNotificationOutboxResponse> {
    return firstValueFrom(
      this.api.get<AdminNotificationOutboxResponse>(`admin/notifications/outbox?${this.toQueryString(query)}`),
    );
  }

  retryNotificationOutboxEmail(outboxId: string): Promise<AdminNotificationOutboxItem> {
    return firstValueFrom(
      this.api.post<AdminNotificationOutboxItem, Record<string, never>>(
        `admin/notifications/outbox/${encodeURIComponent(outboxId)}/retry`,
        {},
      ),
    );
  }

  updateNotificationTemplate(
    templateId: string,
    input: UpdateNotificationTemplateInput,
  ): Promise<NotificationTemplateSummary> {
    return firstValueFrom(
      this.api.put<NotificationTemplateSummary, UpdateNotificationTemplateInput>(
        `admin/notifications/templates/${encodeURIComponent(templateId)}`,
        input,
      ),
    );
  }

  sendNotificationTestEmail(input: SendTestNotificationEmailInput): Promise<SendTestNotificationEmailResponse> {
    return firstValueFrom(
      this.api.post<SendTestNotificationEmailResponse, SendTestNotificationEmailInput>(
        'admin/notifications/test-email',
        input,
      ),
    );
  }

  listNotificationEmailSenders(): Promise<NotificationEmailSenderConfigurationResponse> {
    return firstValueFrom(
      this.api.get<NotificationEmailSenderConfigurationResponse>('admin/notifications/email-senders'),
    );
  }

  sendNotificationRealtimeTest(): Promise<SendTestRealtimeNotificationResponse> {
    return firstValueFrom(
      this.api.post<SendTestRealtimeNotificationResponse, Record<string, never>>(
        'admin/notifications/test-realtime',
        {},
      ),
    );
  }

  getNotificationRealtimeConnectionStatus(): Promise<NotificationRealtimeConnectionStatusResponse> {
    return firstValueFrom(
      this.api.get<NotificationRealtimeConnectionStatusResponse>('admin/notifications/realtime/status'),
    );
  }

  getAiRuntime(): Promise<AdminAiRuntimeResponse> {
    return firstValueFrom(this.api.get<AdminAiRuntimeResponse>('admin/ai-settings/runtime'));
  }

  getAiLlmHealth(): Promise<AdminLlmHealthResponse> {
    return firstValueFrom(this.api.get<AdminLlmHealthResponse>(
      'admin/ai-settings/runtime/llm',
      { context: new HttpContext().set(SUPPRESS_API_ERROR_TOAST, true) },
    ));
  }

  getAiSemanticSimilarityHealth(): Promise<AdminSemanticSimilarityHealthResponse> {
    return firstValueFrom(this.api.get<AdminSemanticSimilarityHealthResponse>(
      'admin/ai-settings/runtime/semantic-similarity',
      { context: new HttpContext().set(SUPPRESS_API_ERROR_TOAST, true) },
    ));
  }

  getAiAgents(): Promise<AdminAiAgentListResponse> {
    return firstValueFrom(this.api.get<AdminAiAgentListResponse>('admin/ai-settings/agents'));
  }

  getAiGuardrails(): Promise<AdminAiGuardrailsResponse> {
    return firstValueFrom(this.api.get<AdminAiGuardrailsResponse>('admin/ai-settings/guardrails'));
  }

  getAiAgentRuns(count = 12): Promise<AdminAiAgentRunListResponse> {
    const params = new URLSearchParams({ count: String(count) });
    return firstValueFrom(this.api.get<AdminAiAgentRunListResponse>(`admin/ai-settings/agent-runs?${params}`));
  }

  getAiEvaluation(): Promise<AdminAiEvaluationResponse> {
    return firstValueFrom(this.api.get<AdminAiEvaluationResponse>('admin/ai-settings/evaluation'));
  }

  listCandidateSources(query: AdminListQuery = {}): Promise<AdminCandidateSourcesResponse> {
    return firstValueFrom(
      this.api.get<AdminCandidateSourcesResponse>(`admin/candidate-sources?${this.toQueryString(query)}`),
    );
  }

  getWorkflowConfiguration(): Promise<AdminWorkflowConfigurationResponse> {
    return firstValueFrom(this.api.get<AdminWorkflowConfigurationResponse>('admin/workflows/configuration'));
  }

  updateWorkflowIntakeRouting(input: UpdateAdminWorkflowIntakeRoutingInput): Promise<AdminWorkflowConfigurationResponse> {
    return firstValueFrom(
      this.api.put<AdminWorkflowConfigurationResponse, UpdateAdminWorkflowIntakeRoutingInput>(
        'admin/workflows/intake-routing',
        input,
      ),
    );
  }

  listHiringPipelineTemplates(query: AdminListQuery = {}): Promise<AdminHiringPipelineTemplatesResponse> {
    return firstValueFrom(
      this.api.get<AdminHiringPipelineTemplatesResponse>(`admin/hiring-pipeline/templates?${this.toQueryString(query)}`),
    );
  }

  getHiringPipelineTemplate(templateId: string): Promise<AdminHiringPipelineTemplateDetails> {
    return firstValueFrom(
      this.api.get<AdminHiringPipelineTemplateDetails>(
        `admin/hiring-pipeline/templates/${encodeURIComponent(templateId)}`,
      ),
    );
  }

  createHiringPipelineTemplate(
    input: UpdateAdminHiringPipelineTemplateInput,
  ): Promise<AdminHiringPipelineTemplateDetails> {
    return firstValueFrom(
      this.api.post<AdminHiringPipelineTemplateDetails, UpdateAdminHiringPipelineTemplateInput>(
        'admin/hiring-pipeline/templates',
        input,
      ),
    );
  }

  updateHiringPipelineTemplate(
    templateId: string,
    input: UpdateAdminHiringPipelineTemplateInput,
  ): Promise<AdminHiringPipelineTemplateDetails> {
    return firstValueFrom(
      this.api.put<AdminHiringPipelineTemplateDetails, UpdateAdminHiringPipelineTemplateInput>(
        `admin/hiring-pipeline/templates/${encodeURIComponent(templateId)}`,
        input,
      ),
    );
  }

  listAuditLogs(query = ''): Promise<AdminAuditLogListResponse> {
    const params = new URLSearchParams(query);
    if (!params.has('page')) {
      params.set('page', '1');
    }

    if (!params.has('pageSize')) {
      params.set('pageSize', '25');
    }

    return firstValueFrom(this.api.get<AdminAuditLogListResponse>(`admin/audit-logs?${params.toString()}`));
  }

  async exportAuditLogs(query = ''): Promise<FileDownload> {
    const params = new URLSearchParams(query);
    const response = await firstValueFrom(this.api.download(`admin/audit-logs/export?${params.toString()}`));

    return {
      blob: response.body ?? new Blob(),
      fileName: this.fileNameFromDisposition(response.headers.get('content-disposition')) ?? 'audit-logs.xlsx',
    };
  }

  previewRoleAssignments(roleId: string): Promise<RoleUserAssignmentPreview> {
    return firstValueFrom(
      this.api.post<RoleUserAssignmentPreview, Record<string, unknown>>(
        `admin/roles/${roleId}/user-assignment-preview`,
        {
          search: null,
          accountStatuses: ['Active'],
          departmentIds: [],
          currentRoleIds: [],
          groupIds: [],
        },
      ),
    );
  }

  private fileNameFromDisposition(disposition: string | null): string | null {
    if (!disposition) {
      return null;
    }

    const encodedMatch = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
    if (encodedMatch?.[1]) {
      return decodeURIComponent(encodedMatch[1].replace(/"/g, ''));
    }

    const plainMatch = /filename="?([^";]+)"?/i.exec(disposition);
    return plainMatch?.[1] ?? null;
  }

  private toQueryString(query: AdminListQuery): string {
    const params = new URLSearchParams();

    if (query.search?.trim()) {
      params.set('search', query.search.trim());
    }

    if (query.roleId) {
      params.set('roleId', query.roleId);
    }

    if (query.groupId) {
      params.set('groupId', query.groupId);
    }

    if (query.accountStatus) {
      params.set('accountStatus', query.accountStatus);
    }

    if (query.status) {
      params.set('status', query.status);
    }

    params.set('page', String(query.page ?? 1));
    params.set('pageSize', String(query.pageSize ?? 25));
    if (query.includeInactive !== undefined) {
      params.set('includeInactive', String(query.includeInactive));
    }
    return params.toString();
  }
}
