# Bench Matching

Bench Matching helps PMO find internal employees who may fit a Job Request before external recruitment starts.

## Where It Is Integrated

It is integrated in **PMO Review** after PMO claims the review assignment. PMO clicks **Rank with AI**.

![PMO Review Bench Matching page](/docs/assets/pmo-review-bench-ai.png)

## How It Helps Users

PMO can review internal bench options faster and with clearer evidence.

Benefits:

- Prioritizes likely internal matches.
- Shows strengths and gaps for each employee.
- Uses internal employee, skill, availability, and project evidence.
- Keeps PMO in control of the final recommendation.

## Tools It Uses

- Job Request requirement profile.
- Internal employee records.
- Employee skills, experience, location, bench status, and project allocation.
- Vector embeddings for semantic similarity.
- Optional Tavily web search for safe public client/project context.
- Ollama LLM for short explanations.
- SQL Server logs and recommendation storage.

It never searches employee names, emails, or private identifiers on the web.

## How It Works

When PMO asks for bench discovery, Talent Pilot follows this process:

![Vector search flow](/docs/assets/vector-search.png)

1. PMO claims the review assignment and clicks **Rank with AI**.
2. The system loads the Job Request and the eligible internal employees.
3. It filters out employees who are not relevant enough for the department or role.
4. It builds or refreshes an employee profile summary from internal data.
5. It creates chunks of useful employee evidence such as skills, project history, location, and availability.
6. It compares the Job Request meaning with employee profile meaning using vectors.
7. It calculates a fit score using a fixed formula:
   - Skill coverage
   - Vector similarity
   - Experience fit
   - Bench readiness
   - Internal project/client relevance
   - Location fit
8. If allowed, it may search safe public client or project context through Tavily.
9. The LLM writes a short explanation from the evidence already collected.
10. The ranked list is saved and shown back to PMO.

Plain English version:

```text
Talent Pilot first checks internal employee facts.
Then it compares those facts with the Job Request.
Then it ranks employees.
Then it explains why each person may or may not fit.
PMO still decides what to do.
```

## Human Review Point

PMO chooses whether to recommend an employee, ignore a suggestion, or continue to recruiter sourcing.
