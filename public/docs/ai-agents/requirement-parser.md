# Requirement Parser

The Requirement Parser prepares saved Job Requests for later matching. It turns the final requirement text into a searchable profile.

## Where It Is Integrated

It runs in the background when a Job Request is saved.

## How It Helps Users

Users do not see a big AI button for this agent, but it powers later matching features.

Benefits:

- Makes Job Requests searchable by meaning.
- Helps Bench Matching compare requirements with employee profiles.
- Helps Talent Rediscovery compare requirements with candidate history.
- Does not block the user if embedding generation fails.

## Tools It Uses

- Saved Job Request fields.
- Final saved description.
- Ollama embedding model.
- SQL Server `VectorEmbeddings` storage.

It does **not** use web search.

![Vector search flow](/docs/assets/vector-search.png)

## How It Works

1. The user saves the final Job Request.
2. The backend collects the important requirement text: title, skills, experience, location, department, client, and description.
3. The embedding model turns that text into a numeric vector.
4. A vector is a compact "meaning fingerprint" of the requirement.
5. Talent Pilot stores the vector with the Job Request.
6. Later, matching agents compare this vector with employee or candidate vectors.

Simple example:

```text
Job Request: Senior React developer with Azure experience
Vector meaning: frontend, React, cloud, seniority, Azure
Matching can now compare this meaning with people profiles.
```

## Human Review Point

The user reviews the Job Request before saving. The parser only indexes the saved requirement; it does not change the request or move workflow.
