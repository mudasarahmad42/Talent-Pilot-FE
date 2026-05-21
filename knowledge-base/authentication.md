# Authentication

- Login remains card-based for MVP testing, but the cards come from `GET /api/auth/login-options` and each card calls `POST /api/auth/login`.
- The backend resolves the real user profile from database assignments and returns tokens plus user context.
- Frontend stores:
  - access token in `talent-pilot.auth.access-token`
  - refresh token in `talent-pilot.auth.refresh-token`
  - expiry in `talent-pilot.auth.expires-at`
  - resolved user profile in `talent-pilot.auth.current-user`
- `AuthService.currentUser` is the frontend source of truth after login.
- `roles` stores stable role codes such as `TenantAdmin`, `PMO`, and `Candidate`.
- `roleDisplayName` stores the human label such as `Tenant Admin` or `PMO / Resource Manager`.
- `permissions` stores effective permission ids resolved by backend policy.
- `groups` stores workflow routing group names for current MVP queue checks.
- Use `PermissionService` for new UI checks; it wraps the backend-resolved permission ids from `AuthService.currentUser`.
- Stable permission constants live in `src/app/core/permissions.ts` and must match backend `AccessConstants` / SQL seed values.
- Admin Center entry is permission-based; `adminGuard` allows users with Admin Center, tenant profile, user, role, notification, AI settings, or audit permissions.
- Route-level checks use `permissionGuard` with `data.requiredAnyPermissions`, `data.requiredAllPermissions`, or Admin Center page mappings.
- Button/action checks should use `PermissionService` and should also guard the click handler, not only disable the visible button.
- The Angular dev build calls `http://localhost:5058/api` when running on port `4200`; deployed builds use relative `/api`.
