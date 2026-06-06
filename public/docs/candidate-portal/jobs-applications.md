# Jobs and Applications

Candidates use Jobs and Applications pages to find openings, inspect job details, apply, and confirm submission status.

## Job Listings

The jobs page lists published job posts only. Draft, closed, or internal-only requests should not appear in Candidate Portal.

Job listings should show:

- Job title
- Department or role family
- Location or remote policy
- Employment type
- Short summary
- Published status

## Job Detail

The job detail page provides the information a candidate needs before applying.

Recommended sections:

- Job summary
- Responsibilities
- Required skills
- Preferred skills
- Experience level
- Work location
- Application call to action

Invite links may add contextual messaging, but they should not bypass required authentication or application validation.

## Applying

The apply flow creates or returns the active application for the signed-in candidate, job post, and job request.

Expected behavior:

- Candidate login is required before applying.
- A candidate cannot create duplicate active applications for the same job.
- The application form should preserve typed data where possible.
- The confirmation page should make the next step clear.

## Reapply Rules

Reapply behavior should be based on application state and tenant policy.

Examples:

- Active application exists: block duplicate application.
- Previous application rejected: allow or block based on configured reapply window.
- Job post closed: do not allow new application.

## Application Confirmation

After submission, the candidate should see:

- Job title
- Application status
- Submitted documents
- Next expected step
- Recruiter or support contact when appropriate
