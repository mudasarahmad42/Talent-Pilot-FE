# Users and Roles

Users and roles control who can access Talent Pilot and which product areas they can operate. Admin Center should make access decisions explicit and auditable.

## User Management

Tenant Admins can manage internal users for the company. Candidate accounts are separate and should not be treated as internal staff accounts.

Core user actions:

- Invite a user.
- Activate or deactivate a user.
- Assign one or more roles.
- Add the user to workflow groups.
- Review user status and recent activity.

## Role Model

Talent Pilot uses role-based access with permission checks for important workflows.

| Role | Primary Use |
| --- | --- |
| Tenant Admin | Configure tenant settings and override operational workflows when required. |
| Presales | Create job requests from client or business demand. |
| PMO | Review requests, match bench employees, and route work forward. |
| Recruiter | Source candidates, publish jobs, screen applicants, and manage interviews. |
| Hiring Manager | Review final candidates, make hiring decisions, and close requests. |
| HOD | Review department-specific interview feedback and decision context. |
| Interviewer | Complete assigned interview feedback tasks. |
| Employee | Internal profile and bench data participant. |
| Candidate | External applicant account for Candidate Portal. |

## Permission Boundaries

Roles should map to permissions rather than direct screen assumptions.

Examples:

- `ViewJobRequests` lets users inspect job request work.
- `CreateJobRequests` lets Presales or approved users create requests.
- `ClaimWorkflowTasks` lets PMO users claim routed assignments.
- `ManageCandidates` lets recruiters manage sourcing and applications.
- `ManageInterviews` lets users schedule and complete interview tasks.
- `ManageHiringDecisions` lets hiring managers review final decisions.
- `ManageAdminCenter` lets Tenant Admins access configuration.

## Groups

Groups are used for routing and ownership. Admins should keep groups small enough to be meaningful but broad enough to avoid single-person bottlenecks.

Common groups:

- PMO Team
- Recruitment Team
- Engineering Interviewers
- Hiring Managers
- Presales Team

## Access Review

Access changes should be reviewed during onboarding, role changes, and offboarding.

Recommended checks:

- Deactivated users cannot claim tasks or submit decisions.
- Candidate users cannot access internal app routes.
- Internal users do not automatically receive admin access.
- Workflow groups have at least one active eligible user.
