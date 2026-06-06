# Job Description Drafter

The Job Description Drafter helps Presales or PMO write a first draft for a job request description.

## Where It Is Integrated

It is integrated in the **Job Request create form** in the Talent Pilot App. The user fills structured fields, then clicks **Draft with AI**.

## How It Helps Users

Users do not need to start from a blank text box. The agent turns role details into a clean draft that can be edited before the request is saved.

Benefits:

- Saves writing time.
- Makes job descriptions more consistent.
- Keeps the description aligned with structured fields such as skills, location, priority, and experience.

## Tools It Uses

- Structured job request fields from the form.
- Configured Ollama LLM model.
- Tenant AI runtime settings.

It does **not** use web search.

## How It Works

1. The user enters fields such as job title, client, department, location, skills, experience range, required positions, priority, and hiring manager.
2. The user clicks **Draft with AI**.
3. The backend sends only those controlled fields to the agent.
4. The agent asks the configured LLM to write a plain job description.
5. The draft comes back to the form.
6. The user edits the text and saves the Job Request.

The agent is like a writing assistant. It does not create the request by itself and it does not approve anything.

## Human Review Point

The creator must review and edit the draft before saving the Job Request.
