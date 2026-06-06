# Profile and Documents

Candidate profiles and documents help recruiters evaluate applications while giving candidates a clear place to maintain their own information.

## Candidate Profile

The candidate profile should include:

- Name
- Email
- Phone
- Location
- Current role
- Years of experience
- Skills
- Education
- Work history
- Portfolio or profile links when provided

Profile data should belong to the candidate account and be reused across applications.

## CV Upload

Candidates can upload a CV as part of profile setup or application submission.

Expected behavior:

- Accept supported document formats.
- Store file metadata with the candidate profile.
- Parse the CV when parsing services are available.
- Preserve original uploaded evidence for review.
- Show a clear error if upload fails.

## Document Evidence

Parsed document evidence may support AI ranking and recruiter review, but it must not replace human judgment.

Evidence should be traceable:

- Source file name
- Upload time
- Candidate owner
- Extracted skills or summary
- Parser status

## Privacy Boundaries

Candidate documents are sensitive.

Rules:

- Candidate documents should be tenant-scoped.
- Candidate documents should not be exposed to other candidates.
- Internal users should only see documents needed for recruiting work.
- Candidate personal identifiers should not be searched externally.

## Updating Documents

When a candidate uploads a newer CV, the system should make the newest document clear while retaining enough history for audit and review.
