# Frontend Agent Guide

This repository is the Angular frontend for Talent Pilot. AI agents working here must keep frontend behavior backend-driven and must not edit backend SQL or .NET files from this repo.

## Read First

- `README.md`
- `SECURITY_GUIDELINES.md`
- `CONTRIBUTING.md`
- `API_CONTRACT.md`
- `DATABASE_SCHEMA_NOTES.md`
- `knowledge-base/README.md`
- `knowledge-base/api-integration.md`
- `knowledge-base/backend-data-contracts.md`
- `knowledge-base/business-rules.md`

## Folder Map

| Path | Purpose |
| --- | --- |
| `src/app/features/admin/` | Admin Center shell/pages. |
| `src/app/features/internal/` | Talent Pilot internal app screens. |
| `src/app/features/candidate/` | Candidate Experience screens/placeholders. |
| `src/app/features/shell/` | Main app shell/navigation. |
| `src/app/core/` | API services, auth, models, permissions, route guards. |
| `src/styles.scss` | Shared visual system and page styles. |
| `stitch-reference/selected/` | Google Stitch HTML/PNG references for visual matching. |
| `knowledge-base/` | Frontend behavior and integration docs. |
| `contributors/` | Required contributor session logs. |

## Frontend Data Rules

- Business records must come from backend APIs.
- Do not add local fixture arrays for users, jobs, candidates, applications, workflows, or notifications.
- If a backend endpoint is missing, render a backend-required empty state and document the missing contract.
- Keep frontend models aligned with backend DTOs.
- Do not infer permissions from display labels; use backend-returned permission ids.
- Do not expose SQL table names, endpoint internals, or backend enum implementation details in visible UI.

## Working With Backend Agents

When a backend agent adds or changes an API:

1. Add or update interfaces in `src/app/core/*.ts`.
2. Add API methods in focused services.
3. Update consuming components.
4. Update `knowledge-base/api-integration.md` and `knowledge-base/backend-data-contracts.md`.
5. Build with `npm run build`.

If the frontend needs an API that does not exist, document the expected contract instead of faking business data.

## Visual Work

- Use `stitch-reference/selected/` for layout and spacing direction.
- Preserve the existing product shell, typography, nav, and blue-accent design language.
- Do not turn production screens into static design galleries.
- Keep controls real: if a button looks actionable, it should have a backend contract or a disabled/backend-required state.
- After visual changes, verify responsive behavior and run `npm run build`.

## Typical Frontend Agent Scopes

- Admin Center page polish: `src/app/features/admin/**` and related styles.
- Internal app screen polish: `src/app/features/internal/**`, shell, and related styles.
- API integration: `src/app/core/**`, typed models, route guards, and consuming components.
- Candidate Experience: `src/app/features/candidate/**` only; do not add recruiter/admin workflows here.

## Do Not Touch

- Backend `.cs` files.
- SQL scripts.
- Backend `knowledge-base/` files unless explicitly assigned cross-repo docs work.
- Generated folders such as `dist`, `.angular/cache`, `node_modules`, or logs.

## Validation

Run:

```powershell
npm run build
```

If your work changes visible UI, also verify the route manually in the browser and note whether screenshot-diff verification was performed.

## Finish Checklist

- Branch is not `main`.
- `npm run build` passes.
- Frontend docs updated when behavior/API assumptions changed.
- Contributor log updated in `contributors/<contributor-name>/README.md`.
- Known backend dependencies or visual gaps are reported.
