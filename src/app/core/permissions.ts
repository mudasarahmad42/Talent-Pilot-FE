export const Permission = {
  ManageAdminCenter: 'access.admin.manage',
  ManageUsers: 'access.users.manage',
  ManageRoles: 'access.roles.manage',
  ViewAuditLogs: 'audit.logs.view',
  ManageTenantProfile: 'tenant.profile.manage',
  ManageNotifications: 'notifications.manage',
  ViewAiSettings: 'ai.settings.view',
  AiAssistantUse: 'ai.assistant.use',
  ViewJobRequests: 'job.requests.view',
  CreateJobRequests: 'job.requests.create',
  ClaimWorkflowTasks: 'workflow.assignments.claim',
  ViewBenchMatches: 'bench.matches.view',
  ManageCandidates: 'candidates.manage',
  ManageInterviews: 'interviews.manage',
  ManageHiringDecisions: 'hiring.decisions.manage',
} as const;

export type PermissionId = (typeof Permission)[keyof typeof Permission];

export const AdminPagePermissions: Record<string, readonly PermissionId[]> = {
  'tenant-profile': [Permission.ManageTenantProfile, Permission.ManageAdminCenter],
  users: [Permission.ManageUsers],
  'roles-permissions': [Permission.ManageRoles],
  groups: [Permission.ManageAdminCenter],
  departments: [Permission.ManageAdminCenter],
  skills: [Permission.ManageAdminCenter],
  'hiring-pipeline': [Permission.ManageAdminCenter],
  workflows: [Permission.ManageAdminCenter],
  notifications: [Permission.ManageNotifications, Permission.ManageAdminCenter],
  'notification-outbox': [Permission.ManageNotifications, Permission.ManageAdminCenter],
  'ai-settings': [Permission.ViewAiSettings, Permission.ManageAdminCenter],
  'candidate-sources': [Permission.ManageAdminCenter],
  integrations: [Permission.ManageAdminCenter],
  'audit-logs': [Permission.ViewAuditLogs],
};

export function getAdminPagePermissions(pageId: string): readonly PermissionId[] {
  return AdminPagePermissions[pageId] ?? [Permission.ManageAdminCenter];
}
