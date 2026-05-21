# Talent Pilot Database Schema Notes

These notes capture frontend-driven schema decisions for the backend/database agents. The executable backend SQL now lives in `../Backend Code/scripts`; keep these notes aligned as screens and endpoints evolve.

## Cross-Cutting Rules

- Store all timestamps in UTC (`CreatedAtUtc`, `UpdatedAtUtc`, `LastActiveAtUtc`, `OccurredAtUtc`).
- Return timestamps as ISO strings from APIs; the Angular client formats them in the user's local timezone.
- Store tenant timezone as an IANA timezone id such as `Asia/Karachi`, not a fixed offset.
- Use stable ids for roles, groups, permissions, and tenant settings. Visible labels can change.
- Write audit records for configuration changes, access changes, workflow decisions, AI agent actions, and invite-link events.

## Tenants

Suggested `Tenants` fields:

| Field | Notes |
| --- | --- |
| `TenantId` | Primary key. |
| `DisplayName` | Configurable, shown as tenant/company name. |
| `Slug` | Configurable unique identifier for routes/settings. |
| `Domain` | Company domain, for internal users. |
| `AdminContactEmail` | Tenant admin contact. |
| `DefaultTimezoneId` | IANA id, e.g. `Asia/Karachi`. |
| `DefaultCurrencyCode` | MVP values: `PKR`, `USD`, `EUR`. |
| `Status` | `Active` or `Inactive`. |
| `SetupComplete` | Boolean setup indicator, not onboarding state. |
| `CreatedAtUtc`, `UpdatedAtUtc` | UTC timestamps. |

Suggested `TenantRecruitmentSettings` fields:

| Field | Notes |
| --- | --- |
| `TenantId` | One-to-one with tenant. |
| `CareerDisplayName` | Candidate-facing careers brand. |
| `PrimaryColorHex` | Branding color. |
| `CandidateLoginRequired` | Candidate portal setting. |
| `CandidateCvFormat` | MVP value: `DOCX`. |
| `PublicJobsEnabled` | Controls candidate-facing published jobs. |
| `InviteExpiryDays` | Configurable invite token lifetime. |
| `ReapplyCooldownDays` | Configurable reapply block window. |

## Auth And Access

Current frontend login is card-based for testing, but production auth should use normal credentials and resolve a full user context.

Suggested tables:

- `AppUsers`: login identity, email, display name, account status, last active UTC.
- `UserCredentials` or external identity mapping: password hash or provider identity.
- `RefreshTokens` or `UserSessions`: revocable refresh/session state.
- `Roles`: tenant/system roles with priority. Priority `1` is highest priority.
- `Permissions`: permission catalog.
- `RolePermissions`: permission grants.
- `UserRoles`: user role assignments.
- `Groups`: workflow routing groups only.
- `GroupMembers`: users assigned to workflow routing groups.
- `TenantAccessPolicies`: tenant-level access policy settings such as permission resolution mode and bench visibility role.

Suggested `TenantAccessPolicies` fields:

| Field | Notes |
| --- | --- |
| `TenantAccessPolicyId` | Primary key. |
| `TenantId` | Tenant scope. |
| `PermissionResolutionMode` | `MergeAllAssignedRoles` or `HighestPriorityRoleOnly`. MVP default: `MergeAllAssignedRoles`. |
| `BenchVisibilityRoleId` | Role allowed to view benched employees. MVP default: PMO role. |
| `UpdatedByUserId` | User who last changed the policy. |
| `CreatedAtUtc`, `UpdatedAtUtc` | UTC timestamps. |

`GET /api/auth/me` should return the current user, tenant, role codes, role display labels, effective permissions, highest-priority role display name, groups, and route access. Groups must not grant permissions; roles grant permissions.

Auth profile storage and derivation rules:

- Store stable role identity as `Roles.Code` (`TenantAdmin`, `PMO`, `Candidate`, etc.).
- Store visible role label as `Roles.Name`; do not use display labels for authorization checks.
- Return `roleDisplayName` from the assigned role with the lowest priority number.
- Return `roles[].code` for frontend guards and `roles[].displayName` for UI.
- Candidate login can use a portal-scoped `Candidate` role with no Admin Center permissions.

Permission display role should be derived by backend from assigned roles and priority when returning user summaries. Do not store it as a separate configurable tenant value. User list screens should show only this derived highest-priority role, while edit/detail APIs can return the full assigned role list.

Do not add an `OperationalAccess` user column. Operational access is computed from role permissions, tenant access policies such as bench visibility, and workflow routing groups. If the UI needs an explanation, return it from a details endpoint as a derived summary rather than persisting it.

## Roles And Permissions

Suggested `Roles` fields:

| Field | Notes |
| --- | --- |
| `RoleId` | Primary key. |
| `TenantId` | Nullable for platform/system roles; required for tenant-created roles. |
| `Name` | Visible role name. |
| `Type` | `System`, `Tenant`, or `Custom`. |
| `Scope` | `Platform`, `Tenant`, or `Portal`. |
| `Priority` | Integer priority. `1` is highest priority and is used to derive display role when needed. |
| `IsProtected` | True for system roles that tenant admins can review but not modify. |
| `Status` | `Active` or `Inactive` only. Do not store `Protected` or `Custom` here. |
| `CreatedAtUtc`, `UpdatedAtUtc` | UTC timestamps. |

Suggested `Permissions` fields:

| Field | Notes |
| --- | --- |
| `PermissionId` | Stable id such as `access.users.manage`. |
| `DisplayName` | User-facing permission label. |
| `GroupName` | UI grouping such as Admin Center, Access Control, Recruitment, Governance. |
| `Description` | Short explanation for edit/review screens. |
| `Status` | `Active` or `Inactive`. |

`RolePermissions` should store the many-to-many permission grants. Add/edit role UI sends `permissionIds[]`; backend replaces grants transactionally and writes an audit log entry with before/after metadata. System/protected roles are read-only for tenant admins.

Admin role tables should expose `Status` as role lifecycle only. `IsProtected` controls editability and bulk-assignment availability. `Type` tells whether a role is system, tenant, or custom.

Bulk role assignment should continue to write `UserRoles`; do not create a separate role-membership source of truth. A batch table is useful for auditability and support.

Suggested `RoleAssignmentBatches` fields:

| Field | Notes |
| --- | --- |
| `RoleAssignmentBatchId` | Primary key. |
| `TenantId` | Tenant scope. |
| `RoleId` | Role added to matched users. |
| `FilterJson` | Query/filter payload used for the batch. |
| `SelectionMode` | `AllFilteredUsers` or `SelectedUsers`. |
| `SelectedUserIdsJson` | Nullable JSON array when the admin selected specific preview users. |
| `MatchedCount` | Users matched during preview/apply. |
| `AssignedCount` | Users newly assigned to the role. |
| `SkippedCount` | Users already assigned or not eligible. |
| `CreatedByUserId` | Admin who executed the batch. |
| `CreatedAtUtc` | UTC timestamp. |

Bulk assignment must be transactional for the batch metadata and each new `UserRoles` row. Protected platform/portal roles should not be bulk assignable from tenant Admin Center.

## Notification Templates

Notification events are workflow-triggered. Email templates are database records edited from Admin Center; frontend must not hard-code final subject/body text once backend is connected.

Suggested `NotificationEvents` fields:

| Field | Notes |
| --- | --- |
| `NotificationEventId` | Primary key. |
| `EventCode` | Stable code such as `CREATE_BY_PRESALES`. |
| `DefaultRecipientType` | Group, user, candidate, interviewer, or hiring manager resolver. |
| `Status` | `Active` or `Inactive`. |
| `CreatedAtUtc`, `UpdatedAtUtc` | UTC timestamps. |

Suggested `NotificationTemplates` fields:

| Field | Notes |
| --- | --- |
| `NotificationTemplateId` | Primary key. |
| `NotificationEventId` | Linked notification event. |
| `TenantId` | Tenant-specific override; nullable only if global defaults are supported. |
| `Name` | Template name shown in Admin Center. |
| `Subject` | Editable email subject. |
| `Body` | Editable email body. |
| `AllowedVariablesJson` | Variables accepted for this event, for example `jobTitle` or `candidateName`. |
| `Status` | `Active` or `Inactive`. |
| `UpdatedByUserId` | Last admin who edited the template. |
| `CreatedAtUtc`, `UpdatedAtUtc` | UTC timestamps. |

Template edits should write audit events with before/after subject/body metadata. Delivery handlers should read the active template for the event and tenant before sending email.

## Admin Users

Adding an internal user through `POST /api/admin/users` should:

- Create or attach an `AppUser`.
- Create tenant membership.
- Assign roles through `UserRoles`.
- Assign routing groups through `GroupMembers`.
- Set account status to `Invited`, `Active`, or `Disabled`.
- Send an invite when needed.
- Write an audit log entry.

## Candidate Source Labels

Candidate source labels are seeded lookup values used when recruiters manually source candidates and send invite links. They are not active job-board connector records, and Admin Center should not expose source-label CRUD in the MVP.

Suggested `CandidateSourceLabels` fields:

| Field | Notes |
| --- | --- |
| `CandidateSourceLabelId` | Primary key. |
| `TenantId` | Tenant scope. |
| `DisplayName` | Recruiter-facing label such as `LinkedIn`, `Indeed`, `Referral`, or `Other`. |
| `Code` | Stable backend value such as `LinkedInManual`; do not use this as the primary visible label. |
| `ReportingCategory` | External sourcing, referral reporting, manual review, etc. |
| `Status` | `Active` or `Inactive`. |
| `CreatedAtUtc`, `UpdatedAtUtc` | UTC timestamps. |

Candidate applications and invitation records should reference the selected `CandidateSourceLabelId` so source reporting stays stable even if visible labels change later.

## AI Runtime And Agents

AI runtime settings are read from backend appsettings/configuration and shown in Admin Center as read-only data. Persist operational agent runs separately from static appsettings values.

Suggested `AiAgentDefinitions` fields:

| Field | Notes |
| --- | --- |
| `AiAgentDefinitionId` | Stable id, e.g. `bench-matching`. |
| `DisplayName` | User-facing agent name. |
| `Responsibility` | Short description shown in Admin Center. |
| `InputSummary` | Human-readable input summary. |
| `OutputSummary` | Human-readable output summary. |
| `MvpBoundary` | Human decision boundary for this agent. |
| `Enabled` | Boolean for active registry. |
| `CreatedAtUtc`, `UpdatedAtUtc` | UTC timestamps. |

MVP active agents:

- Requirement Parser
- CV Parser
- Bench Matching
- Talent Rediscovery
- Fit Explanation
- Hiring Manager Decision Brief

Suggested `AiAgentRuns` fields:

| Field | Notes |
| --- | --- |
| `AiAgentRunId` | Primary key. |
| `TenantId` | Tenant scope. |
| `AiAgentDefinitionId` | Agent that executed. |
| `SourceEntityType`, `SourceEntityId` | Job request, candidate, application, interview packet, etc. |
| `ModelName`, `EmbeddingModelName` | Runtime values used for the run. |
| `InputHash` | Hash of prompt/input payload for audit without storing sensitive full text in list views. |
| `OutputSummary` | Human-readable summarized result. |
| `Status` | `Succeeded`, `Failed`, or `Skipped`. |
| `StartedAtUtc`, `CompletedAtUtc` | UTC timestamps. |
| `MetadataJson` | Scores, evidence ids, vector version, or failure detail. |

## Audit Logs

Suggested `AuditLogs` fields:

| Field | Notes |
| --- | --- |
| `AuditLogId` | Primary key. |
| `TenantId` | Tenant scope. |
| `OccurredAtUtc` | UTC timestamp. |
| `ActorUserId` | Nullable for system/agent events. |
| `ActorDisplayName` | Snapshot for list display. |
| `EventType` | Stable event key. |
| `EntityType` | Backend entity type. |
| `EntityId` | Backend entity id. |
| `RecordLabel` | Human-readable label for UI tables. |
| `Area` | Admin Center, Workflow, AI, Talent Pilot App, etc. |
| `MetadataJson` | Before/after fields, correlation id, source ip, or agent run id. |

Audit APIs should return `OccurredAtUtc` as a UTC ISO string, for example `2026-05-21T04:42:00.000Z`. The client owns local-time rendering with `Intl.DateTimeFormat`; never persist or return preformatted values such as `Today 09:42` or `Yesterday`.

Audit list APIs should not expose sensitive candidate personal data by default. Use drill-down endpoints with authorization for full details.
