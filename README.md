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

## Dependency Policy

- Prefer free, open-source, well-maintained libraries.
- Do not add paid UI kits, paid SDKs, hosted SaaS dependencies, or closed-source packages without team approval.
- Prefer Angular Material and small focused Angular/CDK utilities before introducing another UI framework.
- Keep frontend state simple: Angular signals, RxJS, and focused services are enough for MVP.
- Do not add global state libraries unless the team agrees the current state flow is no longer traceable.

## Prerequisites

- Node.js `22.12+`
- npm `11+`
- Backend API running at `http://localhost:5058`
- SQL Server setup handled by the backend repository

## Setup

```powershell
git clone https://github.com/mudasarahmad42/Talent-Pilot-FE.git
cd Talent-Pilot-FE
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

## Recommended Development Loop

```powershell
npm start -- --host 127.0.0.1 --port 4200
npm run build
```

Use the browser at:

```text
http://127.0.0.1:4200/auth/login
```

## Branch And PR Policy

- Do not work directly on `main`.
- Only the code owner, Mudasar Ahmad, is allowed to commit or push directly to `main`.
- Every contributor, including AI-assisted contributors, must create their own separate branch and open a pull request into `main`.
- Contributors and AI agents must not push automatically after making changes; push only when Mudasar Ahmad or the current user explicitly asks for it.
- When a push is explicitly requested, push only the contributor's own branch and only the files that belong to the requested task.
- GitHub branch protection should block direct pushes to `main` for everyone except the code owner.
- This repo includes `.githooks/pre-push`; run `git config core.hooksPath .githooks` after cloning to block accidental local pushes to `main`.
- Use descriptive owner-aware branch names such as `feature/<contributor-name>/admin-integrations-status`, `fix/<contributor-name>/pmo-queue-layout`, or `docs/<contributor-name>/contributor-guardrails`.
- Keep pull requests focused. Do not mix unrelated visual, API, schema, and documentation changes in one PR unless they are required for the same feature.
- PRs must include validation notes, changed screens/routes, touched files, and any known limitations.
- Do not merge your own PR unless you are the code owner or have explicit approval from the code owner.
- If an AI tool generated or edited code, the contributor remains responsible for reviewing, testing, and documenting the changes.
- See `CONTRIBUTING.md` for branch protection, PR, and merge-conflict rules.

## Contributor Logs

- Each contributor must add or update a personal README under `contributors/<contributor-name>/README.md`.
- The contributor README should be 10-20 lines per work session.
- Include session date, branch name, commit summary, files touched, screens changed, API contracts changed, schema changes, tests run, and known risks.
- If schema or backend contract changes affect the frontend, link the related backend PR or document the dependency clearly.
- Contributors who are non-technical or AI-assisted should use `contributors/README.md` as the template.
- Missing contributor logs are a PR review issue.

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

## Frontend Guardrails

- This is a production application, not a static design gallery.
- AI agents must read `AGENTS.md` before editing frontend files.
- Google Stitch references in `stitch-reference/selected/` are visual/layout references.
- Backend APIs and knowledge-base documents are the source of truth for behavior and data.
- Missing backend APIs should produce clear empty states, not frontend mock records.
- Configurable settings must be editable controls with validation, save/reset behavior, and API calls.
- Keep business logic out of components where practical; use focused services and typed models.
- Keep routes permission-protected using backend-returned permissions.
- Keep pages responsive and usable on mobile widths.
- Follow `SECURITY_GUIDELINES.md` before adding dependencies, auth/session logic, API calls, forms, or file upload UI.

## Design References

Curated Google Stitch exports live in:

```text
stitch-reference/selected/
```

Commit curated `.png` and `.html` references that help developers match screens. Do not commit Chrome profiles, local QA screenshots, or transient API response dumps.

## Knowledge Base

Read these before changing frontend behavior:

- `knowledge-base/README.md`
- `knowledge-base/authentication.md`
- `knowledge-base/api-integration.md`
- `knowledge-base/business-rules.md`
- `knowledge-base/implemented-vs-planned.md`
- `API_CONTRACT.md`
- `DATABASE_SCHEMA_NOTES.md`
- `CONTRIBUTING.md`

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

## Before Opening A PR

- Run `npm run build`.
- Verify the changed route in the browser.
- Update `knowledge-base/` or `API_CONTRACT.md` when changing behavior, permissions, endpoints, or missing API assumptions.
- Update your contributor log in `contributors/<contributor-name>/README.md`.
- Do not commit generated folders such as `node_modules`, `dist`, `.angular/cache`, browser profiles, logs, or local secrets.
