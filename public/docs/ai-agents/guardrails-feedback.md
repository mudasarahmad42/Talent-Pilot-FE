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
