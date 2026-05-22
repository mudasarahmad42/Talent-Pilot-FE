# Frontend Security Guidelines

These rules apply to every human or AI-assisted contributor working on the Talent Pilot frontend.

## Core Rules

- Do not commit secrets, API keys, connection strings, tokens, `.env` files, browser profiles, logs, or generated build folders.
- Do not hard-code tenant ids, user ids, roles, permissions, tokens, or passwords in Angular code.
- Do not store business records in local storage or session storage. Only auth/session values approved by `AuthService` may be stored.
- Do not create frontend-only authorization rules. Always use backend-returned permission ids and route guards.
- Do not expose backend endpoint names, SQL table names, schema notes, token details, or internal workflow implementation labels in visible product UI.
- Do not add paid SDKs, hosted SaaS SDKs, trackers, analytics tools, or closed-source packages without code owner approval.

## Forms And User Input

- Validate forms before sending requests, but treat backend validation as the source of truth.
- Show safe, user-friendly errors. Do not render raw exception details or stack traces.
- Bind data through Angular templates and typed models. Avoid direct DOM mutation for business UI.
- Keep file upload UI aligned with backend rules. For MVP, candidate CV upload is DOCX-only.

## API And Session Handling

- Keep HTTP calls inside focused services, not directly in templates.
- Use typed request/response models for backend contracts.
- Use `AuthService`, `StorageService`, guards, and interceptors for authentication flow.
- On authorization failure, route to a safe access-denied or login path. Do not silently reveal protected data.

## AI-Assisted Contribution Rules

- AI-generated UI must be reviewed by a contributor before PR submission.
- AI must not invent local fixture data for real business records when backend APIs are missing.
- AI must not bypass route guards, permission checks, or API contracts to make a screen look complete.
- AI must update `knowledge-base/`, `API_CONTRACT.md`, and contributor logs when behavior changes.

## Required Checks Before PR

- Run `npm run build`.
- Manually verify changed routes in the browser.
- Confirm no generated folders, logs, local secrets, or temporary screenshots are staged.
- Update `contributors/<contributor-name>/README.md` with the session summary.
