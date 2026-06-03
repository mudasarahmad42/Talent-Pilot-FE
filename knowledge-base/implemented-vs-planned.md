# Implemented vs Planned

## Implemented

- Angular app shell with route-level Admin Center, Talent Pilot App, and Candidate Experience boundaries.
- Backend-backed login cards and session persistence.
- Permission constants, permission guard, admin guard, and permission service.
- Admin Center pages consuming backend APIs:
  - tenant profile
  - users
  - roles and permission policy
  - groups
  - workflows
  - notifications
  - AI settings
  - integrations/source tracking view
  - audit logs
- Talent Pilot internal backend-backed screens:
  - dashboard snapshot
  - my work / job request lists from operations snapshot
  - create job request
  - PMO queue claim action
  - job request detail/activity
  - recruiter sourcing queue and sourcing workspace
  - recruiter Talent Rediscovery tab with advisory warm-candidate ranking
  - recruiter Job Post draft/update/publish/close screens
  - recruiter manual candidate add/invite action for published Job Posts
  - public candidate portal published job list/detail
  - candidate-authenticated apply and My Applications/status views
  - notifications read/read-all
- Backend-required empty states for screens whose APIs are not ready.

## Planned Next

- Replace create job request free-text lookup fields with backend lookup APIs.
- Wire user add/edit/deactivate/resend invite actions fully to backend mutations.
- Wire role create/edit/bulk user assignment and permission review flows.
- Add notification template editor backed by backend templates API.
- Add SignalR notification hub client.
- Implement candidate profile editing and interview schedule views.
- Implement recruiter candidate pipeline management screens.
- Implement interview scheduling/feedback and Hiring Manager final review screens.
- Add focused Angular tests around auth, permissions, date formatting, and critical save flows.

## Do Not Add As Active MVP UI

- Finance or budget approvals.
- HOD approval workflows. HOD/department head can appear only as an interviewer user/group.
- Generic workflow designer.
- Formal offer approval/signoff workflow.
- Onboarding, payroll, orientation, or IT equipment tracking.
- Automated external job-board posting/scraping.
- Candidate-visible AI scores.
- Auto-created Google Calendar or Google Meet scheduling in local/demo mode. Interview scheduling may accept an existing meeting link, but real calendar events require backend Google Calendar integration to be enabled.
