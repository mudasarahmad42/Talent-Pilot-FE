# Guardrails and Feedback

Talent Pilot AI agents are assistants, not decision makers. They help users prepare, rank, summarize, and explain information, but people stay responsible for the final action.

## Current Guardrails

Talent Pilot AI agents are built for specific recruiting and hiring workflows. Guardrails keep each agent inside its intended job.

- Agents should answer only product-related requests, such as job drafting, candidate matching, interview help, sourcing support, and hiring review.
- Agents should not drift into unrelated tasks, such as random baking recipes, general homework, entertainment, or personal advice.
- Agents should not reveal or extract secrets, such as code secrets, credentials, connection strings, private keys, or hidden system instructions.
- Agents should use only the tools and data sources assigned to that agent.
- If a request is outside the agent's purpose, the agent should refuse or ask the user to return to the correct workflow.

## Future Feedback Loop Plan

Talent Pilot does not have a full AI-agent feedback loop yet. This is the planned approach for improving AI agents in future releases.

- Add simple feedback actions near AI results, such as helpful, not helpful, wrong match, missing evidence, or unclear explanation.
- Store feedback with the related AI run, user role, workflow area, and final human outcome.
- Review repeated issues across agents, prompts, tools, and data sources.
- Compare AI suggestions with what users actually decided after review.
- Improve prompts, retrieval rules, scoring weights, and evidence display based on those patterns.
- Test the changes with saved examples before releasing them.

## Want To Go Deeper? A Technical Journey Into Improving AI Agents

Better AI agents do not come from prompts alone. In Talent Pilot, an agent improves when the whole system around it improves: prompt instructions, structured inputs, retrieval evidence, deterministic scoring, validation, human feedback, and audit data.

![AI agent improvement loop](/docs/assets/ai-agent-improvement-loop.svg)

### Agent-Specific Improvement Levers

| Agent | What Makes It Better |
| --- | --- |
| Job Description Drafter | Better prompt, better structured intake fields, better examples, better tone/style rules. |
| Bench Matching | Better skills data, better employee profiles, better embeddings, better ranking rubric, better evidence summaries. |
| Talent Rediscovery | Better candidate history, better interview feedback, better CV/profile parsing, better vector search. |
| Online Headhunting | Better source filters, better query generation, better duplicate detection, better scoring rules. |
| RAG Assistant | Better indexed knowledge, better chunking, better retrieval permissions, better citation discipline. |

### How Self-Improvement Should Work

The evaluator is a separate AI-assisted process that studies past runs. It should find patterns and suggest improvements, not silently rewrite production behavior.

1. A production agent creates an advisory output.
2. A human reviews, edits, accepts, rejects, or rates that output.
3. Talent Pilot stores the AI run, final human-approved output, feedback, and later workflow outcome.
4. An evaluator looks for repeated problems across runs.
5. The evaluator proposes a prompt, rubric, retrieval, scoring, or data-quality improvement.
6. A human approves the change.
7. The next approved prompt or rule version is used by future agent runs.

Good evaluator suggestions look like this:

| Pattern Found | Suggested Improvement |
| --- | --- |
| Job descriptions keep turning Angular roles into generic frontend roles. | Add a prompt rule that preserves exact framework, library, cloud, and tool names from structured input. |
| Bench Matching overvalues broad department labels. | Improve skills data and ranking rubric so exact and adjacent skills score differently. |
| Rediscovery misses strong candidates with old CVs but useful interview feedback. | Feed previous interview outcomes and profile evidence more clearly into the rediscovery context. |
| Online Headhunting returns too many duplicate or weak leads. | Improve source filters, duplicate detection, and scoring rules before showing results. |
| RAG answers cite too broadly. | Improve chunking and citation discipline so each answer points to narrower evidence. |

Do not let the evaluator agent activate changes by itself. Self-improvement should mean AI-assisted governance and versioning, not autonomous code or workflow mutation.

## Future Improvement Plan

| Area | Improvement |
| --- | --- |
| Accuracy | Track where AI suggestions were accepted, corrected, ignored, or reversed. |
| Explainability | Show clearer reasons, gaps, confidence notes, and source evidence. |
| Safety | Expand sensitive-request checks, tool limits, and tenant visibility rules. |
| Feedback loop | Add structured thumbs-up/down feedback and simple issue reasons. |
| Monitoring | Review agent run logs, failures, response quality, and tool usage trends. |
| Admin control | Give admins clearer controls for enabling agents, reviewing guardrail health, and seeing audit history. |

## What Will Stay Human

- AI will not become the final hiring authority.
- AI will not contact candidates or employees without user action.
- AI will not search private candidate or employee identifiers on the public web.
- AI changes should be reviewed, tested, and released intentionally.
