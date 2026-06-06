# Hiring Manager Decision Brief

The Hiring Manager Decision Brief summarizes candidate evidence before final outcome decisions.

## Where It Is Integrated

It is integrated in **Hiring Manager Review**.

![Hiring Manager Review Decision Brief page](/docs/assets/hiring-manager-decision-brief.png)

## How It Helps Users

Hiring managers need a quick view of the candidate, role, interviews, concerns, and offer context.

Benefits:

- Reduces time spent searching across screens.
- Summarizes interview and recruiter evidence.
- Highlights risks and missing information.
- Keeps the final decision with the hiring manager.

## Tools It Uses

- Candidate profile.
- Source and application details.
- Job Request and Job Post summary.
- Recruiter notes.
- Interview statuses, scores, and feedback.
- Skipped-round reasons.
- Ollama LLM for summary and brief generation.

It does **not** use web search.

## How It Works

![Decision support flow](/docs/assets/rag-chat-flow.png)

1. Hiring Manager opens the review page.
2. Talent Pilot loads candidate, job, interview, and application evidence.
3. The agent summarizes the evidence into a brief.
4. The brief explains what looks strong, what may be risky, and what may still need review.
5. Hiring Manager uses the brief as context before recording an outcome.

Plain English version:

```text
The agent reads the internal evidence already collected.
It writes a short briefing note.
The hiring manager still makes the final decision.
```

## Human Review Point

Hiring Manager records the final outcome. The brief cannot hire, reject, or close the request by itself.
