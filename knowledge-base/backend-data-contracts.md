# Backend Data Contracts

- Backend APIs are the source of truth for all business data.
- Do not add local fixture arrays, browser-storage persistence, hard-coded business tables, or generated screen data in Angular feature components.
- Navigation metadata, route titles, empty-state copy, and static icon names may live in frontend code.
- Login cards are allowed for MVP testing, but each card must call `GET /api/auth/login-options` and `POST /api/auth/login`.
- `AuthService.currentUser` stores the backend-resolved user context: display name, highest-priority role label, all roles, permissions, groups, tenant id, and route access.
- Frontend permission checks use the backend `permissions` array only; do not infer authorization from display labels, cards, or local mock state.
- Admin Center uses `/api/admin/*` endpoints. Tenant profile uses `/api/admin/tenant-profile`.
- Talent Pilot internal operations use explicit operational endpoints such as `/api/job-requests`, `/api/pmo/queue`, `/api/recruitment/queue`, and `/api/notifications`. Legacy `/api/talent-pilot/*` aggregate routes may remain for compatibility only.
- Candidate Experience screens must not show fake jobs, applications, interviews, or profile data. If the backend contract is missing, show a backend-required empty state.
- API endpoint names and schema notes must stay in `API_CONTRACT.md` or the knowledge base, never in visible product UI.
- Timestamps from the backend are UTC ISO strings. UI converts them with `Intl.DateTimeFormat` and keeps the raw UTC value in `datetime`/tooltip where useful.
- Metric cards must display backend-derived counts/statuses. Do not use metric cards for static product explanations.
- Editable UI controls must call backend save/update endpoints and surface validation errors from the API.

## Current Integration Gaps

- Admin read screens for users, roles, groups, notifications, AI settings, integrations, audit logs, and tenant profile are backend-backed.
- Talent Pilot first-slice screens load backend data through explicit operational endpoints for job requests, PMO queue, PMO-to-recruitment handoff, recruitment queue, workflow assignment claiming, and notifications.
- Realtime operational notifications use SignalR `/hubs/notifications` with the `NotificationReceived` event and the same notification DTO shape as `GET /api/notifications`.
- Admin Center Notifications can call `POST /api/admin/notifications/test`; the response is prepended to the current user's notification list and shown as an operational toast.
- Candidate Experience and not-yet-built operational screens intentionally render backend-required empty states instead of local mock data.
- Remaining command flows still need real mutation endpoints wired: add/edit/deactivate users, role creation/editing, bulk role assignment, notification template save, and generic row actions.
- Create Job Request posts to backend, but department and skill lookup/autocomplete endpoints are still needed to replace free-text MVP fields.
