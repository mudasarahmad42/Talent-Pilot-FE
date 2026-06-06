# API Integration

- Backend APIs are the source of truth for business data.
- Angular dev mode calls `http://localhost:5058/api` when served on port `4200`.
- Deployed builds call relative `/api`.
- Keep HTTP calls inside focused services/facades instead of embedding request logic directly in templates.
- Store access token, refresh token, expiry, and current user profile through `AuthService` and `StorageService`.
- Use backend UTC ISO timestamps as the raw value. Format display locally with `Intl.DateTimeFormat`.
- Use route guards and `PermissionService` for authorization checks.
- Do not show endpoint names, SQL names, or schema hints in product UI.

## Current Endpoint Groups

- `GET /api/auth/login-options`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET` / `PUT /api/admin/tenant-profile`
- `GET` / `POST` / `PUT` / `PATCH /api/admin/users`
- `GET` / `POST` / `PUT` / `PATCH /api/admin/roles`
- `GET /api/admin/groups`
- `GET` / `PUT /api/admin/access-policies/*`
- `GET` / `PUT /api/admin/notifications/*`
- `GET /api/admin/ai-settings/*`
- `GET /api/admin/audit-logs`
- `GET /api/admin/audit-logs/export`
- `GET /api/talent-pilot/snapshot`
- `GET /api/talent-pilot/job-requests/intake-options`
- `POST /api/talent-pilot/job-requests`
- Job Request create/draft payloads include optional `clientContext` so users can provide industry/domain/product context for AI drafting and matching. The field is displayed in request detail/PMO review when returned by the backend.
- `GET /api/talent-pilot/interviews/my-tasks`
- `GET /api/talent-pilot/interviews/{interviewId}/question-recommendations`
- `POST /api/talent-pilot/interviews/{interviewId}/question-recommendations/generate`
- `GET /api/talent-pilot/interviews/{interviewId}/question-recommendations/download`
- `GET /api/talent-pilot/job-requests/{jobRequestId}/recruiter-sourcing`
- `POST /api/talent-pilot/job-requests/{jobRequestId}/online-headhunting/search`
- `PATCH /api/talent-pilot/online-headhunting/leads/{onlineCandidateLeadId}/status`
- `POST /api/talent-pilot/job-posts/{jobPostId}/manual-candidates`
- `POST /api/talent-pilot/workflow-assignments/{assignmentId}/claim`
- `PATCH /api/talent-pilot/notifications/*`

## Missing Frontend Contracts

- Candidate job listing, job detail, apply, profile, applications, and interview APIs.
- Dedicated recruiter candidate prospect APIs remain future scope; AI Headhunting MVP persists online leads and converts them only through the manual candidate invite endpoint.
- Online Headhunting search is asynchronous: the POST returns queued metadata, and the frontend listens for realtime notification metadata `refreshEntityType=RecruiterSourcing` to reload the sourcing workspace when results are ready.
- Interview scheduling and feedback APIs.
- Hiring Manager final review and offer outcome APIs.
