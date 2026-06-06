# Online Headhunting

Online Headhunting helps recruiters find lead-only public profiles from approved external sources.

## Where It Is Integrated

It is integrated in **Recruiter Sourcing**, inside the AI Headhunting area. The recruiter selects sources and clicks **Run Agent**.

![Recruiter Sourcing AI Headhunting page](/docs/assets/recruiter-ai-headhunting.png)

## How It Helps Users

Recruiters can discover potential leads without manually building every search query.

Benefits:

- Finds public lead evidence for hard-to-fill roles.
- Keeps results as leads, not candidates.
- Shows duplicate warnings against existing tenant candidates.
- Provides a fit summary, gaps, and an outreach draft.

## Tools It Uses

- Job Request or Job Post role details.
- Required skills, location, and experience.
- Existing candidate duplicate signals.
- Approved web search snippets.
- Tavily public web search.
- Optional GitHub public API/search path.
- Ollama LLM for fit summary and outreach draft.
- SQL Server background run and lead storage.

LinkedIn is source-link or X-Ray only in MVP. Talent Pilot does not scrape LinkedIn pages and does not send LinkedIn messages.

## How It Works

![Online headhunting flow](/docs/assets/online-headhunting-flow.png)

1. Recruiter claims sourcing work.
2. Recruiter chooses source filters such as public web, GitHub, LinkedIn links, or portfolio pages.
3. Recruiter clicks **Run Agent**.
4. Talent Pilot queues a background run.
5. The agent builds safe search queries from role, skills, location, and experience.
6. It searches approved public sources.
7. It collects lead-only evidence such as public URL, snippet, skills, and missing data.
8. It checks whether each lead may already exist in Talent Pilot.
9. It scores the lead and writes a short fit summary.
10. Recruiter receives a notification when results are ready.

Plain English version:

```text
The agent finds possible people on public sources.
It does not add them as candidates.
It gives the recruiter a lead list to review.
Only the recruiter can convert a lead through the normal manual flow.
```

## Human Review Point

Recruiter opens source links, reviews evidence, rejects leads, or manually converts a lead through the published Job Post invite flow.
