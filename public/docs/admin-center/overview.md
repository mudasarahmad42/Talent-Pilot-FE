# Admin Center Documentation

The Admin Center is where administrators configure Talent Pilot for a company. It keeps tenant setup, access control, workflow routing, notifications, integrations, and AI settings separate from daily recruiting work.

For the MVP, Talent Pilot starts with TKXEL as the active tenant. The product should still be organized so another software company, staffing company, or recruiting agency can use the same structure later.

## Purpose

Admin Center manages company-level configuration. It is not the place for recruiters to move candidates, schedule interviews, or make hiring decisions. Those actions belong in the Talent Pilot App.

Administrators use Admin Center to:

- Manage tenant profile and company identity.
- Configure users, roles, permissions, groups, and departments.
- Maintain hiring pipeline templates and workflow routing.
- Review notification settings and email delivery records.
- Configure integrations, candidate sources, and AI settings.
- Audit tenant activity and configuration changes.

## What Is A Tenant?

A tenant is one company or organization using Talent Pilot.

Examples:

- TKXEL
- Another software company
- A staffing company
- A recruitment agency

Each tenant owns its own operational data:

- Users
- Roles and permissions
- Job posts
- Candidates
- Employees
- Bench data
- Workflows
- AI settings
- Branding
- Integrations
- Dashboards

## Multi-Tenant Direction

Talent Pilot should keep tenant boundaries explicit even while the first version runs with one active tenant.

Recommended MVP approach:

```text
Single active tenant in UI
TenantId exists in database
Seed TKXEL as default tenant
Admin Center manages tenant-level configuration
Future version can add tenant switching and hosting controls
```

## Admin Center Sections

| Section | Purpose |
| --- | --- |
| Tenant Profile | Manage company name, slug, domain, status, timezone, and career page identity. |
| Users | Invite, activate, deactivate, and assign users to roles and groups. |
| Roles and Permissions | Configure access profiles for Tenant Admin, PMO, Recruiter, Presales, Interviewer, Hiring Manager, HOD, Employee, and Candidate. |
| Groups | Manage routing teams such as Recruitment Team, PMO Team, Engineering Interviewers, Hiring Managers, and Presales Team. |
| Departments | Configure departments used in requests, employees, dashboards, and permissions. |
| Skills | Maintain normalized skills used by parsing, matching, reporting, and job requirements. |
| Hiring Pipeline | Configure default pipeline stages and interview templates. |
| Workflows | Configure who receives handoffs, reviews, reminders, and notifications. |
| Notifications | Manage editable email templates and delivery behavior. |
| Email Outbox | Review queued, sent, and failed email delivery records. |
| AI Settings | Review AI runtime, agents, embeddings, prompts, and guardrails. |
| Integrations | Configure services and source labels used by recruiting workflows. |
| Candidate Sources | Maintain source labels used for prospects, applications, invitations, and reporting. |
| Audit Logs | Review tenant-scoped user actions and system decisions. |

## Tenant Profile

Tenant configuration should include:

- Tenant name
- Tenant slug
- Company domain
- Admin contact
- Tenant status
- Allowed email domains
- Default timezone
- Default currency
- Career page URL

Tenant Admins manage settings inside their own tenant. Super Admin behavior is platform-level future scope and should not be used for daily recruitment work.

## Boundaries

Admin Center must not mix candidate-facing portal work or recruiter operations into configuration screens.

Use these boundaries:

- Candidate self-service belongs in Candidate Portal.
- Recruiting execution belongs in Talent Pilot App.
- Tenant-level settings belong in Admin Center.
- Sensitive access changes should remain auditable.
