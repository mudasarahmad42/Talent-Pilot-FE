# Candidate Fit Explanation

Candidate Fit Explanation is the plain-English rationale shown inside ranking results.

## Where It Is Integrated

It appears inside **Bench Matching** and **Talent Rediscovery** result cards or rows.

![Candidate Fit Explanation in application ranking results](/docs/assets/candidate-fit-explanation.png)

## How It Helps Users

Scores alone are not enough. Users need to know why an employee or candidate is ranked high or low.

Benefits:

- Explains strengths.
- Calls out gaps.
- Adds confidence notes.
- Shows caveats so users do not overtrust a score.

## Tools It Uses

- Ranking evidence from Bench Matching or Talent Rediscovery.
- Skills, experience, location, project history, application history, interview evidence, and gaps.
- Ollama LLM for short explanation text.

It does not run a separate web search. It explains evidence already gathered by the ranking flow.

## How It Works

1. A ranking agent produces a score and evidence.
2. Talent Pilot packages the evidence into a small explanation request.
3. The LLM writes simple strengths, gaps, and caveats.
4. The explanation is stored with the recommendation result.
5. The user reads the score and explanation together.

Simple example:

```text
Score says: 82%.
Explanation says: Strong React and Azure match, but limited fintech project evidence.
User decides whether that gap matters.
```

## Human Review Point

PMO, Recruiter, or Hiring Manager reads the explanation and decides the next action.
