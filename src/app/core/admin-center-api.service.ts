import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Notification } from './models';
import { ApiService } from './services/api.service';

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
  accountStatus: string;
  lastActiveAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminRolesResponse {
  summary: {
    activeRoleCount: number;
    protectedRoleCount: number;
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

export interface AdminGroupListItem {
  groupId: string;
  name: string;
  purpose: string;
  status: string;
  memberCount: number;
}

export interface AdminNotificationEventsResponse {
  summary: {
    activeEventCount: number;
    editableTemplateCount: number;
    pendingOutboxCount: number;
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

export interface AdminAiRuntimeResponse {
  provider: string;
  llmModel: string;
  embeddingModel: string;
  embeddingDimensions: number;
  vectorStore: string;
  runtimeEditable: boolean;
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
}

export interface AdminIntegrationStatusResponse {
  readOnly: boolean;
  totalCount: number;
  items: AdminIntegrationStatusItem[];
}

export interface AdminIntegrationStatusItem {
  id: string;
  displayName: string;
  category: string;
  status: string;
  enabled: boolean;
  editable: boolean;
  runtimeMode: string;
  deliveryPath: string;
  mvpContract: string;
  metrics: AdminIntegrationMetric[];
}

export interface AdminIntegrationMetric {
  name: string;
  value: number;
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

  listUsers(): Promise<AdminUsersResponse> {
    return firstValueFrom(this.api.get<AdminUsersResponse>('admin/users?pageSize=100'));
  }

  listRoles(): Promise<AdminRolesResponse> {
    return firstValueFrom(this.api.get<AdminRolesResponse>('admin/roles?pageSize=100'));
  }

  listPermissions(): Promise<PermissionCatalogItem[]> {
    return firstValueFrom(this.api.get<PermissionCatalogItem[]>('admin/roles/permissions'));
  }

  getPermissionResolutionPolicy(): Promise<PermissionResolutionPolicy> {
    return firstValueFrom(this.api.get<PermissionResolutionPolicy>('admin/access-policies/permission-resolution'));
  }

  listGroups(): Promise<AdminGroupsResponse> {
    return firstValueFrom(this.api.get<AdminGroupsResponse>('admin/groups?pageSize=100'));
  }

  listNotificationEvents(): Promise<AdminNotificationEventsResponse> {
    return firstValueFrom(this.api.get<AdminNotificationEventsResponse>('admin/notifications/events?pageSize=100'));
  }

  listNotificationTemplates(): Promise<NotificationTemplateSummary[]> {
    return firstValueFrom(this.api.get<NotificationTemplateSummary[]>('admin/notifications/templates'));
  }

  sendTestNotification(): Promise<Notification> {
    return firstValueFrom(this.api.post<Notification, Record<string, never>>('admin/notifications/test', {}));
  }

  getAiRuntime(): Promise<AdminAiRuntimeResponse> {
    return firstValueFrom(this.api.get<AdminAiRuntimeResponse>('admin/ai-settings/runtime'));
  }

  getAiAgents(): Promise<AdminAiAgentListResponse> {
    return firstValueFrom(this.api.get<AdminAiAgentListResponse>('admin/ai-settings/agents'));
  }

  getAiGuardrails(): Promise<AdminAiGuardrailsResponse> {
    return firstValueFrom(this.api.get<AdminAiGuardrailsResponse>('admin/ai-settings/guardrails'));
  }

  getIntegrationsStatus(): Promise<AdminIntegrationStatusResponse> {
    return firstValueFrom(this.api.get<AdminIntegrationStatusResponse>('admin/integrations/status'));
  }

  listAuditLogs(query = ''): Promise<AdminAuditLogListResponse> {
    const separator = query ? `?${query}&` : '?';
    return firstValueFrom(this.api.get<AdminAuditLogListResponse>(`admin/audit-logs${separator}pageSize=100`));
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
}
