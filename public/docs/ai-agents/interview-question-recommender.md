# Interview Question Recommender

Interview Question Recommender creates interviewer-facing questions for a scheduled interview.

## Where It Is Integrated

It is integrated in **Interview Feedback**. The assigned interviewer or Tenant Admin opens an interview task and clicks **Generate** in the **AI interview questions** panel.

## How It Helps Users

Interviewers can prepare faster and ask questions that match the job, candidate, and interview round.

Benefits:

- Suggests at least 10 structured questions.
- Tailors questions to the round, such as HR, screening, technical, HOD, or behavioral.
- Adds expected signal, rationale, follow-ups, and rubric hints.
- Lets the interviewer open, regenerate, or download the question set as DOCX.
- Keeps the interviewer responsible for the final assessment.

## Tools It Uses

- Assigned interview task.
- Job Request and Job Post details.
- Required skills and round type.
- Candidate profile, cover letter, and available document excerpts.
- Prior interview evidence when available.
- Seeded interview question bank.
- Vector embeddings to rank the most relevant question-bank items.
- Ollama LLM for structured question generation.
- DOCX export for the latest saved question set.

It does **not** use web search.

## How It Works

1. Interviewer opens an assigned interview task.
2. Talent Pilot loads the interview context: role, skills, candidate evidence, round, duration, and prior notes.
3. The agent looks at the seeded question bank and creates embeddings for bank items when needed.
4. It creates an embedding for the current interview context.
5. Vector search ranks the question-bank items that are closest to this interview.
6. The top items and interview evidence are sent to the LLM with a strict JSON format.
7. The LLM returns a summary, coverage details, and structured questions.
8. Talent Pilot validates the output, saves the versioned question set, and shows it in the Interview Feedback page.

Plain English version:

```text
The agent reads the interview assignment and candidate context.
It finds similar questions from the internal question bank.
It asks the LLM to rewrite those ideas for this specific interview.
The interviewer reviews, edits their approach, and still owns the feedback.
```

## Human Review Point

The interviewer decides which questions to ask and what feedback to submit. The agent cannot submit feedback, hire, reject, schedule, contact candidates, or move workflow stages.
