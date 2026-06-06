# Talent Pilot Hackathon Evaluation Guide

This guide maps the current product to the hackathon rubric and gives the demo team a concrete evidence checklist.

## Estimated Score

Current realistic score after the latest hardening and AI observability work: **66-69 / 80**.

With deployment smoke evidence, recorded demo backups, and a cleaner evaluation story, the target should be **72+ / 80**.

## Technical Rubric (/30)

| Area | Current estimate | Evidence to show |
| --- | ---: | --- |
| Code quality and architecture | 4 / 5 | Layered .NET backend, Angular feature modules, repository/service contracts, route guards, tenant scoping, source-of-truth docs. |
| UI/UX implementation | 4 / 5 | Role-specific dashboards, candidate portal, recruiter sourcing, PMO review, HM offer flow, Admin Center settings. |
| Testing and documentation | 4-4.5 / 5 | Backend unit tests, Angular unit tests, Playwright E2E full Senior Angular Developer flow, this guide, source-of-truth docs. |
| Security and performance | 3.5 / 5 | JWT hardening, BCrypt credentials, rate limiting, tenant-scoped public portal, safer headers, HTTP deployment-compatible HTTPS/HSTS flags. |
| AI architecture and patterns | 4.5 / 5 | RAG assistant, vector similarity, agent run logging, prompt versions, fallback scoring, human decision boundary. |
| AI engineering maturity | 4.5 / 5 | Strict JSON contracts, repair/fail-closed behavior, citations, sensitive request guard, Admin Center AI Agent Run Log, AI Evaluation checklist. |

## Product Rubric (/50)

| Area | Current estimate | Evidence to show |
| --- | ---: | --- |
| Solution effectiveness | 4.5 / 5 | End-to-end hiring workflow from request intake to candidate joining and request closure. |
| Workflow transformation | 4.5 / 5 | AI assists PMO matching, recruiter ranking, interview question generation, decision brief, and RAG Q&A. |
| End-to-end completeness | 4 / 5 | Presales, PMO, recruiter, interviewer, hiring manager, candidate portal, offer, and closure flows. |
| Output quality | 3.5-4 / 5 | Evidence-grounded rankings, structured interview questions, cited RAG answers, offer draft and final outcome. |
| User experience | 4 / 5 | Role-tailored screens, tenant-aware candidate signup/apply/profile, clear status badges and toasts. |
| Edge cases and exceptions | 3.5 / 5 | Duplicate signup/applications, missing CV fallback, AI JSON repair/fail-closed, unavailable semantic similarity, disabled public jobs. |
| Human oversight | 4.5 / 5 | AI is advisory; shortlist/reject/hire/close remain human actions. Guardrails are visible in Admin Center. |
| Adoption readiness | 3.5-4 / 5 | Tenant settings, notification worker status, Google Calendar integration, rate limiting, test automation. |
| Business impact | 4 / 5 | Reduces coordination effort across PMO, recruiting, interviewers, and hiring managers. |
| Demo and articulation | Depends on delivery | Use the demo path below and explicitly call out AI evidence, guardrails, and human ownership. |

## Demo Path

Use the **Senior Angular Developer** storyline.

1. Presales creates a resource request with AI-assisted job description drafting.
2. PMO reviews the request, runs internal bench AI ranking, asks RAG why the recommended employee is or is not a good fit, then forwards to recruiters.
3. Recruiter publishes a job post and uses the candidate portal link.
4. Candidate signs up, completes profile/CV context, and applies.
5. Recruiter ranks applicants with AI, opens RAG fit assistant, shortlists, and schedules HR screening.
6. Interviewer generates structured AI interview questions and submits feedback.
7. Hiring manager opens decision review, asks decision assistant, generates offer, records final outcome, and closes the request.
8. Admin Center > AI Settings > Agent Run Log shows model, prompt version, status, input hash, semantic status, and human-review boundary.
9. Admin Center > AI Settings > AI Evaluation shows score, status, evidence, and next demo action for AI maturity rubric items.

## Commands For Evidence

Backend:

```powershell
cd "C:\My Data\AI Unlimited\HR System\Discussions\Zoho But Better\Application Code\Backend Code"
dotnet test
```

Frontend:

```powershell
cd "C:\My Data\AI Unlimited\HR System\Discussions\Zoho But Better\Application Code\Frontend Code"
npm run build
npm test
npm run e2e
```

Focused workflow automation:

```powershell
cd "C:\My Data\AI Unlimited\HR System\Discussions\Zoho But Better\Application Code\Frontend Code"
npx playwright test tests/e2e/senior-angular-workflow.spec.ts --project=chromium --headed
```

## Talking Points

- Talent Pilot is an AI-assisted hiring operating system connecting Presales, PMO, Recruiting, Interviewers, Hiring Managers, and Candidates.
- AI produces structured recommendations, but humans own workflow movement and final decisions.
- RAG answers are evidence-grounded with citations and context scopes.
- Agents have prompt versions, strict JSON contracts, fail-closed/repair logic, and observable run logs.
- Tenant settings control public portals, branding, security defaults, notifications, integrations, roles, and routing.

## Remaining Highest-Impact Improvements

- Add automated prompt-contract fixture tests that exercise every agent against malformed and valid JSON outputs.
- Add live deployment smoke tests against the deployed URL.
- Add a demo seed reset script so judges always see the same clean storyline.
- Capture screenshots/video from the full Playwright workflow for backup demo evidence.
