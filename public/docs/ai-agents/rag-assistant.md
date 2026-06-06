# RAG Assistant

The RAG Assistant is the chat-style AI assistant inside Talent Pilot. RAG means **retrieve first, then generate**. In simple terms, the assistant first finds relevant Talent Pilot evidence, then writes an answer from that evidence.

## Where It Is Integrated

The assistant appears in internal review screens where users need quick answers from existing workflow evidence.

| Screen | Assistant Name | What It Can Help With |
| --- | --- | --- |
| PMO Review | Request Copilot | Request status, bench fit, missing skills, referrals, and Presales handoff evidence. |
| Recruiter Sourcing | Applications Copilot | Candidate fit, application status, ranking reasons, skill gaps, CV evidence, and interview evidence. |
| Hiring Manager Review | Decision Assistant | Candidate comparison, interview feedback, decision risks, strengths, and final review evidence. |

![Request Copilot in PMO Review](/docs/assets/pmo-review-bench-ai.png)

## How It Helps Users

The assistant helps users ask plain-English questions instead of manually scanning every panel, table, note, and ranking result.

Benefits:

- Speeds up review work.
- Explains evidence in simple language.
- Shows citations so users can see where the answer came from.
- Keeps answers inside the current workflow context.
- Helps users spot missing skills, weak evidence, or next-step blockers.

## Tools It Uses

| Tool | Purpose |
| --- | --- |
| SQL Server tenant data | Reads visible job, candidate, employee, interview, workflow, and AI log evidence. |
| Knowledge chunks | Breaks workflow evidence into small searchable pieces. |
| Vector embeddings | Converts the user's question and evidence chunks into meaning-based vectors. |
| SQL Server vector search | Retrieves the most relevant tenant-visible evidence chunks. |
| Local AI runtime | Writes the final answer from retrieved evidence. |
| Citations | Links answer claims back to the evidence used. |
| Feedback buttons | Saves helpful/not helpful feedback on assistant answers. |

The RAG Assistant does **not** use Web Search. It answers from tenant-visible Talent Pilot evidence.

## How It Works

![Conversational RAG chat flow](/docs/assets/rag-chat-flow.png)

When a user asks a question:

1. Talent Pilot checks that the user is allowed to use the assistant for that screen.
2. The system gathers the current workflow evidence, such as the request, candidates, bench matches, interviews, rankings, and notes.
3. That evidence is saved as small knowledge chunks.
4. The user's question is converted into a vector so the system can compare meaning, not just exact words.
5. Talent Pilot retrieves the most relevant chunks for that question.
6. The prompt tells the AI to answer only from those chunks and cite the evidence.
7. The answer, citations, model details, and run log are saved.
8. The user can open citation evidence and give helpful/not helpful feedback.

If no useful evidence is found, the assistant says it does not have enough evidence. If the AI runtime is unavailable, it returns a runtime-unavailable message instead of inventing an answer.

## Guardrails

The assistant is limited to Talent Pilot hiring and workflow evidence.

- It redirects unrelated questions, such as recipes or general personal advice.
- It refuses requests to reveal secrets, credentials, API keys, passwords, private keys, tokens, or connection strings.
- It does not approve, reject, hire, allocate, schedule, send offers, or contact people.
- It uses recent conversation only as chat context, not as evidence.
- If previous chat text conflicts with retrieved evidence, the retrieved evidence wins.

## Feedback Status

The assistant can currently save helpful/not helpful feedback on answers. A broader loop that analyzes feedback trends and improves agents over time is a future plan, described in [Guardrails and Feedback](/docs/ai-agents/guardrails-feedback).
