# Frontend Test Coverage

This file tracks frontend source-of-truth coverage and known test-hardening gaps.

## Implemented Coverage

- Angular service/component tests cover auth login and refresh behavior, API/store contracts, SignalR notification startup, create Job Request, PMO Review, Bench Matching, Talent Rediscovery, candidate portal apply, interview feedback, and hiring-manager handoff API calls.
- Playwright E2E covers the critical multi-role workflow path:
  - Presales creates a Job Request, uses AI description drafting, and sees PMO routing.
  - PMO opens review, runs Bench Matching, manually recommends internally, and can forward to recruiters.
  - Recruiter opens sourcing and Talent Rediscovery, candidate applies through the portal, interviewer feedback screen loads, and Hiring Manager review loads.
- Browser tests use deterministic route mocks for AI, notification, and workflow APIs. They do not call Ollama, Tavily, Google, or SMTP.

## Playwright Execution Rule

- Codex writes Playwright scripts and expected assertions when browser verification is needed, but Codex does not launch Chromium or run those scripts during implementation turns.
- The user runs Playwright separately at the end of the implementation batch.
- Codex can continue to run non-browser verification such as Angular unit tests, frontend builds, backend tests, and static API/contract checks.

## Tracked Gaps

- Broad component folder extraction is still pending for large inline feature components. Existing admin components already use separate HTML/SCSS files, but most internal/candidate components still have inline templates/styles.
- E2E currently validates UI workflow behavior and mocked API intent. Database-level assertions for email outbox rows, vector embeddings, and AI run logs remain backend/integration-test responsibilities.
- Additional E2E depth is still needed for negative paths: AI failure states, refresh-token expiry, invalid role access, and email recipient edge cases.
- CI wiring is not yet added; scripts are present and ready to be called by CI.
