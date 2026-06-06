# Candidate Portal Documentation

Candidate Portal is the public-facing experience for applicants. It lets candidates browse jobs, create an account, apply, maintain profile information, upload documents, and review application progress.

## Purpose

Candidate Portal should feel separate from internal recruiting operations. Candidates should see only the information that helps them apply and track their own process.

Candidates can:

- Browse published jobs.
- View job details.
- Create a candidate account.
- Apply for a job.
- Upload a CV and supporting documents.
- Review application status.
- See interview information when scheduled.

## Access Model

Published job pages can be public. Application submission, profile editing, document upload, and personal application history require candidate authentication.

Candidate accounts must not grant access to:

- Admin Center
- Talent Pilot App
- Internal workflow queues
- Interviewer feedback forms
- Hiring manager decision screens

## Tenant-Aware Routes

Candidate routes may include a tenant slug for branded career pages.

Examples:

- `/candidate/jobs`
- `/candidate/tkxel/jobs`
- `/candidate/tkxel/jobs/{jobPostId}`
- `/candidate/tkxel/apply/{jobPostId}`

The same Candidate Portal component should support tenant-specific and default routes.

## Candidate Boundaries

Candidate Portal should not expose:

- Internal assignment ownership
- PMO review details
- Recruiter notes
- AI ranking scores
- Interviewer private feedback
- Hiring decision rationale that is not intended for candidates

Candidate-facing messages should stay clear, respectful, and action-oriented.
