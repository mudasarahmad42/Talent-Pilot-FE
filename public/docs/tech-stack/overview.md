# Tech Stack

Talent Pilot is built as a web application with a browser frontend, backend API, SQL database, and small background processing layer.

## Application Stack

| Layer | Built With | Purpose |
| --- | --- | --- |
| Frontend | Angular and TypeScript | Runs the Talent Pilot App, Admin Center, Candidate Portal, and documentation UI in the browser. |
| Backend | ASP.NET Core on .NET 8 with C# | Handles authentication, permissions, workflow APIs, AI orchestration, notifications, and realtime updates. |
| Database | SQL Server | Stores tenants, users, jobs, candidates, applications, interviews, audit records, notifications, and AI search data. |
| AI Runtime | Local/Ollama-compatible LLM and embedding runtime | Supports drafting, parsing, ranking, recommendations, summaries, and RAG-style answers. |

## Running Processes

Typical local or demo runtime uses these processes:

| Process | What It Does |
| --- | --- |
| Frontend web server | Serves the Angular browser app. |
| Backend API | Serves the product APIs, authentication, realtime notifications, and AI feature requests. |
| Worker process | Processes queued notification outbox work, such as email delivery and retry handling. |
| SQL Server | Stores application data and queue/outbox records. |
| AI runtime | Runs LLM and embedding calls for Talent Pilot AI features. |

## Queues And Background Work

- Notification work is stored in SQL Server first, then processed by the worker process.
- Online Headhunting uses a lightweight background queue inside the backend API.
- The MVP does not require a separate hosted queue service.
