# Talent Pilot Frontend Memory

## Current Build Understanding

This frontend was started from the current Talent Pilot MVP memory on May 20, 2026.

The first frontend slice is intentionally small:

```text
Login
-> Presales creates Job Request
-> Workflow routes it to PMO Group
-> PMO user sees PMO Queue
-> PMO claims request
-> Notifications update
```

## Product Boundaries

- Admin Center is for configuration only.
- Talent Pilot App is for internal recruitment operations.
- Candidate Experience is for logged-in candidates only.
- Do not mix candidate self-service screens into the internal app.
- Do not mix admin configuration screens into Talent Pilot App.

## MVP Scope Guardrails

Do not build active UI for:

- HOD approval workflows. HOD/department head can appear only as an interviewer user/group.
- Finance or budget approvals.
- Offer approval/signoff workflows.
- Equipment, orientation, payroll, benefits, or onboarding task operations.
- Automated LinkedIn/Indeed/external job board publishing.
- Candidate-facing AI scores.
- PDF CV parsing.

External sourcing is manual in MVP. Recruiters should see user-facing source labels such as LinkedIn, Indeed, Referral, and Other. Backend can store enum-style values such as `LinkedInManual` or `IndeedManual`, but those should not be the primary visible labels.

## First Angular Implementation Decisions

- Angular 21 standalone components.
- Angular Material is the intended UI component layer; use Material components for presentational notes, tooltips, and polished admin UI affordances instead of hand-rolled heavy cards where possible.
- SCSS plus CSS variables.
- CSS ownership rule: new route/component-specific styles must live in that component's `styleUrl`/SCSS file so Angular encapsulation can isolate them. Use `src/styles.scss` only for true global concerns such as font imports, CSS variables/tokens, base reset, Angular Material theme overrides, overlays, snackbars, and intentionally shared utilities.
- CSS naming rule: page-specific selectors must use unique, surface-prefixed class names and be scoped through a stable route/component root. For Admin Center, prefer `admin-center-*`, `admin-shell-*`, or existing `admin-*` names under `.admin-page` / `.admin-shell`; do not introduce generic global selectors such as `.btn`, `.panel`, `.card`, `.table`, `.status`, `.header`, `label`, `input`, or `table` for page styling.
- Existing global CSS should be tightened opportunistically, not moved in one large risky migration. When touching an existing global rule, first check whether other components share the class. If it is not a real shared utility, rename/scope it to the owning surface and update every usage. If multiple components genuinely need the same style, either keep a clearly prefixed shared utility or copy the rule into each component stylesheet instead of relying on accidental global cascade.
- Backend APIs are now the source of truth. Do not add frontend business mock data or local fixture arrays.
- Role-aware navigation, but only the first internal-app slice is active.
- Admin Center is a separate routed shell under `/admin-center`.
- Feature routes use standalone `loadComponent` lazy loading to keep route ownership clear and avoid eager imports in `app.routes.ts`.
- Core service boundaries are intentionally small:
  - `AuthService` owns login/session state only.
  - `StorageService` owns local/session storage access and JSON parsing.
  - `ConfigurationService` owns app/API configuration defaults.
  - `ApiService` owns typed HTTP calls and base URL handling.
  - `NotificationService` owns snackbars/toasts.
  - `apiErrorInterceptor` centralizes HTTP error notifications.
- Google Stitch screens are the visual/layout reference for frontend implementation. Do not replace Stitch layouts with generic summary renderers when a Stitch screen exists.
- When adding or changing buttons, form fields, filters, or action rows, verify their visual indentation and spacing in the rendered route. Controls must have explicit layout rules (`gap`, wrapping, stable columns, and responsive behavior as needed) so labels, inputs, and adjacent buttons never appear concatenated or misaligned.
- Codex should not run Playwright/browser smoke checks or launch Chromium during implementation. For UI verification, Codex should write the Playwright script or manual QA checklist with expected assertions, then leave execution for the user to run separately at the end. Codex may still run non-browser checks such as `npm test`, `npm run build`, and static/code-level verification.
- Row-level action methods should default to a three-dot overflow menu using a compact `more_vert` trigger unless the user or screen reference explicitly asks for visible actions. Keep menu items clearly labeled with icons and close the menu after each action.
- Configurable means editable: use Angular Material form controls, validation, save/reset behavior, a backend API call, and an entry in `API_CONTRACT.md`.
- Do not show backend endpoint URLs, controller names, or mock API wiring notes in the product UI. Keep endpoint details in `API_CONTRACT.md` and use product-facing UI copy for modals, tooltips, and snackbars.
- Interview scheduling UI must not imply Google Meet or calendar events are auto-created in local/demo mode. The recruiter modal should describe the field as an optional existing meeting link; Google Calendar event creation is only available when backend Google Calendar integration is enabled.
- Candidate Profile Details should show interview meeting events in context: job/request, round, scheduled time, meeting/calendar links, and persisted participant chips. Keep this linked to `GET /api/talent-pilot/recruitment/candidates/{candidateId}/profile` rather than duplicating frontend-only meeting state.
- Notification bell route metadata can target both internal `/app/...` routes and candidate `/candidate/...` routes. Interview scheduling realtime notifications use this so candidate, interviewer, and hiring-manager participants can open the relevant status/workbench/sourcing screen.
- Screen-level frontend code is disposable when it blocks Stitch fidelity. Keep working business services, API contracts, and route guards, but do not keep frontend-owned business data.
- Backend controller ownership should separate authentication from access administration. `AuthController` owns login/session/current-user behavior only; admin users, roles, groups, and access policies belong under Admin Identity/Access Control controllers.
- Current login is intentionally card-based for fast hackathon testing, but production auth is now modeled behind it. Each card calls `POST /api/auth/login`; backend returns access/refresh tokens plus tenant, profile, role codes, role display name, permissions, groups, and route access from database assignments.
- Frontend auth session is stored under `talent-pilot.auth.*`; use `AuthService` methods for role, permission, and route checks instead of reading storage directly.
- AI cards are advisory only. Humans make decisions.
- Later-phase placeholders must use:
  - `Later phase`
  - `Not available in this MVP.`

## Google Stitch Alignment Pass

On May 20, 2026 the application shell and shared page renderers were moved closer to the official Google Stitch screen references already stored under `stitch-reference/`.

- Talent Pilot App now uses the Stitch-style dark topbar, 260px recruitment sidebar, icon navigation, compact action buttons, KPI cards, operational tables, and advisory side rails.
- Talent Pilot App action groups should use clear spacing and wrapping. Footer actions such as Back, Save, Publish, and Close must render as separated buttons with consistent indentation, not as visually merged text.
- Candidate Experience now uses the Stitch-style light portal topbar, TKXEL jobs hero, candidate job cards, filter controls, candidate-safe status rail, and profile completion CTA.
- Admin Center generic pages now share the same Stitch-style card, metric, and table treatment as Tenant Profile instead of using older generic summary blocks. Top metric cards must show backend-derived counts/statuses that help an admin make decisions; do not use those cards as decorative placeholders for static product rules such as `Enabled`, `Configured`, `Fixed`, or future-scope labels.
- High-traffic rendered screenshots captured for QA:
  - `stitch-reference/current-app-dashboard.png`
  - `stitch-reference/current-job-requests.png`
  - `stitch-reference/current-candidate-jobs.png`
  - `stitch-reference/current-admin-tenant-profile.png`

Future frontend changes should continue comparing against the relevant Stitch reference export before inventing new layout patterns.

## Maintainability Pass

On May 20, 2026 the core app plumbing was simplified for team maintainability:

- Direct `localStorage` calls were removed from feature services and routed through `StorageService`.
- HTTP support was centralized with `ApiService` and a functional API error interceptor.
- Admin Tenant Profile save/reset feedback now goes through `NotificationService` instead of each screen owning snackbar behavior.
- `app.routes.ts` now lazy-loads standalone feature components while keeping guards and route data explicit.

Keep future state management lightweight. Use signals or simple RxJS subjects where shared state is needed; do not add NgRx or another global store unless the MVP demonstrably needs it.

## Admin Center Implementation Notes

Admin Center was added as the second surface after the internal Talent Pilot App slice.

Current Admin Center routes use one data-driven page renderer:

```text
/admin-center/tenant-profile
/admin-center/users
/admin-center/roles-permissions
/admin-center/groups
/admin-center/departments
/admin-center/skills
/admin-center/hiring-pipeline
/admin-center/workflows
/admin-center/notifications
/admin-center/notification-outbox
/admin-center/ai-settings
/admin-center/integrations
/admin-center/audit-logs
```

Admin Center guardrail:

- Only `TenantAdmin` can open `/admin-center`.
- Admin pages are configuration/readiness screens, not operational recruitment screens.
- Tenant Profile follows the official Google Stitch MCP screen reference downloaded to `stitch-reference/admin-tenant-profile-branding.html` and `stitch-reference/admin-tenant-profile-branding.png`: fixed-style admin topbar/sidebar, top actions, working Profile/Branding/Career Page/Security tabs, right Tenant Summary, and subtle support/scope notes.
- Branding, Career Page, and Security are working Tenant Profile tabs, not decorative labels or separate sidebar pages. Old `/admin-center/branding` and `/admin-center/career-page` URLs redirect to `/admin-center/tenant-profile`.
- Tenant Profile is backed by `AdminSettingsApiService`, which calls `GET /api/admin/tenant-profile` and `PUT /api/admin/tenant-profile`.
- Tenant Profile display name is configurable tenant data. The visible `TKXEL` value represents the database-backed tenant display name, not a hard-coded app constant.
- Tenant Profile slug is configurable tenant data. The visible `tkxel` value represents the database-backed tenant slug and needs uniqueness/route-impact validation before save.
- Tenant Profile default timezone and currency are configurable tenant data. The visible `Asia/Karachi` and `PKR` values represent database-backed tenant localization defaults, not hard-coded app constants.
- Tenant Profile default timezone must be stored as an IANA timezone id such as `Asia/Karachi`, not a fixed GMT offset. The frontend can use browser `Intl.supportedValuesOf('timeZone')` for the timezone list and derive the visible offset at runtime.
- Tenant Profile status is `Active` or `Inactive`, stored on the tenant record. Do not use `Paused` for this field.
- Tenant Profile candidate defaults are configurable tenant recruitment settings. Login requirement, CV format, public job visibility, invite expiry, and reapply cooldown should come from database-backed tenant settings. The visible `7 days` invite expiry is a seeded configurable value.
- Tenant Profile summary rail shows AI runtime values returned by the API from backend appsettings: configured LLM model and configured embedding model. Do not show SSO integration or region in this Tenant Profile summary.
- Scope guardrails should not be presented as dominant cards or blunt visible labels such as `Out of MVP`, `Not MVP`, or `Later phase`. If the user needs context, put it in a tooltip or use neutral product wording.
- Users follows the official Stitch Users reference in `stitch-reference/selected/admin-center-users.html` and `.png`: header action/search, three metric cards, dense user access table, active account chips, role pills, and no visible seed-state labels.
- Users API expectations are tracked in `API_CONTRACT.md`: list/search users with summary metrics, add/edit internal user, change account status, load roles, load routing groups, read/update bench visibility access policy, and fetch user audit logs. The Add Internal User UI should create tenant membership, role assignments, group memberships, invite state, and audit records through `POST /api/admin/users`.
- Users table should show only the derived highest-priority role name for each user. Do not append priority notation such as `(P1)` to the visible role pill. Add/edit user screens should use multi-select role assignment because users can have multiple roles; full assigned roles and numeric priority should be available in edit/details, not the main list column.
- Users table should not show a `Groups` column. Users can belong to multiple workflow routing groups, so group memberships belong in add/edit/details UI and API payloads instead of a misleading single list column.
- Users table should not show `Operational Access`. That value is not stored as a user property; it is derived from role permissions, tenant access policies, and workflow routing groups when needed in details.
- Row-level Admin actions also follow the default three-dot overflow-menu convention unless a Stitch reference or explicit product request requires visible icon buttons. Users row actions open task-specific UI: edit access, resend invite, deactivate with reason, and audit history.
- Roles & Permissions should expose role-conflict resolution as one configurable tenant access policy: merge permissions from all assigned roles, or use the highest-priority role only. Priority rule details and permission display role are not visible configurable fields in Tenant Permission Resolution; priority is stored on roles, and display role is derived by backend.
- Roles & Permissions row actions must open real UI surfaces: edit role/details, permission review, and role audit history. Add Role opens a modal with role name, tenant scope, priority, status, and permission grant checkboxes. System/protected roles are read-only for tenant admins; tenant/custom roles can be edited.
- Roles & Permissions needs a bulk user assignment flow for tenant-managed roles. The UI should let admins filter users, preview matched users, select all returned users or select specific users, then add the selected role in bulk. This adds a role assignment and never removes existing roles. Protected platform/portal roles are not bulk assignable from tenant Admin Center.
- Role lifecycle status is only Active or Inactive. Protected is an editability flag for application-owned roles, and Custom is a role type/source. Do not show Protected or Custom in the status/lifecycle column.
- Role endpoints, permission ids, and audit-log query details belong in `API_CONTRACT.md` and `DATABASE_SCHEMA_NOTES.md`, not inside visible Admin Center modals.
- The Users page bench access metric is configuration-backed. It should read the role that can view benched employees from the backend access policy and link users to Roles & Permissions for changes. MVP default is PMO.
- Groups are shown as workflow routing recipients only; they do not grant permissions. Visible UI should avoid backend-only wording such as `Backend-owned` or `No UI setup`; fallback behavior belongs in tooltips and `API_CONTRACT.md`.
- Group creation should suggest clear routing names using `Role - Department` or `Role - Scope`, such as `PMO - Engineering`, `PMO - Sales`, `Recruiting - Engineering`, and `Interview Panel - QA`.
- Groups metric copy should use plain language. Use `Pending group tasks` for workflow items currently assigned to routing groups and awaiting action; avoid ambiguous jargon such as `Open handoffs`.
- Departments are lightweight recruitment lookups used by job requests, bench matching, hiring-manager context, and reporting. Do not present Departments as payroll setup or full org-chart management in primary UI.
- Skills are normalized recruitment terms used by requirement parsing, CV parsing, bench matching, candidate rediscovery, and explainable matching evidence. Keep the visible UI focused on skill normalization and aliases, not broad taxonomy-management scope.
- Manual sourcing CV Parser output should prefill editable fields only. Do not display the parser summary or extracted text in the modal and do not append it to recruiter notes; submit it as hidden `parsedCvEvidence` so the backend stores application evidence and vector context.
- Manual sourcing invitation messages should render the concrete candidate portal job detail URL from the active `jobPostId` and current app origin. Do not show `<JOB-LINK>` or other placeholder tokens in the textarea.
- Recruiter applicant-ranking rationale should not expose raw CV/resume filenames. Use generic document labels such as `Resume document`, keep evidence text wrapped inside its card, and offer authenticated document download actions when structured application document metadata is present.
- Candidate-facing application status pages should not expose storage-provider implementation details such as `LocalFileSystem`, server storage notes, container names, or future Azure Blob migration copy. Show submitted document names, upload dates, sizes, and evidence/indexing status only; keep storage-provider behavior in documentation and backend metadata.
- Hiring Pipeline uses reusable interview templates as starting points. Recruiters can customize the ordered interview rounds per job post; candidate applications follow the job-post-specific round plan. After each interviewer submits feedback, the candidate application returns to Recruiter review so Recruiter moves it to the next round or Hiring Manager Review.
- Workflows follows the source-of-truth department routing model: Department Routing is the only visible configuration area. Do not expose backend stages/actions, tenant-editable authorization rules, a `Later Phase` tab, or an escalation tab. Routing to Hiring Manager after final interview is active MVP behavior, not a later-phase placeholder. Do not show Email/SignalR channel controls on Workflows; backend notification handlers send those automatically after handoff events.
- Remove decorative workflow visuals that do not provide admin utility. Routing rules should focus on editable rules, active status, resolver targets, and backend resolver notes.
- Notifications are event-driven handoff messages with editable email templates. Do not show per-event Email/SignalR channel controls or channel columns; delivery is automatic when backend notification handlers receive workflow events. Do not present `In-app` as a separate channel; SignalR is the realtime in-app delivery mechanism for online users. Avoid visible implementation wording such as `backend-owned` or `Code-owned`.
- Notification templates are backend/database records. Admin Center should list email templates, let admins edit subject/body text, and show allowed variables. The frontend owns the editing UI only; backend stores templates, validates variables, renders messages, sends Email/SignalR, and writes audit events.
- Integrations show backend-derived manual sourcing metrics, single-use invite activity, failed invites, and a short manual sourcing workflow. Do not show a read-only source-label table or an `Add Source` action in MVP; source labels are seeded lookup data used by recruiter invite/application flows, not an Admin Center configuration surface yet.
- AI Settings are split into `Runtime & Guardrails` and `AI Agents` tabs. Provider, LLM, embedding model, and dimensions come from backend appsettings/API and remain read-only in the UI. The AI Agents tab lists the seven MVP agents and their responsibilities: Requirement Parser, Job Description Drafter, CV Parser, Bench Matching, Talent Rediscovery, Fit Explanation, and Hiring Manager Decision Brief. Do not list `Automatic Stage Movement` or `Final Hiring Decision` as visible AI guardrail rows; keep AI decision boundaries in documentation/tooltips instead.
- Audit Logs should show human-readable event records. Backend entity names such as `ResourceRequest`, `CandidateInvitation`, and `BenchEmployeeProposal` belong in API payloads, not primary visible table cells. Store all audit timestamps in UTC and return ISO strings; client UI converts them to the user's local timezone for display. The list column should be labeled `Local Time`, and the raw UTC ISO value should remain available through the `<time datetime>` attribute and tooltip.

## Full Screen Coverage Pass

The app now has routed screens for all three MVP surfaces.

### Admin Center

Implemented as `/admin-center/:pageId`; screen data must come from backend APIs:

- Tenant Profile
- Branding
- Career Page
- Users
- Roles & Permissions
- Groups
- Departments
- Skills
- Hiring Pipeline
- Workflows
- Notifications
- AI Settings
- Integrations
- Audit Logs

### Talent Pilot App

Implemented as internal routes backed by `/api/talent-pilot/*` where contracts exist:

- Dashboard
- My Work
- Job Requests
- Create Job Request
- Job Request Detail
- PMO Queue
- Bench Matching
- Internal Resource Referral
- Presales Resource Review
- Recruitment Queue
- Job Publishing
- Candidates
- Manual Candidate Add
- Prospect Invite
- Candidate Profile Details
- Candidate Pipeline
- Interview Scheduling
- Interview Feedback
- Hiring Manager Review
- Offer and Onboarding / Offer Outcome
- Notifications
- Reports

### Candidate Experience

Implemented as `/candidate/*` through the candidate portal shell. Anonymous users see Jobs only; any signed-in user can see Jobs, My Applications, Profile, and Interviews in the top nav, but protected candidate routes keep the Candidate role guard. Internal users on candidate routes must be labeled as internal/recruiter/admin accounts, not as normal candidate accounts. Candidate business data must come from backend endpoints before the screens render real content:

- Job Listing with generated hero image, client-side search/department/location/experience filters, job cards, and a right-side status rail.
- Job Detail
- Job Application Form
- Invite Registration
- Confirm Application
- Candidate Profile backed by `GET/PUT /api/talent-pilot/portal/profile`; email is read-only identity data, profile fields are editable, and selected skills come from active backend skill options.
- My Applications
- Application Status
- Interview Schedule derived from candidate application timeline/interview events.
- Reapply Blocked State

Candidate profile saves are not just visual state: the backend persists profile, education, current work, and skills, then best-effort upserts a `Candidate` / `CandidateProfile` vector for rediscovery/ranking context. Future cover-letter context should coexist with this profile vector path instead of replacing it.

## Demo Users

| Role | Name | Email |
| --- | --- | --- |
| Tenant Admin | Mudasar Ahmad | admin@tkxel.com |
| Presales | Ahmed Raza | presales@tkxel.com |
| PMO | Ali Khan | pmo@tkxel.com |
| Recruiter | Sara Malik | recruiter@tkxel.com |
| Hiring Manager | Fatima Noor | hiring.manager@tkxel.com |
| Interviewer | Bilal Hussain | interviewer@tkxel.com |
| Candidate | Ayesha Khan | ayesha.khan@example.com |

## Primary Backend API Contracts

```text
GET  /api/admin/tenant-profile
PUT  /api/admin/tenant-profile
GET  /api/admin/users
GET  /api/admin/users/{userId}
POST /api/admin/users
PUT  /api/admin/users/{userId}
PATCH /api/admin/users/{userId}/account-status
GET  /api/admin/roles
GET  /api/admin/groups
GET  /api/admin/access-policies/bench-visibility
PUT  /api/admin/access-policies/bench-visibility
POST /api/auth/login
GET  /api/auth/me
GET  /api/talent-pilot/snapshot
POST /api/talent-pilot/job-requests
GET  /api/talent-pilot/job-requests/{entityId}/activity
POST /api/talent-pilot/workflow-assignments/{assignmentId}/claim
PATCH /api/talent-pilot/notifications/{notificationId}/read
PATCH /api/talent-pilot/notifications/read-all
```

Detailed request/response shapes are tracked in [API_CONTRACT.md](API_CONTRACT.md).
