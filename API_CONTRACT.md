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
| `GET` | `/api/admin/tenant-profile/slug-availability?slug={slug}` | Validate tenant slug uniqueness before save or on blur. | Backend TODO |
| `POST` | `/api/admin/tenant-profile/logo` | Upload or replace tenant logo/brand asset. | Backend TODO |
| `GET` | `/api/admin/audit-logs?entityType=Tenant&entityId={tenantId}` | Open audit history for tenant profile changes. | Backend |

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
  userCount: number;
  roleCount: number;
  setupComplete: boolean;
  configuredLlmModel: string;
  configuredEmbeddingModel: string;
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

Backend side effects:

- Persist tenant identity fields on `Tenants`.
- Persist candidate defaults on `TenantRecruitmentSettings`.
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
- System/protected roles are read-only from tenant Admin Center UI. Their grants can be reviewed, but not changed by tenant admins.
- Custom/tenant roles can be created and edited from Admin Center with a permission multi-select.
- Bulk role assignment is allowed only for tenant-managed roles that the current admin can manage. Do not allow bulk assignment for platform, portal, or protected system roles.
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

Hiring Pipeline stores fixed interview stage templates that recruiters select when creating a job post. Candidate applications inherit the selected template stages. Per-candidate custom stage flows are not primary MVP behavior.

Required backend endpoints:

| Method | Endpoint | Purpose | Implementation Status |
| --- | --- | --- | --- |
| `GET` | `/api/admin/hiring-pipeline/templates?page={page}&pageSize={pageSize}&search={search}` | Load interview stage templates, stage flow, default owner roles, active job count, and status. | Backend |
| `GET` | `/api/admin/hiring-pipeline/templates/{templateId}` | Load one template for edit/details. | Backend TODO |
| `POST` | `/api/admin/hiring-pipeline/templates` | Create an interview stage template. | Backend TODO |
| `PUT` | `/api/admin/hiring-pipeline/templates/{templateId}` | Update template name, stages, owner roles, and status. | Backend TODO |
| `PATCH` | `/api/admin/hiring-pipeline/templates/{templateId}/status` | Activate or deactivate a template. | Backend TODO |

Backend behavior:

- Store ordered stages for each template.
- Let job posts reference one selected template.
- Copy or snapshot the selected stage flow onto the job post/application pipeline when needed for history.
- Validate that each stage has a valid owner role or assignment rule.
- Write audit events for template and stage changes.

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
- Write audit events for group membership, routing purpose, default owner, and fallback policy changes.

### Admin Workflows

The Admin Center Workflows screen is configuration UI for active MVP handoffs. It has three sections only:

- Global Policies
- Routing Rules
- Transition Triggers

Do not expose a `Later Phase` workflow tab. Routing to Hiring Manager after final interview is part of the MVP flow.

Visible workflow target labels should be user-facing, such as `Hiring Manager`, while backend payloads may still store resolver keys such as `JobRequestHiringManager`.

Required backend endpoints:

| Method | Endpoint | Purpose | Implementation Status |
| --- | --- | --- | --- |
| `GET` | `/api/admin/workflows/policies` | Load tenant-level workflow fallback and routing policies. | Backend |
| `GET` | `/api/admin/workflows/routing-rules` | Load active routing rules for Presales, PMO, Recruiter, Interviewer, and Hiring Manager handoffs. | Backend |
| `POST` | `/api/admin/workflows/routing-rules` | Create a routing rule. | Backend TODO |
| `PUT` | `/api/admin/workflows/routing-rules/{ruleId}` | Update a routing rule. | Backend TODO |
| `GET` | `/api/admin/workflows/transition-triggers` | Load workflow transition events and handoff semantics. | Backend |

Notification delivery is not configurable from Workflows. Workflow handoffs should emit backend events; backend notification handlers send Email and SignalR updates automatically.

### Admin Notifications

Admin Notifications exposes workflow-driven notification events and editable email templates. Delivery logic is event-driven and should be described in product terms, not as backend-owned or code-owned UI labels.

Notification delivery rule:

- `Email` is the async email delivery channel.
- `SignalR` is the realtime in-app delivery channel for online users.
- Do not model `In-app` as a separate third channel.
- Do not expose Email/SignalR channel controls on the Workflows routing table or Notifications event table.

Required backend endpoints:

| Method | Endpoint | Purpose | Implementation Status |
| --- | --- | --- | --- |
| `GET` | `/api/admin/notifications/events?page={page}&pageSize={pageSize}&search={search}` | Load notification events, recipients, template names, status, and summary metrics. | Backend |
| `GET` | `/api/admin/notifications/events/{eventId}` | Load one notification event and linked templates. | Backend TODO |
| `GET` | `/api/admin/notifications/templates` | Load editable email templates. | Backend |
| `POST` | `/api/admin/notifications/test` | Send a backend-generated test notification to the current admin user and return the notification payload. | Backend TODO |
| `PUT` | `/api/admin/notifications/templates/{templateId}` | Update template subject/body text. | Backend TODO |
| `PATCH` | `/api/admin/notifications/events/{eventId}/status` | Enable or disable a notification event when allowed. | Backend TODO |

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
```

`PUT /api/admin/notifications/templates/{templateId}` request shape:

```ts
interface UpdateNotificationTemplateInput {
  subject: string;
  body: string;
}
```

Backend behavior:

- Trigger notifications from workflow handoff events.
- Expose SignalR hub `/hubs/notifications` and emit `NotificationReceived` with the same notification DTO shape returned by `GET /api/notifications`.
- Send SignalR updates to online internal users for realtime in-app delivery.
- Send email for async internal delivery and candidate-facing messages.
- Keep event logic aligned with workflow routing rules.
- Store email template subject/body in the database. Frontend owns only the editing UI and must use the allowed variables returned by the template API.
- Validate that edited subject/body only use variables supported by the template.
- Write audit events for template and event status changes.

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
- Bench Matching: recommends currently benched employees to PMO.
- Talent Rediscovery: prioritizes previous similar-job candidates before external sourcing.
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
| `GET` | `/api/admin/audit-logs/{auditLogId}` | Load full audit detail including entity type, entity id, before/after values, correlation id, and metadata. | Backend TODO |
| `GET` | `/api/admin/audit-logs/export?area={area}&from={from}&to={to}` | Export filtered audit history. | Backend TODO |

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
| `GET` | `/api/notifications` | Load notifications for current user. |
| `POST` | `/api/notifications/{notificationId}/read` | Mark notification as read. |
