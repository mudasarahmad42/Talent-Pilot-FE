# Candidate Pipeline

Candidate Pipeline gives internal users a stage-based view of applications, interviews, screening status, and candidate progress.

## Pipeline Purpose

The pipeline should help recruiters and Tenant Admins see where each application stands and what action is needed next.

Common stages:

- Applied
- Screening
- Interview
- Hiring Manager Review
- Offer
- Joined
- Rejected
- Withdrawn

## Application Rows

Each pipeline row should make the candidate and job context scannable.

Useful fields:

- Candidate name
- Job title
- Current stage
- Latest status
- Source
- Interview progress
- Last activity
- Available actions

## Screening Decisions

Recruiters can move applications into screening, hold, or rejection based on configured rules and permission.

Screening actions should preserve:

- Decision timestamp
- Acting user
- Reason or note when required
- Candidate-facing status where applicable

## Interview Progress

Interview rounds are copied from a job post template and can be customized per job post. Candidate-specific interview exceptions should be tracked as explicit decisions.

Examples:

- Scheduled
- Completed
- Skipped with reason
- Feedback pending

## Candidate History

Historical application details help recruiters understand prior interactions without mixing unrelated candidates or tenants.

The pipeline should link to candidate history when the user has permission to inspect candidate operations.
