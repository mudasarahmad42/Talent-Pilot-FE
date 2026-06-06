# Talent Rediscovery

Talent Rediscovery helps recruiters find warm candidates already known to the tenant.

## Where It Is Integrated

It is integrated in **Recruiter Sourcing** after the recruiter claims sourcing work. The recruiter clicks **Rediscover Talent**.

![Recruiter Sourcing Talent Rediscovery page](/docs/assets/recruiter-talent-rediscovery-ai.png)

## How It Helps Users

Recruiters can reuse previous candidate history instead of starting every search from zero.

Benefits:

- Finds candidates who already applied before.
- Uses prior outcomes and interview evidence.
- Highlights matched skills and gaps.
- Keeps recruiter review manual.

## Tools It Uses

- Job Request or draft Job Post requirements.
- Active tenant candidates.
- Candidate skills.
- Historical applications and outcomes.
- Interview feedback evidence.
- Candidate profile and application vectors.
- Ollama LLM for concise ranking rationale.

It does **not** use web search. Candidate names, emails, LinkedIn URLs, and other personal identifiers are not searched externally.

![Document vector decision support](/docs/assets/document-vector-decision-support.png)

## How It Works

1. Recruiter claims sourcing work.
2. Recruiter clicks **Rediscover Talent**.
3. Talent Pilot loads the current role requirements.
4. It loads active tenant candidates with useful previous application history.
5. It reads internal evidence such as skills, past applications, outcomes, interview notes, and profile vectors.
6. It compares candidate meaning with requirement meaning.
7. It ranks warm candidates.
8. It explains why each candidate may fit, including strengths, gaps, and caveats.
9. Recruiter decides who to invite.

Plain English version:

```text
The agent searches Talent Pilot history, not the public internet.
It asks: who have we already seen that looks close to this new role?
Then it shows recruiters a ranked warm-candidate list.
```

## Human Review Point

Recruiter decides whether to select a candidate and send an invitation for a published job post.
