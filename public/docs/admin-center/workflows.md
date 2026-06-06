# Workflows

Workflow settings decide how Talent Pilot routes work between Presales, PMO, Recruiters, Interviewers, HODs, and Hiring Managers.

## Workflow Purpose

Workflows prevent recruiting work from becoming informal handoffs. Each step should have an owner, a due expectation, and a clear next action.

Typical flow:

```text
Presales creates Job Request
PMO reviews demand and bench options
Recruiter sources candidates and publishes the job
Interviewers submit structured feedback
Hiring Manager makes the final decision
```

## Routing Rules

Routing should be tenant-scoped and based on configured departments, groups, and fallback behavior.

Admin Center should allow Tenant Admins to configure:

- Which group receives Presales-created requests.
- Which recruiters own sourcing for approved requests.
- Which interview templates are available for each job post.
- Which users can override stuck workflow assignments.
- What fallback happens when a route is missing.

## PMO Assignment

PMO routing is used when a job request needs bench review, assignment, or approval before recruitment continues.

If a route is configured, Talent Pilot assigns the work to the eligible group. If no active route exists, the system should assign Tenant Admin fallback and queue an alert so the configuration problem is visible.

## Notifications

Workflow actions may queue email and in-app notifications.

Examples:

- PMO receives a new assignment.
- Recruiter is notified when a request is ready for sourcing.
- Candidate receives an interview invitation.
- Interviewer receives an assigned feedback task.
- Hiring Manager receives final review work.

Notification templates are managed separately from workflow ownership. Workflow settings decide who should be notified; notification settings decide message content.

## Guardrails

Use these rules when configuring workflows:

- Do not route daily recruiter work through Admin Center screens.
- Do not expose internal workflow details to Candidate Portal.
- Keep fallback behavior auditable.
- Avoid assigning sensitive tasks to inactive users.
- Keep route changes visible in audit logs.
