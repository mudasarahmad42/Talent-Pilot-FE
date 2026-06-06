# AI Agents Overview

Talent Pilot has **11 implemented AI-assisted agents or workflows** in the MVP. Some are visible buttons, some are chat assistants, and some run quietly in the background to prepare search and ranking data. There are also **3 planned agents** for future versions.

AI helps users draft, parse, rank, summarize, and explain. AI does **not** approve requests, hire candidates, reject candidates, send offers, or move workflow stages by itself.

For guardrails and the improvement plan, see [Guardrails and Feedback](/docs/ai-agents/guardrails-feedback).

![Talent Pilot AI agent flow](/docs/assets/ai-agent-flow.png)

## Implemented Agents

| Agent | Where It Appears | Main Benefit |
| --- | --- | --- |
| RAG Assistant | PMO Review, Recruiter Sourcing, Hiring Manager Review | Answers workflow questions from tenant-visible evidence with citations. |
| Job Description Drafter | Job Request create form | Drafts a clean job description from structured intake fields. |
| Requirement Parser | Job Request save flow | Turns saved requirements into searchable matching context. |
| Bench Matching | PMO Review | Ranks internal bench employees for PMO review. |
| CV Parser | Recruiter Sourcing, Add Candidate | Reads a DOCX resume and prefills candidate fields. |
| Candidate Profile Indexing | Candidate Portal profile save | Makes candidate profiles easier to rediscover later. |
| Talent Rediscovery | Recruiter Sourcing | Finds warm candidates from existing tenant history. |
| Online Headhunting | Recruiter Sourcing | Finds lead-only public profiles from approved online sources. |
| Candidate Fit Explanation | Bench Matching and Talent Rediscovery results | Explains strengths, gaps, and confidence in plain language. |
| Interview Question Recommender | Interview Feedback | Generates structured interviewer question sets from job, candidate, round, and question-bank evidence. |
| Hiring Manager Decision Brief | Hiring Manager Review | Summarizes final candidate evidence for decision review. |

## Planned Agents

| Planned Agent | Future Purpose |
| --- | --- |
| Job Post Generator | Draft job post text from an approved Job Request. |
| Feedback Summary | Summarize interviewer feedback across rounds. |
| Pipeline Next-Step Agent | Suggest next actions and blockers for applications. |

## Tools Used

Talent Pilot agents use only controlled tools:

- **SQL Server tenant data** for jobs, employees, candidates, skills, interviews, and logs.
- **Knowledge chunks and citations** for RAG assistant evidence-backed answers.
- **Vector embeddings** to compare meaning, not just exact words.
- **Ollama LLM runtime** to draft or explain text where configured.
- **Tavily web search** only for safe public client/project context or approved public sourcing.
- **GitHub public data** only for Online Headhunting when source filters allow it.

Admins review AI runtime and feature settings in Admin Center.

![Admin AI settings screenshot](/docs/assets/admin-ai-settings.png)

## Safety Rule

Every AI result is advisory. A human user reviews the result and decides what to do next.

AI can say:

- "This employee looks like a strong fit."
- "This candidate has matching React and Azure experience."
- "This resume suggests 5 years of backend work."

AI cannot:

- Recommend an employee to Presales by itself.
- Create a candidate without recruiter review.
- Send a candidate invitation without recruiter action.
- Reject or hire a candidate.
- Search private employee or candidate identifiers on the public web.
