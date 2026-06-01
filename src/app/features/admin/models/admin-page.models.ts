export type TenantProfileTab = 'profile' | 'branding' | 'career-page' | 'security';
export type AiSettingsTab = 'runtime' | 'agents';
export type PermissionResolutionMode = 'merge' | 'highest-priority';
export type UserRowAction = 'edit-access' | 'resend-invite' | 'deactivate-user' | 'audit-history';
export type RoleRowAction = 'edit-role' | 'bulk-assign-users' | 'view-permissions' | 'audit-history';

export interface TimezoneOption {
  value: string;
  label: string;
  offsetMinutes: number;
}

export interface AiAgentDefinition {
  name: string;
  responsibility: string;
  input: string;
  output: string;
  boundary: string;
}

export interface UserActionContext {
  action: UserRowAction;
  userId: string;
  displayName: string;
  email: string;
  roleName: string;
  roleIds: string[];
  groupNames: string[];
  groupIds: string[];
  accountStatus: string;
  lastActive: string;
  deactivationReason: string;
}

export interface RoleActionContext {
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

export interface RolePermissionOption {
  id: string;
  label: string;
  group: string;
  description: string;
}

export interface NotificationTemplateDefinition {
  templateId: string;
  eventCode: string;
  name: string;
  subject: string;
  body: string;
  recipient: string;
  variables: string[];
  updatedAtUtc: string;
}

export interface AuditEventRow {
  occurredAtUtc: string;
  actor: string;
  event: string;
}

export interface AccessOption {
  id: string;
  name: string;
}

export interface AuditLogFilter {
  area?: string;
  actorId?: string;
  search?: string;
  entityType?: string;
  entityId?: string;
}

export interface AdminListState {
  search: string;
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface BulkAssignmentPreviewUser {
  userId: string;
  name: string;
  email: string;
  department: string;
  currentRole: string;
}

export interface AdminGroupMembershipDialogContext {
  groupId: string;
  name: string;
  purpose: string;
  status: string;
  memberCount: number;
}
