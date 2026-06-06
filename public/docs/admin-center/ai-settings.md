# AI Settings

AI settings control how Talent Pilot uses parsing, matching, ranking, evidence, and assistant features. These settings should be transparent because AI output is advisory, not an automatic hiring decision.

## AI Runtime

Tenant Admins should be able to review the active AI runtime configuration.

Important fields:

- Model provider
- Model name
- Embedding model
- Prompt version
- Feature toggles
- Last health check
- Latest successful agent run

## AI Agents

Talent Pilot uses AI assistance in several places:

- CV parsing
- Job requirement extraction
- Bench matching
- Talent rediscovery
- Candidate ranking
- Interview question drafting
- Decision brief evidence
- RAG assistant answers

Each agent should show what it does, where its evidence comes from, and what user action confirms or rejects the result.

## Embeddings

Embeddings support search and ranking across job requests, candidates, CV text, and historical application evidence.

Operational expectations:

- Embeddings are tenant-scoped.
- Candidate personal identifiers should not be searched externally.
- Stale embeddings should be refreshed before ranking when required.
- Missing embeddings should degrade gracefully.

## Guardrails

AI features must remain advisory.

Required guardrails:

- Users make the final hiring and routing decisions.
- AI results should include evidence or rationale.
- Sensitive candidate data should stay inside tenant boundaries.
- External web search should not be used for candidate personal identifiers.
- Prompt and model changes should be auditable.

## Troubleshooting

When an AI feature does not respond as expected:

1. Check AI health status in the app topbar.
2. Confirm model and embedding settings are configured.
3. Review the latest agent run time.
4. Check whether source data exists for the candidate, request, or job post.
5. Review logs before changing prompts or model settings.
