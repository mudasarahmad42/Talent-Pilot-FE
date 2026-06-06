# Candidate Profile Indexing

Candidate Profile Indexing prepares candidate-owned profile data for future matching and rediscovery.

## Where It Is Integrated

It runs in the background when a candidate saves their profile in Candidate Portal.

## How It Helps Users

Recruiters can rediscover warm candidates later without asking candidates to re-enter the same details.

Benefits:

- Makes candidate profiles searchable by meaning.
- Improves Talent Rediscovery ranking.
- Keeps candidate profile saves fast because indexing is best-effort.
- Does not block the candidate if the embedding service is unavailable.

## Tools It Uses

- Candidate profile fields.
- Education and work history.
- Selected skills.
- Ollama embedding model.
- SQL Server `VectorEmbeddings` storage.

It does **not** use web search and does **not** search candidate personal identifiers externally.

## How It Works

1. Candidate updates and saves profile information.
2. Talent Pilot builds a clean profile text summary from saved fields.
3. The embedding model turns that summary into a meaning vector.
4. The vector is stored as candidate profile context.
5. Later, Talent Rediscovery can compare job requirements with this candidate profile vector.

Simple example:

```text
Candidate profile says: React, Node.js, Azure, 5 years
System stores the meaning.
Later, a React + Azure role can find this profile again.
```

## Human Review Point

The candidate owns their profile edits. Recruiters still review candidates before inviting or progressing them.
