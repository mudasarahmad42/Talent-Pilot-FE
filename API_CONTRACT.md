# Talent Pilot Frontend API Contract Tracker

This file tracks the backend APIs the Angular frontend expects. Business data must come from backend APIs; if a contract is missing, the frontend should render a backend-required empty state instead of local mock rows.

## Implementation Rule

If a value is configurable, the frontend should provide:

- An editable Angular Material control.
- Client-side validation where practical.
- A backend API call.
- A backend endpoint contract in this file.
- Save/reset or explicit action feedback.
- UTC timestamp storage with client-side local rendering for all date/time values.

## Controller Ownership Guidance

Authentication endpoints should stay narrowly focused on login/session behavior:

| Controller Area | Owns |
| --- | --- |
| `AuthController` | Login, logout, refresh/session validation, and `GET /api/auth/me`. |
| `AdminUsersController` or `AdminIdentityController` | Internal user CRUD, tenant membership, account status, and role/group assignments. |
| `AdminRolesController` or `AdminAccessControlController` | Role and permission catalog, permission assignment, and access policies. |
| `AdminGroupsController` | Workflow routing groups. Groups route work and do not grant permissions. |

`AuthController` may read user roles/permissions to issue claims or return the current session, but it should not own administrative user, role, group, or access-policy management.

Current frontend MVP login uses user cards for fast hackathon testing. Cards still call backend auth endpoints; production credential auth should use the same context-building path:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Authenticate by email/password and issue access/refresh tokens. |
| `POST` | `/api/auth/refresh` | Rotate/refresh the session token. |
| `POST` | `/api/auth/logout` | Revoke the active refresh token/session. |
| `GET` | `/api/auth/me` | Return the current resolved user profile, tenant, roles, permissions, groups, and route access. |

`GET /api/auth/me` should build a complete frontend user context from database role/group assignments. The temporary card-login flow should call the same context-building path once backend auth is connected.

```ts
interface CurrentUserContext {
  userId: string;
  tenantId: string;
  tenantDisplayName: string;
  displayName: string;
  email: string;
  roleDisplayName: string;
  roles: Array<{ roleId: string; code: string; displayName: string; priority: number }>;
  permissions: string[];
  groups: Array<{ groupId: string; name: string; purpose: string }>;
  routes: string[];
}
```

Frontend storage keys after login:

```text
talent-pilot.auth.access-token
talent-pilot.auth.refresh-token
talent-pilot.auth.expires-at
talent-pilot.auth.current-user
```

## Admin Center

Admin route metric cards should be backed by API summary objects, not hard-coded explanatory labels. Examples include active counts, assigned members, pending assignments, failed deliveries, sent notifications, mapped employees, active templates, and agent run counts. Product rules and future-scope context belong in tooltips, detail cards, or documentation, not in primary metric cards.

### Tenant Profile Settings

Frontend service:

```text
src/app/core/admin-settings-api.service.ts
```

Required backend endpoints:

| Method | Endpoint | Purpose | Implementation Status |
| --- | --- | --- | --- |
| `GET` | `/api/admin/tenant-profile` | Load tenant identity, branding defaults, candidate defaults, and summary counts for the current tenant. | Backend |
| `PUT` | `/api/admin/tenant-profile` | Save editable tenant profile, branding, localization, and candidate default settings. | Backend |
| `GET` | `/api/admin/tenant-profile/slug-availability?slug={slug}` | Validate tenant slug uniqueness before save or on blur. | Backend |
| `GET` | `/api/admin/audit-logs?entityType=Tenant&entityId={tenantId}` | Open audit history for tenant profile changes. | Backend |
| `GET` | `/api/admin/audit-logs/export?entityType=Tenant&entityId={tenantId}` | Export tenant audit history as an `.xlsx` workbook. | Backend |

`GET /api/admin/tenant-profile` response shape:

```ts
interface TenantProfileSettings {
  tenantId: string;
  displayName: string;
  slug: string;
  domain: string;
  adminContactEmail: string;
  defaultTimezone: string; // IANA timezone id, for example Asia/Karachi.
  defaultCurrency: 'PKR' | 'USD' | 'EUR';
  status: 'Active' | 'Inactive';
  careerDisplayName: string;
  primaryColor: string;
  candidateLoginRequired: boolean;
  candidateCvFormat: 'DOCX';
  publicJobsEnabled: boolean;
  inviteExpiryDays: number;
  reapplyCooldownDays: number;
  notificationEmailProvider: 'Resend' | 'MicrosoftGraph';
  userCount: number;
  roleCount: number;
  setupComplete: boolean;
  configuredLlmModel: string;
  configuredEmbeddingModel: string;
  logoFileName?: string | null;
  logoContentType?: string | null;
  logoContentBase64?: string | null;
  updatedAt: string; // UTC ISO timestamp.
}
```

`PUT /api/admin/tenant-profile` request shape:

```ts
interface UpdateTenantProfileSettingsInput {
  displayName: string;
  slug: string;
  domain: string;
  adminContactEmail: string;
  defaultTimezone: string; // IANA timezone id.
  defaultCurrency: 'PKR' | 'USD' | 'EUR';
  status: 'Active' | 'Inactive';
  careerDisplayName: string;
  primaryColor: string;
  candidateLoginRequired: boolean;
  candidateCvFormat: 'DOCX';
  publicJobsEnabled: boolean;
  inviteExpiryDays: number;
  reapplyCooldownDays: number;
  notificationEmailProvider: 'Resend' | 'MicrosoftGraph';
  logoFileName?: string | null;
  logoContentType?: string | null;
  logoContentBase64?: string | null;
}
```

Validation expected from backend:

- `displayName`: required, at least 2 characters.
- `slug`: required, lowercase letters/numbers/hyphens, unique per tenant.
- `domain`: required valid domain.
- `adminContactEmail`: required valid email.
- `defaultTimezone`: valid IANA timezone id. Store the id, not a GMT offset.
- `defaultCurrency`: one of `PKR`, `USD`, or `EUR`.
- `status`: `Active` or `Inactive`.
- `primaryColor`: required hex color.
- `inviteExpiryDays`: 1 to 30.
- `reapplyCooldownDays`: 1 to 365.
- `notificationEmailProvider`: `Resend` or `MicrosoftGraph`.
- Optional logo payload: PNG, JPEG, WebP, or SVG base64 content, maximum 512 KB.

Backend side effects:

- Persist tenant identity fields on `Tenants`.
- Persist candidate defaults on `TenantRecruitmentSettings`.
- Persist tenant branding logo metadata and binary payload on `TenantRecruitmentSettings`.
- Store tenant status on `Tenants.Status`.
- Store tenant timezone as an IANA id such as `Asia/Karachi`; do not store a fixed offset because daylight-saving rules can change.
- Return AI runtime values from backend configuration/appsettings; these are read-only on the Tenant Profile screen.
- Write audit event for changed fields.
- Ensure slug changes are validated before route/URL updates.

### Admin Users

Screen reference:

```text
stitch-reference/selected/admin-center-users.html
stitch-reference/selected/admin-center-users.png
```

Required backend endpoints:

| Method | Endpoint | Purpose | Implementation Status |
| --- | --- | --- | --- |
| `GET` | `/api/admin/users?search={search}&roleId={roleId}&groupId={groupId}&accountStatus={status}&page={page}&pageSize={pageSize}` | Load the Admin Center Users table, search results, and summary metrics. | Backend |
| `GET` | `/api/admin/users/{userId}` | Load one internal user for edit/details drawer. | Backend TODO |
| `POST` | `/api/admin/users` | Add an internal user to the tenant and assign role/group access. | Backend TODO |
| `PUT` | `/api/admin/users/{userId}` | Update user profile, role assignments, routing groups, and account status. | Backend |
| `PATCH` | `/api/admin/users/{userId}/account-status` | Activate or deactivate an internal user with an audit reason. | Backend |
| `POST` | `/api/admin/users/{userId}/invites/resend` | Create a fresh invite token, email the user, and audit the resend. | Backend |
| `GET` | `/api/admin/roles?includeInactive=false` | Populate role assignment controls. | Backend |
| `GET` | `/api/admin/groups?purpose=WorkflowRouting` | Populate routing group assignment controls. Groups route work but do not grant permissions. | Backend |
| `GET` | `/api/admin/access-policies/bench-visibility` | Load which role can view benched employees during PMO matching. | Backend |
| `PUT` | `/api/admin/access-policies/bench-visibility` | Configure which role can view benched employees during PMO matching. | Backend TODO |
| `GET` | `/api/admin/audit-logs?entityType=User&entityId={userId}` | Open audit history for user access changes. | Backend TODO |

`GET /api/admin/users` response shape:

```ts
interface AdminUsersResponse {
  summary: AdminUsersSummary;
  items: AdminUserListItem[];
  page: number;
  pageSize: number;
  totalCount: number;
}

interface AdminUsersSummary {
  internalUserCount: number;
  routingGroupCount: number;
  benchVisibilityPolicy: BenchVisibilityPolicySummary;
}

interface BenchVisibilityPolicySummary {
  roleId: string;
  roleName: string;
  configuredIn: 'RolesPermissions';
}

interface AdminUserListItem {
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
  departmentId: string | null;
  departmentName: string | null;
  experienceYears: number | null;
  joiningDate: string | null; // Date-only value, yyyy-MM-dd.
  completedInterviewCount: number;
  accountStatus: 'Active' | 'Disabled' | 'Invited';
  lastActiveAt: string | null; // UTC ISO timestamp.
  createdAt: string; // UTC ISO timestamp.
  updatedAt: string; // UTC ISO timestamp.
}
```

`POST /api/admin/users` and `PUT /api/admin/users/{userId}` request shape:

```ts
interface SaveAdminUserInput {
  displayName: string;
  email: string;
  roleIds: string[];
  groupIds: string[];
  accountStatus: 'Active' | 'Disabled' | 'Invited';
}
```

`PATCH /api/admin/users/{userId}/account-status` request shape:

```ts
interface UpdateAdminUserStatusInput {
  accountStatus: 'Active' | 'Disabled' | 'Invited';
  reason?: string;
}
```

`GET /api/admin/access-policies/bench-visibility` response shape:

```ts
interface BenchVisibilityPolicy {
  roleId: string;
  roleName: string;
  updatedAt: string;
  updatedByUserId: string;
}
```

`PUT /api/admin/access-policies/bench-visibility` request shape:

```ts
interface UpdateBenchVisibilityPolicyInput {
  roleId: string;
}
```

Validation expected from backend:

- `displayName`: required, at least 2 characters.
- `email`: required valid email, unique inside tenant.
- `roleIds`: at least one active role; role must belong to the tenant/system catalog.
- `groupIds`: optional, but values must be valid routing groups for the tenant.
- Bench visibility `roleId`: must be an active tenant role; MVP default is PMO.
- Tenant Admin cannot remove or disable the final active Tenant Admin.
- Groups must not grant permissions; permissions come from assigned roles.
- User list rows should display only the derived highest-priority role name. Do not append priority notation such as `(P1)` to visible role labels; priority stays in metadata for conflict resolution. The full assigned role list belongs in edit/details payloads.
- Add/edit user role controls should support multiple assigned roles and submit them through `roleIds[]`.
- User list rows should not expose a `Groups` column. Users can have multiple workflow routing groups, so group memberships should be edited in add/edit/details screens and sent as `groupIds[]`.
- Do not store `Operational Access` as a separate user field. Access is derived from role permissions, tenant access policies, and workflow groups.

Backend side effects:

- Persist user profile and tenant membership.
- Persist role assignments separately from group routing memberships.
- Persist bench visibility as an access policy, not a hard-coded UI constant.
- Write audit events for role, group, account status, and profile changes.
- Emit notifications only when an action requires user attention, such as invitation or re-invitation.
- Do not implement SSO/group import as active MVP behavior.

### Admin Roles & Permissions

Roles grant permissions. Groups route work and do not grant permissions. Tenant admins can configure how effective permissions are resolved when a user has multiple roles.

Required backend endpoints:

| Method | Endpoint | Purpose | Implementation Status |
| --- | --- | --- | --- |
| `GET` | `/api/admin/roles?page={page}&pageSize={pageSize}&search={search}` | Load roles, type, scope, user count, permission summary, lifecycle status, editability flags, and summary metrics. | Backend |
| `GET` | `/api/admin/roles/{roleId}` | Load one role with permission grants. | Backend TODO |
| `POST` | `/api/admin/roles` | Create a tenant role with selected permissions. | Backend TODO |
| `PUT` | `/api/admin/roles/{roleId}` | Update tenant role name, priority, permission grants, and status. | Backend TODO |
| `PATCH` | `/api/admin/roles/{roleId}/status` | Activate or deactivate a tenant-managed role. | Backend TODO |
| `POST` | `/api/admin/roles/{roleId}/user-assignment-preview` | Preview users matched by bulk role-assignment filters. | Backend TODO |
| `POST` | `/api/admin/roles/{roleId}/bulk-user-assignments` | Add the role to all users matched by confirmed filters. | Backend TODO |
| `GET` | `/api/admin/audit-logs?entityType=Role&entityId={roleId}` | Load role audit history. | Backend TODO |
| `GET` | `/api/admin/access-policies/permission-resolution` | Load tenant role-conflict resolution mode. | Backend |
| `PUT` | `/api/admin/access-policies/permission-resolution` | Save tenant role-conflict resolution mode. | Backend TODO |

`GET /api/admin/access-policies/permission-resolution` response shape:

```ts
interface PermissionResolutionPolicy {
  mode: 'MergeAllAssignedRoles' | 'HighestPriorityRoleOnly';
  updatedAtUtc: string;
  updatedByUserId: string;
}
```

`PUT /api/admin/access-policies/permission-resolution` request shape:

```ts
interface UpdatePermissionResolutionPolicyInput {
  mode: 'MergeAllAssignedRoles' | 'HighestPriorityRoleOnly';
}
```

`GET /api/admin/roles` row shape:

```ts
interface RoleSummary {
  roleId: string;
  name: string;
  type: 'System' | 'Tenant' | 'Custom';
  scope: 'Platform' | 'Tenant' | 'Portal';
  assignedUserCount: number;
  permissionSummary: string;
  lifecycleStatus: 'Active' | 'Inactive';
  isProtected: boolean;
  isBulkAssignable: boolean;
}
```

Role lifecycle status is only `Active` or `Inactive`. `Protected` is not a status; it is an editability flag for application-owned roles. `Custom` is not a status; it is a role type/source.

Only `System Admin` is a platform/system role, and it is not managed from tenant Admin Center. Seeded default tenant roles such as Tenant Admin, PMO, Presales, Recruiter, Hiring Manager, HOD / Department Head, Interviewer, Employee, and Candidate are tenant-scoped roles. Tenant-created custom roles are tenant-scoped too.

`POST /api/admin/roles` and `PUT /api/admin/roles/{roleId}` request shape:

```ts
interface SaveRoleInput {
  name: string;
  scope: 'Tenant';
  priority: number;
  status: 'Active' | 'Inactive';
  permissionIds: string[];
}
```

`POST /api/admin/roles/{roleId}/user-assignment-preview` request shape:

```ts
interface RoleUserAssignmentFilterInput {
  search?: string;
  accountStatuses?: Array<'Active' | 'Invited' | 'Disabled'>;
  departmentIds?: string[];
  currentRoleIds?: string[];
  groupIds?: string[];
}
```

`POST /api/admin/roles/{roleId}/user-assignment-preview` response shape:

```ts
interface RoleUserAssignmentPreview {
  matchedCount: number;
  alreadyAssignedCount: number;
  assignableCount: number;
  sampleUsers: Array<{
    userId: string;
    displayName: string;
    email: string;
    departmentName?: string;
    currentHighestPriorityRoleName?: string;
    accountStatus: 'Active' | 'Invited' | 'Disabled';
  }>;
}
```

`POST /api/admin/roles/{roleId}/bulk-user-assignments` request shape:

```ts
interface BulkAssignRoleUsersInput {
  filters: RoleUserAssignmentFilterInput;
  selectionMode: 'AllFilteredUsers' | 'SelectedUsers';
  selectedUserIds?: string[];
  expectedAssignableCount: number;
}
```

Backend behavior:

- Default MVP mode is `MergeAllAssignedRoles`.
- Role priority remains stored on role records. Priority `1` is highest priority, but this is not a separate Tenant Permission Resolution setting.
- Permission display role is derived by backend when returning user/profile summaries and is not a separate tenant setting.
- Role list UI must keep lifecycle status separate from role type and editability. Do not return `Protected` or `Custom` as lifecycle statuses.
- System Admin is read-only and outside tenant Admin Center management.
- Seeded tenant roles and custom tenant roles can be assigned to users from Admin Center.
- Custom/tenant roles can be created and edited from Admin Center with a permission multi-select.
- Bulk role assignment is allowed only for tenant-managed roles that the current admin can manage.
- Bulk role assignment can apply to all filtered users or to explicit selected users from the preview. When `selectionMode` is `SelectedUsers`, backend must assign only `selectedUserIds`.
- Bulk role assignment adds the role to selected/matched users; it must not remove existing roles.
- Recalculate and return effective permissions/highest-priority role after assignments according to the tenant permission-resolution policy.
- Role action UI must not display endpoint paths. Endpoint details stay in this API contract.
- Write audit events when the permission resolution policy changes.
- Write audit events for role create/update/status and permission-grant changes.
- Write one batch audit event and per-user access audit events for bulk role assignment. Store the filter payload, matched count, assigned count, skipped count, and actor.

### Admin Departments

Departments are lightweight recruitment lookups used for resource requests, job posts, employee filtering, bench matching, and reporting. They are not payroll fields or full org-chart management in this MVP.

Required backend endpoints:

| Method | Endpoint | Purpose | Implementation Status |
| --- | --- | --- | --- |
| `GET` | `/api/admin/departments?page={page}&pageSize={pageSize}&search={search}` | Load department lookup rows and summary metrics. | Backend |
| `GET` | `/api/admin/departments/{departmentId}` | Load one department for edit/details. | Backend TODO |
| `POST` | `/api/admin/departments` | Create a department lookup. | Backend TODO |
| `PUT` | `/api/admin/departments/{departmentId}` | Update department name, lead, employee scope, and active status. | Backend TODO |
| `PATCH` | `/api/admin/departments/{departmentId}/status` | Activate or deactivate a department lookup. | Backend TODO |

Backend behavior:

- Validate department names are unique inside the tenant.
- Keep department lookup data separate from payroll or employee onboarding structures.
- Allow job posts and employee profiles to reference departments for filtering and reporting.
- Write audit events for department create/update/status changes.

### Admin Skills

Skills are normalized recruitment terms used by requirement parsing, CV parsing, bench matching, candidate rediscovery, and explainable matching evidence. The API should support a controlled skill list and aliases, not a broad knowledge-management taxonomy.

Required backend endpoints:

| Method | Endpoint | Purpose | Implementation Status |
| --- | --- | --- | --- |
| `GET` | `/api/admin/skills?page={page}&pageSize={pageSize}&search={search}&category={category}` | Load skills, aliases, category, usage summary, status, and summary metrics. | Backend |
| `GET` | `/api/admin/skills/{skillId}` | Load one skill for edit/details. | Backend TODO |
| `POST` | `/api/admin/skills` | Create a normalized skill term with aliases. | Backend TODO |
| `PUT` | `/api/admin/skills/{skillId}` | Update normalized name, category, aliases, and status. | Backend TODO |
| `PATCH` | `/api/admin/skills/{skillId}/status` | Activate or deactivate a skill term. | Backend TODO |
| `GET` | `/api/admin/skills/categories` | Populate category filters and edit controls. | Backend |

Backend behavior:

- Validate skill names are unique inside the tenant after normalization.
- Normalize aliases before matching so duplicate variants do not fragment evidence.
- Let requirement parser, CV parser, bench matching, and candidate rediscovery reference the same skill identifiers.
- Write audit events for skill and alias changes.

### Admin Hiring Pipeline

Hiring Pipeline stores reusable interview templates that recruiters can select when creating a job post. A job post starts from the selected template, then recruiters can customize the ordered interview rounds for that job post before candidate interview tasks are scheduled. Candidate applications follow the job-post-specific round plan.

Required backend endpoints:

| Method | Endpoint | Purpose | Implementation Status |
| --- | --- | --- | --- |
| `GET` | `/api/admin/hiring-pipeline/templates?page={page}&pageSize={pageSize}&search={search}` | Load interview templates, round flow, default interviewers, round count, and status. | Backend |
| `GET` | `/api/admin/hiring-pipeline/templates/{templateId}` | Load one template for edit/details. | Backend |
| `POST` | `/api/admin/hiring-pipeline/templates` | Create an interview stage template with at least one active required round. | Backend |
| `PUT` | `/api/admin/hiring-pipeline/templates/{templateId}` | Update template name, rounds, default interviewers, duration, and status. All active rounds are required. | Backend |
| `PATCH` | `/api/admin/hiring-pipeline/templates/{templateId}/status` | Activate or deactivate a template. | Backend TODO |

Backend behavior:

- Store ordered rounds for each reusable interview template.
- Let job posts reference one selected template as the starting point.
- Copy or snapshot the selected round flow onto the job post so recruiters can add, remove, reorder, or reassign rounds without mutating the original template.
- Treat every active configured round as required. Existing `isRequired` fields remain in the wire contract for compatibility but backend should return and persist them as `true`.
- Validate that each active job-post round has a valid interviewer user/group/role assignment before interviews are started.
- Write audit events for template and stage changes.

### Candidate Interview Actions

Candidate interview APIs are planned operational endpoints. They use the job-post-specific round plan created from the selected hiring pipeline template.

Recruiter scheduling currently creates the interview task, stores optional meeting link/location metadata, persists the meeting participants, and queues candidate/interviewer/hiring-manager notification emails. Calendar event fields are persisted for compatibility, but local/demo environments do not auto-create Google Calendar events or Google Meet links while `GoogleCalendar:Enabled` is false. Real calendar creation requires Google Calendar service-account credentials and an impersonated organizer account.

`GET /api/talent-pilot/recruitment/candidates/{candidateId}/profile` includes `meetingEvents` so recruiters can review interview meeting history linked to the applicant/job. Each event includes `interviewId`, `jobApplicationId`, `jobRequestId`, optional `jobPostId`, `requestCode`, `jobTitle`, `client`, `roundName`, `status`, `startsAt`, `durationMinutes`, `meetingLink`, `calendarProvider`, `calendarEventId`, `calendarEventHtmlLink`, `locationText`, and `participants`. Each participant includes `displayName`, `email`, `role`, and `isOptional`.

Required backend endpoints:

| Method | Endpoint | Purpose | Implementation Status |
| --- | --- | --- | --- |
| `PATCH` | `/api/interviews/{interviewId}/skip` | Mark one scheduled interview as skipped with an audited reason and return the candidate application to recruiter review for the next-step decision. | Backend TODO |

`PATCH /api/interviews/{interviewId}/skip` request shape:

```ts
interface SkipInterviewRequest {
  reason: string;
}
```

Backend behavior:

- Only Recruiter and Tenant Admin users can skip interviews.
- `reason` is required and stored with skipped actor and UTC timestamp.
- `Skipped` is separate from `Cancelled` and `NoShow`.
- Skipped interviews do not require feedback.
- When an interviewer submits feedback and completes a round, the candidate application returns to Recruiter review; the interviewer does not directly pass the candidate to the next interviewer.
- Recruiter reviews feedback and explicitly moves the candidate to the next configured round, hold/reject when allowed, or Hiring Manager Review after all rounds are completed/skipped.
- Hiring Manager Review becomes available only after every configured round is completed with feedback or skipped with a reason, and Recruiter sends the application forward.

### Admin Groups

Groups are workflow routing recipients. They do not grant permissions; permissions continue to come from roles.

Required backend endpoints:

| Method | Endpoint | Purpose | Implementation Status |
| --- | --- | --- | --- |
| `GET` | `/api/admin/groups?purpose=WorkflowRouting&page={page}&pageSize={pageSize}` | Load routing groups, owners, member counts, status, and summary metrics. | Backend |
| `GET` | `/api/admin/groups/{groupId}` | Load one routing group for edit/details. | Backend TODO |
| `POST` | `/api/admin/groups` | Create a routing group and assign active members. | Backend TODO |
| `PUT` | `/api/admin/groups/{groupId}` | Update group name, routing purpose, default owner, members, and active status. | Backend TODO |
| `GET` | `/api/admin/groups/fallback-policy` | Load fallback assignee behavior when a routing group has no active members. | Backend |
| `PUT` | `/api/admin/groups/fallback-policy` | Update fallback assignee behavior. | Backend TODO |

Backend behavior:

- Route workflow baton assignments to the configured group for each handoff.
- If a routing group has no active members, fall back to Tenant Admins unless backend configuration says otherwise.
- Keep group membership separate from role permission assignments.
- Prefer clear routing group names in admin UX using `Role - Department` or `Role - Scope`, such as `PMO - Engineering`, `PMO - Sales`, `Recruiting - Engineering`, and `Interview Panel - QA`.
- Write audit events for group membership, routing purpose, default owner, and fallback policy changes.

### Admin Workflows

The Admin Center Workflows screen configures active Job Request recipient rules. Backend action keys, stage keys, transition semantics, and workflow action authorization are code-owned; Tenant Admins configure recipients only.

Visible configuration area:

- Department Routing: editable department-to-user/group routing for Presales-created Job Requests.

Business behavior:

- Presales-created Job Requests enter PMO Review and use department intake routing.
- PMO-created Job Requests enter PMO Review assigned to the PMO creator.
- Missing or inactive department intake routing falls back to Tenant Admins.
- HOD/department head routing belongs to interview tasks or job-post interview rounds, not a Job Request approval workflow.
- Notification delivery is not configurable from Workflows. Workflow handoffs emit backend events; backend notification handlers send Email and SignalR updates automatically.

Required backend endpoints:

| Method | Endpoint | Purpose | Implementation Status |
| --- | --- | --- | --- |
| `GET` | `/api/admin/workflows/configuration` | Load workflow definitions, stages, system transition rows, and intake routing rows. | Backend |
| `PUT` | `/api/admin/workflows/intake-routing` | Upsert tenant department intake routing. | Backend |

`PUT /api/admin/workflows/intake-routing` request shape:

```ts
interface UpdateAdminWorkflowIntakeRoutingInput {
  rules: Array<{
    departmentId: string;
    assignmentType: 'User' | 'Group';
    targetUserId?: string | null;
    targetGroupId?: string | null;
    status: 'Active' | 'Inactive';
  }>;
}
```

### Admin Notifications

Admin Notifications exposes editable email templates linked to system-defined notification events. Event codes are backend-owned constants; the UI should not present events as tenant-created configuration.

Notification delivery rule:

- `Email` is the async email delivery channel.
- `SignalR` is the realtime in-app delivery channel for online users.
- Do not model `In-app` as a separate third channel.
- Do not expose Email/SignalR channel controls on the Workflows routing table or Notifications template table.

Required backend endpoints:

| Method | Endpoint | Purpose | Implementation Status |
| --- | --- | --- | --- |
| `GET` | `/api/admin/notifications/templates?page={page}&pageSize={pageSize}&search={search}` | Load editable email templates with summary metrics. | Backend |
| `PUT` | `/api/admin/notifications/templates/{templateId}` | Update template subject/body text. | Backend |
| `POST` | `/api/admin/notifications/test-email` | Send a standalone test email through the tenant-configured provider. Tenant Admin only. | Backend |
| `GET` | `/api/admin/notifications/email-senders` | Load non-secret configured sender metadata for supported email providers. Tenant Admin only. | Backend |
| `POST` | `/api/admin/notifications/test-realtime` | Broadcast a SignalR test notification to connected clients in the current tenant. Tenant Admin only. | Backend |
| `GET` | `/api/admin/notifications/events?page={page}&pageSize={pageSize}&search={search}` | Load the system event catalog for diagnostics/linking, not primary UI configuration. | Backend |
| `GET` | `/api/admin/notifications/events/{eventId}` | Load one notification event and linked templates. | Backend |
| `GET` | `/api/admin/notifications/outbox?page={page}&pageSize={pageSize}&search={search}&status={status}` | Load queued, sent, failed, and processing email outbox rows with worker status. Tenant Admin only. | Backend |
| `POST` | `/api/admin/notifications/outbox/{outboxId}/retry` | Requeue a failed email outbox row for the worker to send again. Does not create a duplicate outbox row. Tenant Admin only. | Backend |

`GET /api/admin/notifications/templates` response shape:

```ts
interface NotificationTemplateSummary {
  templateId: string;
  eventCode: string;
  name: string;
  recipient: string;
  subject: string;
  body: string;
  variables: string[];
  lifecycleStatus: 'Active' | 'Inactive';
  updatedAtUtc: string;
  updatedByUserId: string;
}

interface AdminNotificationTemplatesResponse {
  summary: {
    activeEventCount: number;
    editableTemplateCount: number;
    pendingOutboxCount: number;
    failedOutboxCount: number;
  };
  items: NotificationTemplateSummary[];
  page: number;
  pageSize: number;
  totalCount: number;
}
```

`PUT /api/admin/notifications/templates/{templateId}` request shape:

```ts
interface UpdateNotificationTemplateInput {
  subject: string;
  body: string;
}
```

`POST /api/admin/notifications/test-email` request and response shape:

```ts
interface SendTestNotificationEmailInput {
  toEmail: string;
}

interface SendTestNotificationEmailResponse {
  toEmail: string;
  subject: string;
  provider: 'Resend' | 'MicrosoftGraph';
  messageId: string;
  submittedAtUtc: string;
}
```

`GET /api/admin/notifications/email-senders` response shape:

```ts
interface NotificationEmailSenderConfigurationResponse {
  providers: Array<{
    provider: 'Resend' | 'MicrosoftGraph';
    providerLabel: string;
    senderEmail?: string | null;
    senderConfigured: boolean;
  }>;
}
```

`POST /api/admin/notifications/test-realtime` response shape:

```ts
interface SendTestRealtimeNotificationResponse {
  notificationId: string;
  title: string;
  message: string;
  connectedClientCount: number;
  sentAtUtc: string;
}
```

`GET /api/admin/notifications/outbox` and `POST /api/admin/notifications/outbox/{outboxId}/retry` item shape:

```ts
interface AdminNotificationOutboxItem {
  outboxId: string;
  eventCode: string;
  eventName: string;
  templateName: string;
  senderDisplayName: string;
  recipientDisplayName?: string | null;
  recipientEmail?: string | null;
  channel: 'Email';
  status: 'Pending' | 'Processing' | 'Sent' | 'Failed';
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
```

Realtime client contract:

- Authenticated clients connect to `/hubs/notifications` with the same JWT access token.
- Clients listen for `NotificationReceived`.
- Backend publishes the same realtime message shape through the injectable `IRealtimeNotificationPublisher`.
- Tenant/user realtime sends are persisted to `NotificationRecipients` before SignalR delivery.
- Tenant-scoped broadcasts use the current tenant group; user-targeted workflow messages should use the tenant + user group.
- Topbar bells read unread counts from the persisted notification snapshot and open a drawer grouped by sent date.

```ts
interface RealtimeNotification {
  notificationId: string;
  tenantId: string;
  recipientUserId?: string | null;
  title: string;
  message: string;
  category: string;
  severity: string;
  entityType?: string | null;
  entityId?: string | null;
  createdAtUtc: string;
  metadata?: Record<string, string>;
}
```

Backend behavior:

- Trigger notifications from workflow handoff events.
- Send SignalR updates to online internal users for realtime in-app delivery.
- Send email for async internal delivery and candidate-facing messages.
- Keep event logic aligned with workflow routing rules.
- Store email template subject/body in the database. Frontend owns only the editing UI and must use the allowed variables returned by the template API.
- Validate that edited subject/body only use variables supported by the template.
- Test email sends require the `TenantAdmin` role, use a standalone provider delivery-check message instead of stored templates, and write `NotificationTestEmailSent` audit events.
- Realtime test sends require the `TenantAdmin` role, broadcast through SignalR to connected clients in the current tenant, and write `NotificationRealtimeTestSent` audit events.
- Store provider secrets in user-secrets, environment variables, or deployment secrets only. Resend uses `Resend:ApiKey` and optional `Resend:FromEmail`; Microsoft Graph uses `MicrosoftGraphEmail:TenantId`, `MicrosoftGraphEmail:ClientId`, `MicrosoftGraphEmail:ClientSecret`, and `MicrosoftGraphEmail:FromEmail`.
- Write audit events for template, event status, and test email changes.

### Admin AI Settings

Admin AI Settings is a read-only runtime visibility page. Backend owns the configured provider, LLM, embedding model, dimensions, and active agent registry.

Required backend endpoints:

| Method | Endpoint | Purpose | Implementation Status |
| --- | --- | --- | --- |
| `GET` | `/api/admin/ai-settings/runtime` | Load provider, LLM model, embedding model, embedding dimensions, and read-only runtime status from appsettings. | Backend |
| `GET` | `/api/admin/ai-settings/agents` | Load active AI agents such as requirement parser, CV parser, bench matching, rediscovery, fit explanation, and hiring-manager brief. | Backend |
| `GET` | `/api/admin/ai-settings/guardrails` | Load human review controls and the disabled auto-reject guardrail. | Backend |

`GET /api/admin/ai-settings/agents` response shape:

```ts
interface AdminAiAgentListResponse {
  activeAgentCount: number;
  items: AdminAiAgentDefinition[];
}

interface AdminAiAgentDefinition {
  id: string;
  displayName: string;
  responsibility: string;
  inputSummary: string;
  outputSummary: string;
  mvpBoundary: string;
  enabled: boolean;
}
```

MVP agent definitions expected by the frontend:

- Requirement Parser: extracts structured hiring requirements from resource requests and job descriptions.
- CV Parser: parses DOCX resumes into candidate profile and matching evidence.
- Bench Matching: ranks eligible internal employees for PMO Review using skill coverage, vector similarity, experience, availability, project evidence, and optional Tavily recent/live public context when the request needs it. Web search is backend-capped at 60 requests per UTC day, and PMO still decides who to recommend.
- Talent Rediscovery: ranks previous warm candidates before external sourcing using candidate skills, historical applications, interview feedback, outcomes, and vector similarity. This agent never uses web search for candidate data and cannot contact candidates or move workflow stages.
- Online Headhunting: searches approved online sources for lead-only candidate results after recruiter sourcing claim. It returns source links, snippets, match summary, duplicate warnings, and outreach drafts, but cannot create candidates/applications, scrape LinkedIn, use Indeed without official partner/API access, message external platforms, or bypass recruiter review.
- Fit Explanation: explains why an employee or candidate was recommended.
- Hiring Manager Decision Brief: summarizes interview feedback and candidate context for final human review.

Backend behavior:

- AI recommendations are advisory and must not auto-reject candidates.
- Final PMO, recruiter, interviewer, and hiring-manager decisions remain human-owned.
- Runtime values are displayed in Admin Center but are configured outside the UI.
- Embedding model changes require rebuilding stored vectors before recommendations use the new model.
- Log every AI agent run with the source entity, model/runtime version, summarized output, status, and UTC timestamp for audit and debugging.

### Admin Integrations

Admin Integrations reviews manual sourcing and invite-link activity for MVP hiring. It is not a source-label management screen in the MVP. Source labels such as LinkedIn, Indeed, Referral, and Other are seeded lookup values used by recruiter invite/application flows.

Required backend endpoints:

| Method | Endpoint | Purpose | Implementation Status |
| --- | --- | --- | --- |
| `GET` | `/api/admin/integrations/sourcing-summary` | Load source-label count, invite links sent, sourced applications, failed invite count, and manual sourcing workflow summary. | Backend |

Backend behavior:

- Recruiters manually record source labels and send Talent Pilot invite links.
- Candidate applications keep source evidence for reporting.
- External job-board connectors can be added later without changing the candidate application flow.
- Do not build Admin source-label CRUD for MVP.
- Do not expose connector internals, enum names, or vague statuses such as `Source tracking` as primary visible UI labels.

### Admin Audit Logs

Admin Audit Logs shows tenant-scoped configuration, workflow, AI, and invite-link activity. Visible table cells should use human-readable record names. Backend entity names may still be returned as metadata for drill-down, filters, and audit integrity.

Audit timestamps must be stored as UTC and returned as ISO strings. The Angular client formats them in the browser/user timezone with `Intl.DateTimeFormat`; never return preformatted values such as `Today 09:42` from the API.

Required backend endpoints:

| Method | Endpoint | Purpose | Implementation Status |
| --- | --- | --- | --- |
| `GET` | `/api/admin/audit-logs?page={page}&pageSize={pageSize}&area={area}&actorId={actorId}&search={search}` | Load audit log rows, summary counts, and filters for Admin Center. | Backend |
| `GET` | `/api/admin/audit-logs/{auditLogId}` | Load full audit detail including entity type, entity id, and metadata. | Backend |
| `GET` | `/api/admin/audit-logs/export?area={area}&actorId={actorId}&search={search}&entityType={entityType}&entityId={entityId}` | Export filtered audit history as an `.xlsx` workbook. | Backend |

`GET /api/admin/audit-logs` response shape:

```ts
interface AdminAuditLogListResponse {
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

interface AdminAuditLogListItem {
  id: string;
  occurredAtUtc: string; // UTC ISO timestamp. Example: 2026-05-21T04:42:00.000Z.
  actorDisplayName: string;
  eventSummary: string;
  recordLabel: string;
  area: 'Admin Center' | 'Workflow' | 'AI' | 'Talent Pilot App' | 'Candidate Experience';
}
```

Backend behavior:

- Store immutable audit records with actor, action, entity type, entity id, timestamp, source area, and metadata.
- Return user-facing `recordLabel` values such as `Job request`, `Candidate invite`, `Bench referral`, or `User access` for list views.
- Return `occurredAtUtc` only as a UTC ISO string. Do not return strings such as `Today 09:42`, `Yesterday`, or server-local formatted dates.
- The frontend displays `occurredAtUtc` as browser-local time with `Intl.DateTimeFormat` and keeps the raw UTC value in the `<time datetime>` attribute and tooltip.
- Keep sensitive candidate personal data out of the audit list response; expose details only through authorized drill-down.

Admin UI copy rules for backend-facing configuration:

- Avoid exposing scope labels such as `Out of MVP`, `Not MVP`, or `Later phase` in primary UI text.
- Do not expose endpoint URLs, controller names, or mock API wiring notes in the application UI. Keep endpoint details in this file and use product-facing copy in screens, dialogs, tooltips, and snackbars.
- Use tooltips or neutral product wording when explaining why a capability is not currently active.
- AI Settings should expose runtime/model details and the `Auto Reject` disabled guardrail only; automatic stage movement and final hiring decisions remain backend/business constraints, not visible configuration rows.
- External sourcing is manual now, but the data model should allow future LinkedIn/Indeed or sourcing-tool connectors.

## Existing Operational APIs

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Login/select a demo user. |
| `GET` | `/api/auth/me` | Return current authenticated user. |
| `POST` | `/api/job-requests` | Create a job request and route it to PMO. |
| `GET` | `/api/job-requests/{id}` | Load job request detail. |
| `GET` | `/api/pmo/queue` | Load PMO group work queue. |
| `POST` | `/api/workflow-assignments/{assignmentId}/claim` | Claim a workflow assignment. |
| `GET` | `/api/talent-pilot/job-requests/{id}/pmo-review` | Load PMO Review summary, assignment state, existing referrals, eligible benched employees, latest Bench Matching results, Presales recipients, and recruiter handoff preview. |
| `POST` | `/api/talent-pilot/job-requests/{id}/bench-matches/rank` | Run the advisory Bench Matching Agent after PMO claim and persist latest ranked employee fit explanations. |
| `POST` | `/api/talent-pilot/job-requests/{id}/employee-referrals` | PMO recommends selected internal employees to Presales and moves the request to Presales Review. |
| `POST` | `/api/talent-pilot/job-requests/{id}/employee-referrals/decision` | Presales accepts/rejects PMO recommendations; accepted employees count toward fulfillment. |
| `POST` | `/api/talent-pilot/job-requests/{id}/forward-to-recruiters` | PMO forwards the request to backend-owned recruiter sourcing routing. |
| `GET` | `/api/talent-pilot/recruitment/queue` | Load recruiter-visible `Recruiter Sourcing` assignments and current Job Post state. |
| `GET` | `/api/talent-pilot/job-requests/{id}/recruiter-sourcing` | Load the recruiter sourcing workspace: request summary, assignment, existing Job Post, linked applications, safe application document metadata, latest Talent Rediscovery rankings, latest AI Headhunting lead run, interview templates, and active skills. |
| `POST` | `/api/talent-pilot/job-requests/{id}/talent-rediscovery/rank` | Run the advisory Talent Rediscovery Agent after recruiter claim and persist latest ranked warm-candidate evidence. |
| `POST` | `/api/talent-pilot/job-requests/{id}/online-headhunting/search` | Queue the advisory Online Headhunting Agent after recruiter claim. Body: `{ limit?: number | null, sourceCodes?: string[] | null, searchMoreFromRunId?: string | null }`. Returns `202 Accepted` with queued metadata `{ requestId, jobRequestId, requestedByUserId, status, message, requestedLimit, dailyLeadLimit, dailyLeadCountBeforeRun, sourceCodes, queuedAtUtc }`. Default/max limit is 20 per run; daily cap is 100 leads per Job Request per UTC day. Persisted lead results arrive later through the latest recruiter-sourcing payload after realtime notification. |
| `PATCH` | `/api/talent-pilot/online-headhunting/leads/{onlineCandidateLeadId}/status` | Update an online lead review status to `New`, `Shortlisted`, or `Rejected`. `Converted` is backend-owned by successful manual candidate conversion. |
| `GET` | `/api/talent-pilot/recruitment/applications/{jobApplicationId}/documents/{applicationDocumentId}/download` | Recruiter/Tenant Admin downloads an application document by id. The UI should show generic document labels and never expose raw stored filenames in ranking rationale text. |
| `GET` | `/api/talent-pilot/job-posts` | Load recruiter-visible draft/published/closed Job Posts for Job Publishing. |
| `POST` | `/api/talent-pilot/job-requests/{id}/job-posts` | Create a draft Job Post linked to the Job Request from recruiter edits and selected interview template rounds. |
| `PUT` | `/api/talent-pilot/job-posts/{id}` | Update a draft Job Post's content, skills, and post-specific interview rounds. |
| `POST` | `/api/talent-pilot/job-posts/{id}/publish` | Publish a draft Job Post to the Talent Pilot candidate portal. |
| `POST` | `/api/talent-pilot/job-posts/{id}/close` | Close a draft/published Job Post without closing the parent Job Request. |
| `POST` | `/api/talent-pilot/job-posts/{id}/manual-candidates` | Recruiter/Tenant Admin adds or reuses a sourced candidate for a published job post, creates an invited application, stores source metadata, and queues an invitation email. Optional `onlineLeadId` marks an AI Headhunting lead as converted only after the invite/application is created. |
| `POST` | `/api/talent-pilot/job-applications/{id}/screening-decision` | Recruiter/Tenant Admin moves a job-post application to screening, hold, or rejected. |
| `POST` | `/api/talent-pilot/job-applications/{id}/interviews` | Recruiter/Tenant Admin schedules an interview task for the candidate from a Job Post interview round, using the round default interviewer when no override is supplied. Prior rounds must be completed or skipped first. |
| `GET` | `/api/talent-pilot/interviews/my-tasks` | Interviewer/Tenant Admin loads assigned scheduled/completed interview tasks. |
| `GET` | `/api/talent-pilot/interviews/{id}/question-recommendations` | Assigned interviewer/Tenant Admin loads the latest persisted AI interview question set with summary, coverage, model/version metadata, and structured questions. |
| `POST` | `/api/talent-pilot/interviews/{id}/question-recommendations/generate` | Assigned interviewer/Tenant Admin explicitly generates or regenerates a persisted LLM-backed question set with at least 10 questions. Body: `{ regenerateReason?: string | null }`. |
| `GET` | `/api/talent-pilot/interviews/{id}/question-recommendations/download` | Assigned interviewer/Tenant Admin downloads the latest persisted AI question set as DOCX. |
| `POST` | `/api/talent-pilot/interviews/{id}/feedback` | Assigned interviewer/Tenant Admin submits scores, recommendation, and required feedback comments. Completing feedback marks the interview completed and queues recruiter notification. |
| `GET` | `/api/talent-pilot/portal/job-posts` | Public candidate-safe list of published Job Posts only. |
| `GET` | `/api/talent-pilot/portal/job-posts/{id}` | Public candidate-safe detail for one published Job Post. |
| `GET` | `/api/talent-pilot/portal/invitations/{candidateInvitationId}?token={token}` | Public resolver for tracked candidate invite links. Validates the id/token pair and returns invitation/job status metadata without candidate profile details. |
| `POST` | `/api/talent-pilot/portal/job-posts/{id}/applications` | Candidate-authenticated apply endpoint. Creates or returns the active application linked to Candidate, Job Post, and Job Request. Optional `candidateInvitationId` and `invitationToken` consume a matching invite and complete existing `Invited` applications. |
| `GET` | `/api/talent-pilot/portal/my-applications` | Candidate-authenticated application history/status list for the signed-in Candidate. |
| `GET` | `/api/notifications` | Load notifications for current user. |
| `POST` | `/api/notifications/{notificationId}/read` | Mark notification as read. |

Candidate application document metadata may include storage-provider fields for backend/admin traceability. Candidate-facing screens must not display provider names, container/path values, or implementation notes about local server storage versus future Azure Blob storage. Show user-relevant document fields only: file name, document type, upload date, size, and evidence/indexing status.
