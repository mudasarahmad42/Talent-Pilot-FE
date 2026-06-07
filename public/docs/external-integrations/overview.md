# External Integrations

Talent Pilot connects to a small set of external services so recruiting work can move outside the application when needed. These integrations support communication, live updates, web research, and interview scheduling while keeping tenant workflow decisions inside Talent Pilot.

## Integration Summary

| Integration | What It Enables | Where Users See It |
| --- | --- | --- |
| Email delivery | Candidate invitations, interview updates, public feedback acknowledgements, and operational notifications. | Candidate invites, feedback widget, interview scheduling, Admin Center email outbox. |
| Realtime notifications | Live in-app updates when workflow events, assignments, and important status changes happen. | Top-bar notification bell and role workspaces. |
| Tavily web search | Controlled web research for AI-assisted sourcing and public context discovery. | AI Headhunting and AI Settings runtime status. |
| Google Calendar | Interview meeting creation, optional Google Meet links, attendee invites, and calendar event ownership. | Interview scheduling and Google Calendar integration settings. |
| GitHub public search | Lead discovery from public developer profiles when enabled for Online Headhunting. | Recruiter Sourcing, AI Headhunting tab. |

## Email Delivery

Talent Pilot queues emails through the notification outbox before sending them. This keeps the user workflow responsive and gives admins an audit trail for retries and failures.

Email is used for:

- Candidate invitation emails with tracked candidate portal links.
- Interview schedule messages.
- Public product feedback messages and thank-you responses.
- Admin or workflow notifications where email is configured.

Admins can review delivery behavior in Admin Center, including provider configuration and outbox records.

## Realtime Notifications

Realtime updates keep internal users aware of workflow movement without waiting for manual page refreshes.

Examples include:

- New assigned work.
- Status changes in recruiting and review workflows.
- Notifications created by background workflow actions.

Realtime messages are advisory UI signals. The actual source of truth remains the backend workflow record and audit history.

## Tavily Web Search

Tavily is used by AI-assisted web research features when web search is enabled. It helps agents discover public context, but it does not make workflow decisions.

Talent Pilot uses Tavily for:

- Online Headhunting web search.
- Public sourcing context where configured.
- AI runtime health and integration readiness checks.

If the Tavily API key is missing, Talent Pilot can still run supported non-web sources such as GitHub search, but the web-search portion will show as unavailable.

## Google Calendar And Google Meet

Google Calendar integration supports structured interview scheduling. When enabled and connected, Talent Pilot can create calendar events and optionally add Google Meet links.

Google Calendar is used for:

- Interview meeting events.
- Attendee invites.
- Calendar ownership through the connected Google account.
- Optional Meet link creation when configured.

The application stores protected integration tokens and uses configured tenant/runtime settings to decide whether calendar automation is available.

## Integration Guardrails

External integrations are designed to support the workflow, not replace human ownership.

- Recruiters still decide who to invite.
- Hiring Managers still decide final outcomes.
- AI search results remain lead-only until a recruiter converts them.
- Email and calendar actions are recorded through backend workflows.
- Admin Center remains the configuration surface for integration behavior.

## Demo Checklist

For a demo, show these integration points:

- Send a candidate invitation and confirm the email includes a tracked portal URL.
- Open the notification bell after a workflow event.
- Run AI Headhunting and show Tavily or GitHub source status.
- Schedule an interview and confirm calendar/meeting behavior.
- Review Admin Center settings for AI runtime, email delivery, and integrations.
