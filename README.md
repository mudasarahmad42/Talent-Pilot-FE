# Talent Pilot Frontend

Angular frontend for the Talent Pilot TKXEL AI Unlimited MVP.

The frontend is a real application shell, not a design mock. Business data must come from backend APIs. If an endpoint is not ready, render a backend-required empty state and document the missing contract.

## Stack

- Angular 21
- TypeScript 5.9
- Angular Material
- RxJS and Angular signals
- SCSS/CSS variables
- npm 11.x
- Node.js 22.12 or newer

This repository follows the approved Talent Pilot frontend stack documented in the parent workspace under `TECH STACK DETAILS/frontend/README.md` when that workspace is available.

## Setup

```powershell
npm install
```

## Run Locally

Start the backend API first from `../Backend Code`.

Then start Angular:

```powershell
npm start -- --host 127.0.0.1 --port 4200
```

Open:

```text
http://127.0.0.1:4200
```

When running on port `4200`, the frontend calls:

```text
http://localhost:5058/api
```

Deployed builds use relative `/api`.

## Build

```powershell
npm run build
```

## Current Implemented Areas

- Backend-backed card login at `/auth/login`.
- Auth session storage with access token, refresh token, expiry, current user profile, roles, groups, and permissions.
- Permission constants, route guards, and `PermissionService` checks.
- Admin Center shell and pages for tenant profile, users, roles, groups, workflows, notifications, AI settings, integrations, and audit logs.
- Tenant Profile tabs for profile, branding, career page, and security.
- Talent Pilot internal shell for dashboard, job requests, create request, request detail, PMO queue, notifications, and backend-required placeholders for incomplete screens.
- Candidate Experience shell and backend-required placeholders until candidate APIs are implemented.
- UTC timestamp display formatting from backend ISO values.

## Current Integration Rules

- Do not add frontend fixture arrays for business records.
- Do not store business rows in local storage.
- Navigation labels, icon names, empty-state copy, and route metadata may stay in frontend code.
- Buttons and form fields must call backend endpoints before becoming real user actions.
- Endpoint names and schema notes belong in docs, not visible UI.
- Permission checks must use backend-returned permission ids through `PermissionService`.

## Knowledge Base

Read these before changing frontend behavior:

- `knowledge-base/README.md`
- `knowledge-base/authentication.md`
- `knowledge-base/api-integration.md`
- `knowledge-base/business-rules.md`
- `knowledge-base/implemented-vs-planned.md`
- `API_CONTRACT.md`
- `DATABASE_SCHEMA_NOTES.md`

## Login For MVP Testing

The login screen shows backend-provided demo user cards. Clicking a card calls:

```text
GET /api/auth/login-options
POST /api/auth/login
```

The backend returns a complete user profile with:

- display name
- highest-priority role label
- all roles
- effective permissions
- workflow groups
- tenant context

This is intentionally easy for demo/testing, but it still exercises backend auth/profile resolution.

## MVP Guardrails

Do not add active UI for:

- HOD approval
- finance/budget approval
- offer signoff approval chains
- onboarding operations
- payroll
- IT equipment
- orientation
- automated LinkedIn/Indeed posting
- external scraping
- candidate-facing AI scores
- PDF CV parsing

AI is advisory only. Human users make recruitment decisions.
