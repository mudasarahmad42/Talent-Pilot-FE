# CV Parser

The CV Parser reads a recruiter-uploaded DOCX resume and prefills candidate fields for review.

## Where It Is Integrated

It is integrated in **Recruiter Sourcing**, inside the manual **Add Candidate** flow.

![Document evidence flow](/docs/assets/document-evidence-flow.png)

## How It Helps Users

Recruiters do not need to manually copy every detail from a resume.

Benefits:

- Speeds up manual candidate entry.
- Reduces typing mistakes.
- Extracts profile, education, experience, and skills.
- Keeps the recruiter in control before anything is submitted.

## Tools It Uses

- Uploaded DOCX resume.
- Server-side document text extraction.
- Ollama LLM for structured extraction.
- SQL Server document evidence and agent run logs.
- Vector embedding storage for later matching context.

It does **not** use web search.

## How It Works

1. Recruiter opens a sourcing workspace.
2. Recruiter clicks **Add Candidate**.
3. Recruiter uploads a DOCX resume.
4. The backend extracts text from the document.
5. The CV Parser reads the text and looks for useful fields:
   - Name
   - Email
   - Phone
   - Current designation
   - Company
   - Experience
   - Skills
   - Education
6. Talent Pilot prefills the form.
7. Recruiter reviews and edits the fields.
8. Nothing is created until the recruiter submits.

## Human Review Point

The recruiter must review and submit the candidate manually. The parser cannot create a candidate by itself.
