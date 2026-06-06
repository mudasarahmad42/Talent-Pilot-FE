# Codex Contributor Log

## 2026-06-06 - Branch: mudasar-ahmad

- Commit summary: pending tenant slug label alignment.
- Purpose: fix the Tenant Slug help-label alignment by making that label row content-width and sizing the info icon to the same 16px label line-height.
- Files touched: `src/app/features/admin/admin-page.component.html`, `src/styles.scss`, contributor log.
- Screens/routes changed: `/admin-center/tenant-profile`.
- API contracts changed: no.
- Schema changed: no.
- Tests/builds run: `npm run build` passed with the existing `candidate-page.component.ts` style budget warning; `npm test` passed with 128 tests; browser smoke confirmed the Tenant Slug label is content-width, the icon is 16px, label height matches neighboring fields, and there is no Vite overlay.
- Known risks: no additional risk identified.
- AI assistance: Codex implemented and reviewed the change.

## 2026-06-06 - Branch: mudasar-ahmad

- Commit summary: pending tenant profile action bar styling.
- Purpose: make the Tenant Profile Reset and Save Changes controls read as a polished action group with clearer placement, icons, secondary/primary color hierarchy, and responsive behavior.
- Files touched: `src/app/features/admin/admin-page.component.html`, `src/styles.scss`, `src/app/features/candidate/candidate-page.component.spec.ts`, contributor log.
- Screens/routes changed: `/admin-center/tenant-profile`.
- API contracts changed: no.
- Schema changed: no.
- Tests/builds run: `npm run build` passed with the existing `candidate-page.component.ts` style budget warning; `npm test` passed with 128 tests; browser smoke confirmed no Vite overlay, Reset uses a blue outline treatment, disabled Save is muted, enabled Save uses a blue gradient, and the form was reset after the check.
- Known risks: no additional risk identified.
- AI assistance: Codex implemented and reviewed the change.

## 2026-06-06 - Branch: mudasar-ahmad

- Commit summary: pending tenant slug tooltip.
- Purpose: explain the Tenant Slug field in Admin Center with an inline info tooltip, and keep the candidate apply route helper compatible with list/detail job records plus the existing account-switch flow so frontend verification stays green.
- Files touched: `src/app/features/admin/admin-page.component.html`, `src/app/features/candidate/candidate-page.component.ts`, contributor log.
- Screens/routes changed: `/admin-center/tenant-profile`.
- API contracts changed: no.
- Schema changed: no.
- Tests/builds run: `npm run build` passed with the existing `candidate-page.component.ts` style budget warning; `npm test` passed with 123 tests; browser smoke confirmed the Tenant Slug info button is present, focusable, and bound to the expected tooltip text.
- Known risks: browser automation did not visually surface the Material tooltip overlay on hover, but the rendered button and bound tooltip message were verified in the DOM.
- AI assistance: Codex implemented and reviewed the change.

## 2026-06-06 - Branch: mudasar-ahmad

- Commit summary: pending admin sidebar admin-center link.
- Purpose: add an Admin Center button to the internal app sidebar's Admin Tasks group so tenant admins can move from the dashboard sidebar into the Admin Center shell.
- Files touched: `src/app/features/shell/app-shell.component.ts`, contributor log.
- Screens/routes changed: `/app/dashboard` sidebar for tenant admins.
- API contracts changed: no.
- Schema changed: no.
- Tests/builds run: `npm run build` passed with the existing `candidate-page.component.ts` style budget warning; `npm test` passed with 123 tests; browser smoke confirmed the Admin Tasks group includes `Admin Center` linking to `/admin-center/tenant-profile` and the link navigates into the Admin Center shell.
- Known risks: no additional risk identified.
- AI assistance: Codex implemented and reviewed the change.

## 2026-06-06 - Branch: mudasar-ahmad

- Commit summary: pending candidate job card meta spacing.
- Purpose: add explicit spacing between the department pill and experience label on candidate job cards so `Engineering` and `3+ years` do not visually run together.
- Files touched: `src/app/features/candidate/candidate-page.component.ts`, contributor log.
- Screens/routes changed: `/candidate/jobs`.
- API contracts changed: no.
- Schema changed: no.
- Tests/builds run: `npm run build` passed with the existing `candidate-page.component.ts` style budget warning; `npm test` passed with 123 tests; browser smoke confirmed the first job card meta row uses flex wrapping with a 12px measured gap between the pill and experience label.
- Known risks: no additional risk identified.
- AI assistance: Codex implemented and reviewed the change.

## 2026-06-06 - Branch: mudasar-ahmad

- Commit summary: pending Rediscovery full reason text.
- Purpose: stop truncating Talent Rediscovery candidate reason summaries so missing-skill warnings and AI rationale text wrap fully in the result row/card.
- Files touched: `src/app/features/internal/recruiter-sourcing.component.ts`, `src/styles.scss`, contributor log.
- Screens/routes changed: `/app/recruitment/sourcing/:id?tab=rediscovery`.
- API contracts changed: no.
- Schema changed: no.
- Tests/builds run: `npm run build` passed with the existing `candidate-page.component.ts` style budget warning; `npm test` passed with 123 tests; browser smoke confirmed reason text has no ellipsis, no line clamp, and visible overflow.
- Known risks: longer reasons increase row height, which is intentional for readability.
- AI assistance: Codex implemented and reviewed the change.

## 2026-06-06 - Branch: mudasar-ahmad

- Commit summary: pending Rediscovery missing-requirement reason guard.
- Purpose: broaden the Talent Rediscovery display fallback so saved candidate reasons warn about missing primary role-domain requirements, tools, and sub-domain evidence, not only missing engineering technologies.
- Files touched: `src/app/features/internal/recruiter-sourcing.component.ts`, contributor log.
- Screens/routes changed: `/app/recruitment/sourcing/:id?tab=rediscovery`.
- API contracts changed: no.
- Schema changed: no.
- Tests/builds run: `npm run build` passed with the existing `candidate-page.component.ts` style budget warning; `npm test` passed with 123 tests; browser smoke confirmed 5 Rediscovery rows, no Vite overlay, and the first reason begins with the missing direct-evidence warning.
- Known risks: this is a display fallback for existing saved explanations; fresh backend Rediscovery runs now receive the richer department-aware assessment from the shared matcher.
- AI assistance: Codex implemented and reviewed the change.

## 2026-06-06 - Branch: mudasar-ahmad

- Commit summary: pending Rediscovery missing-skill reason guard.
- Purpose: make Talent Rediscovery candidate reasoning visibly state when a primary required technology such as Python has no direct profile evidence, even before a fresh backend ranking run refreshes stored explanations.
- Files touched: `src/app/features/internal/recruiter-sourcing.component.ts`, contributor log.
- Screens/routes changed: `/app/recruitment/sourcing/:id?tab=rediscovery`.
- API contracts changed: no.
- Schema changed: no.
- Tests/builds run: `npm run build` passed with the existing `candidate-page.component.ts` style budget warning; `npm test` passed with 123 tests; browser smoke confirmed the first Rediscovery reason begins with the direct missing-Python evidence warning.
- Known risks: the UI guard is a display fallback; fresh backend Rediscovery runs now also produce the warning from the shared matcher.
- AI assistance: Codex implemented and reviewed the change.

## 2026-06-06 - Branch: mudasar-ahmad

- Commit summary: pending rediscovery clear filter alignment.
- Purpose: make the Talent Rediscovery Clear action read as a proper filter control instead of a floating text link in an empty grid column.
- Files touched: `src/app/features/internal/recruiter-sourcing.component.ts`, `src/styles.scss`, contributor log.
- Screens/routes changed: `/app/recruitment/sourcing/:id?tab=rediscovery`.
- API contracts changed: no.
- Schema changed: no.
- Tests/builds run: `npm run build` passed with the existing `candidate-page.component.ts` style budget warning; browser smoke at 1186px confirmed `Clear filters` is a bordered control right-aligned within the filter group with no page-level horizontal overflow.
- Known risks: no additional risk identified.
- AI assistance: Codex implemented and reviewed the change.

## 2026-06-06 - Branch: mudasar-ahmad

- Commit summary: pending rediscovery container-responsive cards.
- Purpose: prevent Talent Rediscovery results from reverting to a clipped desktop table when the viewport is wide but the content panel is too narrow; candidate results now switch to card layout based on the panel width, and filters collapse cleanly.
- Files touched: `src/styles.scss`, contributor log.
- Screens/routes changed: `/app/recruitment/sourcing/:id?tab=rediscovery`.
- API contracts changed: no.
- Schema changed: no.
- Tests/builds run: `npm run build` passed with the existing `candidate-page.component.ts` style budget warning; browser smoke confirmed the 815px panel state uses card layout with hidden table headers and the 514px mobile state stacks activity/status without page-level horizontal overflow.
- Known risks: uses modern CSS container queries, which are supported by the Chromium browser used for this app workflow.
- AI assistance: Codex implemented and reviewed the change.

## 2026-06-06 - Branch: mudasar-ahmad

- Commit summary: pending rediscovery mobile candidate cards.
- Purpose: replace the collapsed table-cell look in Talent Rediscovery mobile results with intentional candidate cards that group identity, match score, reasoning, skills, activity, status, and actions coherently.
- Files touched: `src/app/features/internal/recruiter-sourcing.component.ts`, `src/styles.scss`, contributor log.
- Screens/routes changed: `/app/recruitment/sourcing/:id`.
- API contracts changed: no.
- Schema changed: no.
- Tests/builds run: `npm run build` passed with the existing `candidate-page.component.ts` style budget warning; browser smoke at 606px confirmed Talent Rediscovery results render as grid cards with grouped identity, score, reasoning, skills, activity, status, and actions and no page-level horizontal overflow.
- Known risks: no additional risk identified.
- AI assistance: Codex implemented and reviewed the change.

## 2026-06-06 - Branch: mudasar-ahmad

- Commit summary: pending rediscovery filter control cleanup.
- Purpose: remove the orphan Talent Rediscovery filter settings icon because all candidate filters are already visible and the icon had no behavior.
- Files touched: `src/app/features/internal/recruiter-sourcing.component.ts`, `src/styles.scss`, contributor log.
- Screens/routes changed: `/app/recruitment/sourcing/:id`.
- API contracts changed: no.
- Schema changed: no.
- Tests/builds run: `npm run build` passed with the existing `candidate-page.component.ts` style budget warning; browser smoke at 606px confirmed the Talent Rediscovery filters render without the orphan `Candidate filter settings` icon.
- Known risks: no additional risk identified.
- AI assistance: Codex implemented and reviewed the change.

## 2026-06-06 - Branch: mudasar-ahmad

- Commit summary: pending priority badge colors.
- Purpose: give Low, Medium, High, and Critical priority badges distinct colors instead of rendering every priority as the same amber tag.
- Files touched: `src/app/core/priority-formatting.ts`, `src/app/features/internal/recruitment-queue.component.ts`, `src/app/features/internal/job-requests.component.ts`, `src/app/features/internal/pmo-queue.component.ts`, `src/styles.scss`, contributor log.
- Screens/routes changed: `/app/recruitment/queue`, `/app/job-requests`, and `/app/pmo/queue`.
- API contracts changed: no.
- Schema changed: no.
- Tests/builds run: `npm run build` passed with the existing `candidate-page.component.ts` style budget warning; browser smoke on `/app/recruitment/queue` confirmed Critical, Medium, and High render with distinct priority classes and computed colors.
- Known risks: Low priority color was added for consistency, but the current recruiter queue sample did not include a Low priority row to verify visually.
- AI assistance: Codex implemented and reviewed the change.

## 2026-06-06 - Branch: mudasar-ahmad

- Commit summary: pending recruiter dashboard mobile fit.
- Purpose: make the recruiter dashboard adapt cleanly on narrow screens by removing page-level horizontal overflow, compacting the KPI grid and title, constraining stacked dashboard cards, and tightening the mobile topbar.
- Files touched: `src/styles.scss`, contributor log.
- Screens/routes changed: `/app/dashboard` for recruiter users.
- API contracts changed: no.
- Schema changed: no.
- Tests/builds run: `npm run build` passed with the existing `candidate-page.component.ts` style budget warning; browser smoke at 594px and 390px confirmed `documentElement.scrollWidth` matches the viewport and recruiter KPI columns switch from two columns to one below 520px.
- Known risks: the recruiter requisition table still uses an internal horizontal scroll on small screens so columns remain readable without forcing page-level scroll.
- AI assistance: Codex implemented and reviewed the change.

## 2026-06-06 - Branch: mudasar-ahmad

- Commit summary: pending fulfillment panel gradient.
- Purpose: give the job request detail Fulfillment panel a gradient treatment matching the rest of the application instead of the plain ops-panel surface.
- Files touched: `src/app/features/internal/job-request-detail.component.ts`, contributor log.
- Screens/routes changed: `/app/job-requests/:id`.
- API contracts changed: no.
- Schema changed: no.
- Tests/builds run: `npm run build` passed with the existing `candidate-page.component.ts` style budget warning; browser smoke confirmed `.fulfillment-panel` uses a `linear-gradient` background on the job request detail route.
- Known risks: no additional risk identified.
- AI assistance: Codex implemented and reviewed the change.

## 2026-06-06 - Branch: mudasar-ahmad

- Commit summary: pending job request detail header cleanup.
- Purpose: remove the crowded header action buttons from the job request detail page so the header focuses on request identity instead of duplicate navigation.
- Files touched: `src/app/features/internal/job-request-detail.component.ts`, contributor log.
- Screens/routes changed: `/app/job-requests/:id`.
- API contracts changed: no.
- Schema changed: no.
- Tests/builds run: `npm run build` passed with the existing `candidate-page.component.ts` style budget warning; targeted `npm test -- --include src/app/features/internal/job-request-detail.component.spec.ts --watch=false` was not applicable because no matching spec file exists; browser smoke confirmed the header no longer contains Back, Recruiter Sourcing, or PMO Queue actions.
- Known risks: direct back navigation is still available through browser history and app navigation; the PMO Review action remains in the Fulfillment panel for PMO users.
- AI assistance: Codex implemented and reviewed the change.

## 2026-06-06 - Branch: mudasar-ahmad

- Commit summary: pending job request client context field.
- Purpose: add an optional Client context field to job requests with an info tooltip explaining how industry, product, domain, location, and similar-project context helps AI drafting, bench matching, rediscovery, and evidence selection.
- Files touched: `src/app/core/models.ts`, `src/app/features/internal/create-job-request.component.ts`, `src/app/features/internal/create-job-request.component.spec.ts`, `src/app/features/internal/job-request-detail.component.ts`, `src/app/features/internal/pmo-review.component.ts`, `src/styles.scss`, API/schema docs, contributor log.
- Screens/routes changed: `/app/job-requests/new`, job request detail views, and `/app/pmo/review/:jobRequestId`.
- API contracts changed: sends and consumes optional `clientContext` on job request create/list/detail payloads and draft job description input.
- Schema changed: no frontend schema changes; documents backend `JobRequests.ClientContext`.
- Tests/builds run: `npm test -- --include src/app/features/internal/create-job-request.component.spec.ts --watch=false` passed with 5 tests; `npm run build` passed with the existing `candidate-page.component.ts` style budget warning; browser smoke verified the field and tooltip fit on a 758px viewport.
- Known risks: Client context is tenant-provided context; live web research remains governed by backend live/recent-context triggers.
- AI assistance: Codex implemented and reviewed the change.

## 2026-06-04 - Branch: mudasar-ahmad

- Commit summary: pending AI interview question panel.
- Purpose: show persisted AI question recommendations on the Interview Feedback task page with a compact card, modal detail view, DOCX download, explicit generate/regenerate actions, structured expected signals, follow-ups, rubric, coverage metadata, and no feedback auto-fill.
- Files touched: `src/app/core/models.ts`, `src/app/core/talent-pilot-store.service.ts`, `src/app/features/internal/interview-feedback.component.ts`, interview feedback spec, API/schema docs, contributor log.
- Screens/routes changed: `/app/interview-feedback`.
- API contracts changed: consumes `GET /api/talent-pilot/interviews/{interviewId}/question-recommendations`, `POST /api/talent-pilot/interviews/{interviewId}/question-recommendations/generate`, and `GET /api/talent-pilot/interviews/{interviewId}/question-recommendations/download`.
- Schema changed: no frontend schema changes; documents backend persisted recommendation sets.
- Tests/builds run: `npm run build` passed with style budget warnings; focused `npm test -- --include src/app/features/internal/interview-feedback.component.spec.ts` passed with 4 tests.
- Known risks: `interview-feedback.component.ts` now exceeds the Angular component style budget by 3.45 kB; build still succeeds.
- AI assistance: Codex implemented and reviewed the changes.

## 2026-06-03 - Branch: mudasar-ahmad

- Commit summary: pending remove misleading calendar connector email.
- Purpose: stop showing stale Talent Pilot connector email values such as `admin@tkxel.com` as if they identify the Google Calendar account; show `Google account: Not captured` until backend OAuth identity capture exists.
- Files touched: `src/app/features/admin/admin-page.component.html`, contributor log.
- Screens/routes changed: `/admin-center/integrations`.
- API contracts changed: no.
- Schema changed: no.
- Tests/builds run: `npm run build` passed with existing style budget warnings; browser smoke confirmed the Google Calendar card no longer contains `admin@tkxel.com`, shows `Google account: Not captured`, and has no Vite error overlay.
- Known risks: actual Google account identity still requires a backend OAuth/userinfo change.
- AI assistance: Codex implemented and reviewed the change.

## 2026-06-03 - Branch: mudasar-ahmad

- Commit summary: pending Google Calendar identity wording.
- Purpose: clarify that the calendar integration email shown today is the Talent Pilot user who connected calendar access, not a verified Google account identity, because the current OAuth scope does not capture Google account email.
- Files touched: `src/app/features/admin/admin-page.component.html`, `src/styles.scss`, contributor log.
- Screens/routes changed: `/admin-center/integrations`.
- API contracts changed: no.
- Schema changed: no.
- Tests/builds run: `npm run build` passed with existing style budget warnings; browser smoke confirmed the Google Calendar card shows `Connected by`, the limitation note, and no Vite error overlay.
- Known risks: backend still stores the initiating Talent Pilot user email in `OrganizerEmail`; capturing the actual Google account email requires an OAuth scope/backend change and reconnecting the calendar.
- AI assistance: Codex implemented and reviewed the change.

## 2026-06-03 - Branch: mudasar-ahmad

- Commit summary: pending applicant ranking score bars.
- Purpose: add visual percentage bars and explanatory tooltips for each applicant-ranking score so recruiters can understand skill coverage, vector similarity, fit, history, evidence completeness, and recency at a glance.
- Files touched: `src/app/features/internal/recruiter-sourcing.component.ts`, `src/app/features/internal/recruiter-sourcing.component.spec.ts`, `src/styles.scss`, contributor log.
- Screens/routes changed: `/app/recruitment/sourcing/:jobRequestId?tab=applications`.
- API contracts changed: no.
- Schema changed: no.
- Tests/builds run: `npm test -- --include src/app/features/internal/recruiter-sourcing.component.spec.ts` passed with 32 tests; `npm run build` passed with existing style budget warnings; browser smoke confirmed six score bars with percentage labels and tooltip/ARIA descriptions in Amara Haq's expanded applicant rationale.
- Known risks: score bars depend on the backend explanation including score phrases such as `skill coverage score of 0%`; missing phrases are omitted rather than guessed.
- AI assistance: Codex implemented and reviewed the change.

## 2026-06-03 - Branch: mudasar-ahmad

- Commit summary: pending integrations card styling repair.
- Purpose: restore the Integrations page layout with styled configurable cards, header status chips, aligned provider controls, and compact meta tiles for email sender and Google Calendar configuration.
- Files touched: `src/app/features/admin/admin-page.component.scss`, `src/app/features/internal/recruiter-sourcing.component.ts`, contributor log.
- Screens/routes changed: `/admin-center/integrations`.
- API contracts changed: no.
- Schema changed: no.
- Tests/builds run: `npm run build` passed with existing style budget warnings for candidate and recruiter sourcing components; browser smoke confirmed two styled integration cards, grid/card backgrounds, 8px radii, and three-column meta blocks with no Vite error overlay.
- Known risks: no additional risk identified.
- AI assistance: Codex implemented and reviewed the change.

## 2026-06-03 - Branch: mudasar-ahmad

- Commit summary: pending unscheduled interview timeline indicators.
- Purpose: show configured interview rounds that do not yet have interview records in the recruiter Applications timeline, so recruiters can see which round remains unscheduled.
- Files touched: `src/app/features/internal/recruiter-sourcing.component.ts`, `src/app/features/internal/recruiter-sourcing.component.spec.ts`, `src/styles.scss`, contributor log.
- Screens/routes changed: `/app/recruitment/sourcing/:jobRequestId` Applications tab.
- API contracts changed: no.
- Schema changed: no.
- Tests/builds run: `npm test -- --include src/app/features/internal/recruiter-sourcing.component.spec.ts` passed with 31 tests; `npm run build` passed with existing style budget warnings; browser smoke confirmed Amara shows `2 rounds, 1 not scheduled` plus a dashed `Department Head Interview` row marked `Not scheduled`.
- Known risks: timeline assumes configured active interview rounds are the source of truth when present.
- AI assistance: Codex implemented and reviewed the change.

## 2026-06-03 - Branch: mudasar-ahmad

- Commit summary: pending interview feedback card polish.
- Purpose: make interview task meeting links safer for new-tab navigation, display location/notes as a neutral read-only note field, and keep long candidate emails inside their meta tiles.
- Files touched: `src/app/features/internal/interview-feedback.component.ts`, contributor log.
- Screens/routes changed: `/app/interview-feedback`.
- API contracts changed: no.
- Schema changed: no.
- Tests/builds run: `npm test -- --include src/app/features/internal/interview-feedback.component.spec.ts` passed with 3 tests; `npm run build` passed with existing style budget warnings; browser smoke confirmed `target="_blank"`, `rel="noopener noreferrer"`, a `notes` icon, textbox-like note styling, and wrapped candidate email values without container overflow.
- Known risks: no additional risk identified.
- AI assistance: Codex implemented and reviewed the change.

## 2026-06-03 - Branch: mudasar-ahmad

- Commit summary: pending strict sequential interview scheduling UI.
- Purpose: prevent recruiters from opening the schedule modal for later rounds while a prior active round is still pending, default the modal to the next eligible round, and explain blocked schedule actions directly in the Applications action menu.
- Files touched: `src/app/features/internal/recruiter-sourcing.component.ts`, `src/app/features/internal/recruiter-sourcing.component.spec.ts`, `src/styles.scss`, contributor log.
- Screens/routes changed: `/app/recruitment/sourcing/:jobRequestId` Applications tab.
- API contracts changed: consumes clearer backend scheduling validation failures; no request/response shape change.
- Schema changed: no.
- Tests/builds run: `npm test -- --include src/app/features/internal/recruiter-sourcing.component.spec.ts` passed with 28 tests; `npm run build` passed with existing style budget warnings; browser smoke confirmed blocked `Complete Technical Interview first`, enabled `Schedule HR Screening`, and a modal locked to `1. HR Screening` with no round selector.
- Known risks: no admin override for early scheduling; strict sequence treats any non-completed/non-skipped prior round as blocking.
- AI assistance: Codex implemented and reviewed the change.

## 2026-06-03 - Branch: mudasar-ahmad

- Commit summary: pending applicant AI rationale fallbacks.
- Purpose: keep the applicant-ranking rationale panel complete when saved AI payloads do not include populated strengths, gaps, document evidence, or interview evidence arrays by falling back to current application and interview data.
- Files touched: `src/app/features/internal/recruiter-sourcing.component.ts`, `src/styles.scss`, contributor log.
- Screens/routes changed: `/app/recruitment/sourcing/:jobRequestId` Applications tab.
- API contracts changed: no.
- Schema changed: no.
- Tests/builds run: `npm run build` passed with existing style budget warnings for recruiter sourcing and candidate rediscovery; browser smoke confirmed the expanded Amara rationale now includes strengths, skills/gaps, application evidence, and interview/history signal.
- Known risks: older sparse AI ranking rows still rely on frontend fallbacks until those rankings are regenerated with the newer backend payload fields.
- AI assistance: Codex implemented and reviewed the change.

## 2026-06-03 - Branch: mudasar-ahmad

- Commit summary: pending applicant AI match wording.
- Purpose: replace the cryptic `AI #1 - 89%` applicant ranking text with a labeled AI match card that separates match score, fit bucket, rank, and AI confidence.
- Files touched: `src/app/features/internal/recruiter-sourcing.component.ts`, `src/styles.scss`, contributor log.
- Screens/routes changed: `/app/recruitment/sourcing/:jobRequestId` Applications tab.
- API contracts changed: no.
- Schema changed: no.
- Tests/builds run: `npm run build` passed with existing style budget warnings for recruiter sourcing and candidate rediscovery; browser smoke confirmed the first applicant shows `AI match 89%`, `Good fit`, `Ranked #1 of 2`, and `AI confidence Low`.
- Known risks: no additional risk identified.
- AI assistance: Codex implemented and reviewed the change.

## 2026-06-03 - Branch: mudasar-ahmad

- Commit summary: pending rediscovery score meter tones.
- Purpose: color Talent Rediscovery score meters by score bucket so strong-fit candidates use a green bar, good-fit candidates stay blue, warm leads use amber, and review candidates use neutral gray.
- Files touched: `src/app/features/internal/recruiter-sourcing.component.ts`, `src/styles.scss`, contributor log.
- Screens/routes changed: `/app/recruitment/sourcing/:jobRequestId` Talent Rediscovery tab.
- API contracts changed: no.
- Schema changed: no.
- Tests/builds run: `npm run build` passed with existing style budget warnings for recruiter sourcing and candidate rediscovery; browser smoke confirmed `93% Strong fit` uses the `strong-fit` class with a green score bar.
- Known risks: no additional risk identified.
- AI assistance: Codex implemented and reviewed the change.

## 2026-06-03 - Branch: mudasar-ahmad

- Commit summary: pending rediscovery score label clarity.
- Purpose: make Talent Rediscovery AI match labels derive from the visible score so high-scoring candidates do not show contradictory text such as `93% Low fit`.
- Files touched: `src/app/features/internal/recruiter-sourcing.component.ts`, contributor log.
- Screens/routes changed: `/app/recruitment/sourcing/:jobRequestId` Talent Rediscovery tab.
- API contracts changed: no.
- Schema changed: no.
- Tests/builds run: `npm run build` passed with existing style budget warnings for recruiter sourcing and candidate rediscovery; browser smoke confirmed `93% Strong fit`, `82% Good fit`, and `73% Warm lead` on the Talent Rediscovery tab.
- Known risks: no additional risk identified.
- AI assistance: Codex implemented and reviewed the change.

## 2026-06-03 - Branch: mudasar-ahmad

- Commit summary: pending recruiter application interview timeline polish.
- Purpose: make the recruiter sourcing Applications interview column presentable with a compact timeline, status chips, readable schedule metadata, and better table column width allocation.
- Files touched: `src/app/features/internal/recruiter-sourcing.component.ts`, `src/styles.scss`, contributor log.
- Screens/routes changed: `/app/recruitment/sourcing/:jobRequestId?tab=applications`.
- API contracts changed: no.
- Schema changed: no.
- Tests/builds run: `npm run build` passed with existing style budget warnings for recruiter sourcing and candidate rediscovery; browser visual smoke at 1186x794 confirmed the timeline layout and wrapped long email text.
- Known risks: no additional risk identified.
- AI assistance: Codex implemented and reviewed the change.

## 2026-06-03 - Branch: mudasar-ahmad

- Commit summary: pending recruiter action menu outside click close.
- Purpose: close recruiter sourcing action dropdowns when the user clicks outside the menu while preserving trigger/menu clicks.
- Files touched: `src/app/features/internal/recruiter-sourcing.component.ts`, contributor log.
- Screens/routes changed: `/app/recruitment/sourcing/:jobRequestId?tab=applications`.
- API contracts changed: no.
- Schema changed: no.
- Tests/builds run: `npm run build` passed with existing style budget warnings for recruiter sourcing and candidate rediscovery; browser smoke confirmed outside click closes the application action dropdown.
- Known risks: no additional risk identified.
- AI assistance: Codex implemented and reviewed the change.

## 2026-06-03 - Branch: mudasar-ahmad

- Commit summary: pending notification open marks read.
- Purpose: make notification drawer Open links mark unread notifications as read before closing/navigating, matching the separate Mark read action.
- Files touched: `src/app/core/components/notification-bell.component.html`, `src/app/core/components/notification-bell.component.ts`, contributor log.
- Screens/routes changed: notification bell in internal app shell.
- API contracts changed: no.
- Schema changed: no.
- Tests/builds run: `npm run build` passed with existing style budget warnings for recruiter sourcing and candidate rediscovery.
- Known risks: no browser click smoke was run before build.
- AI assistance: Codex implemented and reviewed the change.

## 2026-06-03 - Branch: mudasar-ahmad

- Commit summary: pending schedule modal action spacing fix.
- Purpose: fix the Schedule Interview modal action row so Cancel and Schedule Interview have consistent gap, wrapping, and top padding without increasing the recruiter sourcing component style budget.
- Files touched: `src/styles.scss`, contributor log.
- Screens/routes changed: `/app/recruitment/sourcing/:jobRequestId?tab=applications`.
- API contracts changed: no.
- Schema changed: no.
- Tests/builds run: `npm run build` passed with existing style budget warnings for recruiter sourcing and candidate rediscovery.
- Known risks: browser visual verification should confirm the action row after HMR refresh.
- AI assistance: Codex implemented and reviewed the change.

## 2026-06-03 - Branch: mudasar-ahmad

- Commit summary: pending interview feedback modal close fix.
- Purpose: close the feedback modal after a successful submit by clearing modal state directly instead of calling the guarded manual-close path while `saving` is still true.
- Files touched: `src/app/features/internal/interview-feedback.component.ts`, contributor log.
- Screens/routes changed: `/app/interview-feedback`.
- API contracts changed: no.
- Schema changed: no.
- Tests/builds run: `npm run build` passed with existing style budget warnings for recruiter sourcing and candidate rediscovery.
- Known risks: no browser submit smoke was run to avoid completing another real demo interview task.
- AI assistance: Codex implemented and reviewed the change.

## 2026-06-03 - Branch: mudasar-ahmad

- Commit summary: pending recruiter feedback realtime notification link.
- Purpose: preserve notification metadata from SignalR/snapshot responses and make the notification bell open metadata routes, so interview feedback notifications can take recruiters directly to the sourcing applications tab.
- Files touched: `src/app/core/components/notification-bell.component.html`, `src/app/core/components/notification-bell.component.ts`, `src/app/core/models.ts`, `src/app/core/talent-pilot-store.service.ts`, contributor log.
- Screens/routes changed: notification bell in internal app shell.
- API contracts changed: consumes optional notification `metadata` returned by backend snapshots and realtime messages.
- Schema changed: no.
- Tests/builds run: `npm run build` passed with existing style budget warnings for recruiter sourcing and candidate rediscovery.
- Known risks: the target sourcing screen accepts the applications tab query today; it does not yet visually focus the specific `applicationId` from notification metadata.
- AI assistance: Codex implemented and reviewed the change.

## 2026-06-03 - Branch: mudasar-ahmad

- Commit summary: pending assigned recruiter interview feedback entry point.
- Purpose: make assigned interview feedback discoverable when a Recruiter such as Sara Malik is the interviewer by showing Interview Feedback in navigation, adding an inline Add feedback link next to scheduled interviews assigned to the current user, and auto-opening the feedback form from `?interviewId=...`.
- Files touched: `src/app/features/shell/app-shell.component.ts`, `src/app/features/internal/recruiter-sourcing.component.ts`, `src/app/features/internal/interview-feedback.component.ts`, `src/app/features/admin/admin-page.component.scss`, `src/styles.scss`, contributor log.
- Screens/routes changed: `/app/recruitment/sourcing/:jobRequestId`, `/app/interview-feedback`.
- API contracts changed: no.
- Schema changed: no.
- Tests/builds run: `npm run build` passed with existing style budget warnings for recruiter sourcing and candidate rediscovery; Playwright smoke verified Sara Malik sees the Interview Feedback nav item, the Amara HR Screening row shows one Add feedback link, and `/app/interview-feedback?interviewId=d303d86a-719d-4f53-98bd-8f66b0f43699` opens the feedback modal without a Vite overlay.
- Known risks: direct feedback links only show for scheduled interviews assigned to the logged-in user; completed interviews remain read-only in the feedback workbench.
- AI assistance: Codex implemented and reviewed the change.

## 2026-06-03 - Branch: mudasar-ahmad

- Commit summary: pending configurable-only Admin Center Integrations UI.
- Purpose: keep the Integrations screen focused on settings admins can actually configure: email sender provider selection and Google Calendar OAuth connection, without a duplicate metric strip; make sender changes enable a dedicated Save Sender action, show the configured sender mailbox, and render provider-specific Graph/Resend marks in selected-provider UI.
- Files touched: `API_CONTRACT.md`, `src/app/core/admin-center-api.service.ts`, `src/app/features/admin/admin-page.component.html`, `src/app/features/admin/admin-page.component.ts`, `src/styles.scss`, contributor log.
- Screens/routes changed: `/admin-center/integrations`.
- API contracts changed: consumes new `GET /api/admin/notifications/email-senders` for non-secret sender metadata.
- Schema changed: no.
- Tests/builds run: `npm run build` passed earlier with existing style budget warnings for recruiter sourcing and candidate rediscovery; after the final label tweak, a later `npm run build` was blocked by unrelated dirty `dashboard.component.ts` template errors for missing recruiter dashboard helpers. Browser smoke was previously attempted through direct Node and the Node REPL, but local process launch was blocked by Windows permissions (`Access is denied` / `spawn EPERM`).
- Known risks: visual verification should be re-run in the browser once local Chromium launch permissions are available.
- AI assistance: Codex implemented and reviewed the change.

## 2026-06-02 - Branch: mudasar-ahmad

- Commit summary: pending functional invite apply CTA for non-candidate users.
- Purpose: make the candidate invite CTA functional when an internal user or guest opens the candidate job detail page by routing them to login with the apply URL preserved instead of letting the candidate guard redirect to the internal dashboard.
- Files touched: `src/app/core/auth.guard.ts`, `src/app/core/candidate.guard.ts`, `src/app/core/auth.service.ts`, `src/app/core/auth.service.spec.ts`, `src/app/features/auth/login.component.ts`, `src/app/features/candidate/candidate-page.component.ts`, `src/app/features/candidate/candidate-page.component.spec.ts`, contributor log.
- Screens/routes changed: `/candidate/jobs/:id?source=invite`, `/candidate/apply/:jobId`, `/auth/login?returnUrl=...`.
- API contracts changed: no.
- Schema changed: no.
- Tests/builds run: `npm test -- --include src/app/features/candidate/candidate-page.component.spec.ts` passed; `npm test -- --include src/app/core/auth.service.spec.ts` passed; `npm test -- --include src/app/features/auth/login.component.spec.ts` passed; `npm run build` passed with existing style budget warnings; Playwright smoke verified recruiter invite CTA routes to login with the apply return URL and Candidate demo login returns to the apply page.
- Known risks: internal users must still switch to a Candidate account before submitting, because the backend apply endpoint remains candidate-authenticated.
- AI assistance: Codex implemented and reviewed the change.

## 2026-06-02 - Branch: mudasar-ahmad

- Commit summary: pending tracked candidate invite UI.
- Purpose: resolve tracked invite links from `inviteId` + `token`, show a short invitation id on the candidate job detail card, preserve invite credentials into the apply route, and submit them with the application payload.
- Files touched: `API_CONTRACT.md`, `src/app/core/models.ts`, `src/app/core/talent-pilot-store.service.ts`, `src/app/core/talent-pilot-store.service.spec.ts`, `src/app/features/candidate/candidate-page.component.ts`, `src/app/features/candidate/candidate-page.component.spec.ts`, `src/styles.scss`, contributor log.
- Screens/routes changed: `/candidate/jobs/:id?source=invite&inviteId=...&token=...`, `/candidate/apply/:jobId`.
- API contracts changed: consumes new `GET talent-pilot/portal/invitations/:candidateInvitationId?token=...`; sends optional `candidateInvitationId` and `invitationToken` on portal application submission.
- Schema changed: no.
- Tests/builds run: `npm run build` passed with existing style budget warnings; `npm test -- --include src/app/features/candidate/candidate-page.component.spec.ts` passed; `npm test -- --include src/app/core/talent-pilot-store.service.spec.ts` passed; Playwright smoke verified the invite card renders `Invitation ID: 55555555` and preserves query params on `Start Application`.
- Known risks: old invite links that only contain `?source=invite` still render legacy invite context but cannot show a tracked invitation id.
- AI assistance: Codex implemented and reviewed the change.

## 2026-06-02 - Branch: mudasar-ahmad

- Commit summary: pending candidate invite application CTA clarity.
- Purpose: clarify candidate invite job-detail copy so the visible action starts or completes an application instead of implying a separate confirmation/redeem step.
- Files touched: `src/app/features/candidate/candidate-page.component.ts`, `src/app/features/candidate/candidate-page.component.spec.ts`, contributor log.
- Screens/routes changed: `/candidate/jobs/:id?source=invite`, `/candidate/applications`.
- API contracts changed: no.
- Schema changed: no.
- Tests/builds run: `npm run build` passed with unrelated existing style budget warnings; Playwright smoke verified the invite card renders `You've been invited to apply` and `Start Application`; targeted `npm test -- --include src/app/features/candidate/candidate-page.component.spec.ts` was blocked by unrelated existing `recruiter-sourcing.component.spec.ts` type errors for `linePath`/`areaPath`.
- Known risks: invite links still use `?source=invite` for context and are not unique token redemption links.
- AI assistance: Codex implemented and reviewed the change.

## 2026-06-02 - Branch: mudasar-ahmad

- Commit summary: pending rediscovery candidate invite portal link text.
- Purpose: ensure Talent Rediscovery candidate invitation emails include the direct candidate portal job URL before optional recruiter notes.
- Files touched: `src/app/features/internal/candidate-rediscovery.component.ts`, contributor log.
- Screens/routes changed: `/app/candidate-rediscovery`.
- API contracts changed: no; continues sending `message` to the existing candidate invitations endpoint.
- Schema changed: no.
- Tests/builds run: `npm run build` passed with unrelated existing style budget warnings.
- Known risks: no dedicated rediscovery component spec exists yet; build validation covered template/type safety.
- AI assistance: Codex implemented and reviewed the change.

## 2026-06-02 - Branch: mudasar-ahmad

- Commit summary: pending recruiter dashboard active job post applicant counts.
- Purpose: make recruiter dashboards show active published job posts with total and active applicant counts per post.
- Files touched: `src/app/features/internal/dashboard.component.ts`, `src/styles.scss`, contributor log.
- Screens/routes changed: `/app/dashboard` for recruiter users.
- API contracts changed: no; derives counts from existing backend job post and application data.
- Schema changed: no.
- Tests/builds run: `npm run build` passed with unrelated existing style budget warnings; Playwright smoke verified the recruiter dashboard renders `Active Job Posts` with applicant counts.
- Known risks: counts depend on the existing candidate operations dataset linking applications to job posts or their job request fallback.
- AI assistance: Codex implemented and reviewed the change.

## 2026-06-02 - Branch: mudasar-ahmad

- Commit summary: pending notification outbox retry timestamp display fix.
- Purpose: show the latest outbox activity timestamp on Email Outbox rows so failed retries update from the backend retry/processing timestamps instead of staying on the original created time.
- Files touched: `src/app/features/admin/admin-page.component.html`, `src/app/features/admin/admin-page.component.ts`, `src/styles.scss`, contributor log.
- Screens/routes changed: `/admin-center/notification-outbox`.
- API contracts changed: no.
- Schema changed: no.
- Tests/builds run: `npm run build` passed with unrelated existing style budget warnings; Playwright smoke verified the first failed outbox row shows `Last retry` and the latest timestamp.
- Known risks: the displayed timestamp still depends on the worker/API returning updated `processedAtUtc` or `updatedAtUtc` for retry processing.
- AI assistance: Codex implemented and reviewed the change.

## 2026-06-02 - Branch: mudasar-ahmad

- Commit summary: pending candidate profile email verification gating.
- Purpose: stop showing `Email verified` unless the profile API returns real verification evidence.
- Files touched: `src/app/core/models.ts`, `src/app/features/candidate/candidate-page.component.ts`, `src/app/features/candidate/candidate-page.component.spec.ts`, contributor log.
- Screens/routes changed: `/candidate/profile`.
- API contracts changed: frontend now treats `emailVerifiedAt`, `emailVerifiedAtUtc`, or `isEmailVerified` on `PortalCandidateProfile` as optional verification evidence.
- Schema changed: no.
- Tests/builds run: `npm test -- --include src/app/features/candidate/candidate-page.component.spec.ts` passed; `npm run build` passed with unrelated existing style budget warnings; Playwright smoke verified `/candidate/profile` hides `Email verified` when no verification evidence is returned.
- Known risks: current backend profile response does not expose verification evidence, so the badge is hidden until the backend supplies it.
- AI assistance: Codex implemented and reviewed the change.

## 2026-06-02 - Branch: mudasar-ahmad

- Commit summary: pending candidate profile account settings removal.
- Purpose: remove the redundant Account Settings panel from the candidate profile screen.
- Files touched: `src/app/features/candidate/candidate-page.component.ts`, `src/app/features/candidate/candidate-page.component.spec.ts`, contributor log.
- Screens/routes changed: `/candidate/profile`.
- API contracts changed: no.
- Schema changed: no.
- Tests/builds run: `npm test -- --include src/app/features/candidate/candidate-page.component.spec.ts` passed; `npm run build` passed with unrelated existing style budget warnings; Playwright smoke verified `/candidate/profile` no longer renders Account Settings.
- Known risks: none identified.
- AI assistance: Codex implemented and reviewed the change.

## 2026-06-02 - Branch: mudasar-ahmad

- Commit summary: pending candidate portal reapply-blocked job card state.
- Purpose: grey out jobs the signed-in candidate already applied to and block direct reapply submissions.
- Files touched: `src/app/features/candidate/candidate-page.component.ts`, `src/app/features/candidate/candidate-page.component.spec.ts`, `src/styles.scss`, contributor log.
- Screens/routes changed: `/candidate/jobs`, `/candidate/apply/:jobId`, `/candidate/jobs/:id`.
- API contracts changed: no; reuses existing `portal/my-applications` and duplicate apply result behavior.
- Schema changed: no.
- Tests/builds run: `npm test -- --include src/app/features/candidate/candidate-page.component.spec.ts` passed; `npm run build` passed with unrelated existing style budget warnings; Playwright smoke verified Amara Haq's applied Java card on `/candidate/jobs`.
- Known risks: screenshot-diff baseline was not updated.
- AI assistance: Codex implemented and reviewed the changes.

## 2026-05-22 - Branch: mudasar-ahmad

- Commit summary: pending frontend audit log Excel export wiring.
- Purpose: connect the Admin Center Audit Logs export action to the backend `.xlsx` export endpoint.
- Files touched: `src/app/core/services/api.service.ts`, `src/app/core/admin-center-api.service.ts`, `src/app/features/admin/admin-page.component.ts`, API docs, contributor log.
- Screens/routes changed: `/admin-center/audit-logs`.
- API contracts changed: consumes `GET /api/admin/audit-logs/export`.
- Schema changed: no.
- Tests/builds run: `npm run build` passed; browser check clicked Export Logs and showed success feedback.
- Known risks: browser download contents were verified through backend API smoke test rather than full browser file inspection.
- AI assistance: Codex implemented and reviewed the changes.

## 2026-05-22 - Branch: mudasar-ahmad

- Commit summary: pending documentation update for frontend engineering instructions.
- Purpose: add pragmatic SOLID, Angular component separation, and service-owned data guidance.
- Files touched: `AGENTS.md`, `CONTRIBUTING.md`, `README.md`, contributor log.
- Screens/routes changed: none.
- API contracts changed: no.
- Schema changed: no.
- Tests/builds run: not run; documentation-only update.
- Known risks: none.
- AI assistance: Codex implemented and reviewed the documentation.

## 2026-05-22 - Branch: contributor-guardrails-docs

- Commit summary: pending commit for Recruitment Queue frontend slice.
- Purpose: replace the recruitment queue placeholder with backend-backed UI and wire PMO handoff into the store.
- Files touched: `src/app/app.routes.ts`, `src/app/core/models.ts`, `src/app/core/talent-pilot-store.service.ts`, `src/app/features/internal/pmo-queue.component.ts`, `src/app/features/internal/recruitment-queue.component.ts`, knowledge-base docs.
- Screens/routes changed: `/app/recruitment/queue`, `/app/pmo/queue`.
- API contracts changed: frontend consumes `GET /api/recruitment/queue` and `POST /api/job-requests/{jobRequestId}/forward-to-recruiter`.
- Schema changed: no frontend schema changes.
- Tests/builds run: `npm run build` passed.
- Known risks: exact automated screenshot diff is still pending, but a browser pass caught and fixed table/right-rail overlap on the recruitment queue.
- AI assistance: Codex implemented and reviewed the changes.

## 2026-05-22 - Branch: contributor-guardrails-docs

- Commit summary: pending commit for frontend guardrails and integration UI wiring.
- Purpose: continue MVP production-readiness work for Talent Pilot frontend.
- Files touched: Admin Center frontend API service, Admin Center page, admin data metadata, global styles, knowledge-base docs.
- Screens/routes changed: Admin Center Integrations, Dashboard, Job Requests, PMO Queue, app shell navigation.
- API contracts changed: frontend now consumes `GET /api/admin/integrations/status`.
- Schema changed: no frontend schema changes.
- Tests/builds run: `npm run build` passed.
- Known risks: no screenshot-diff verification against Stitch PNGs was run in this session.
- AI assistance: Codex implemented and reviewed the changes.
- Guardrail update: added branch/PR policy, contributor logs, and frontend security guidelines.

## 2026-05-22 - Branch: contributor-guardrails-docs

- Commit summary: pending commit for multi-agent repository navigation documentation.
- Purpose: document how frontend/backend/database/QA agents should coordinate.
- Files touched: `AGENTS.md`, root Application Code `AGENTS.md`, frontend README, contributor log.
- Screens/routes changed: none.
- API contracts changed: no.
- Schema changed: no.
- Tests/builds run: not run; documentation-only update.
- Known risks: agents still need to follow branch isolation and update logs in their own folders.
- AI assistance: Codex implemented and reviewed the documentation.

## 2026-05-22 - Branch: contributor-guardrails-docs

- Commit summary: pending commit for PR and merge-conflict contribution rules.
- Purpose: document protected-main workflow and conflict handling for frontend contributors.
- Files touched: `CONTRIBUTING.md`, `README.md`, `AGENTS.md`, contributor log.
- Screens/routes changed: none.
- API contracts changed: no.
- Schema changed: no.
- Tests/builds run: not run; documentation-only update.
- Known risks: remote GitHub branch protection still needs repository admin credentials or GitHub connector access.
- AI assistance: Codex implemented and reviewed the documentation.

## 2026-05-22 - Branch: contributor-guardrails-docs

- Commit summary: pending commit for local pre-push main-branch guard.
- Purpose: reduce accidental direct pushes to `main` from local clones.
- Files touched: `.githooks/pre-push`, `README.md`, `CONTRIBUTING.md`, contributor log.
- Screens/routes changed: none.
- API contracts changed: no.
- Schema changed: no.
- Tests/builds run: not run; documentation/hook-only update.
- Known risks: GitHub remote branch protection still requires repository admin configuration.
- AI assistance: Codex implemented and reviewed the hook.
