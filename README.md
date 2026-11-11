# StudyBuddy

StudyBuddy is a small monorepo for learning how a Django REST API and a Next.js application work together.

## Stack

- Django + Django REST Framework
- JWT authentication with SimpleJWT
- Next.js App Router + TypeScript
- PostgreSQL
- Docker Compose

## Run locally

Copy the example environment files:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
docker compose up --build
```

Set `GEMINI_API_KEY` in `backend/.env` before creating AI study activities. `GEMINI_MODEL` defaults to `gemini-3.5-flash-lite`. Keep the key on the backend only. Check your project's tier and limits in Google AI Studio; the model has free-tier input and output within those limits. Google's free-tier terms allow submitted content to be used to improve its products, so review that before uploading private notes.

In another terminal, run the first migration and create an admin user:

```bash
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
```

Open:

- Frontend: http://localhost:3000
- API: http://localhost:8000/api/health/
- Django admin: http://localhost:8000/admin/

## API flow

1. Register at `POST /api/users/register/`.
2. Sign in at `POST /api/auth/token/` to receive access and refresh tokens.
3. Send the access token as `Authorization: Bearer <token>`.
4. Use `/api/subjects/` for user-owned subjects. Create a study set with multipart `POST /api/study-sets/`, then call `POST /api/study-sets/{id}/generate/`. The API also supports list, detail, update, and owner-only source-file downloads.

Practice quizzes use `POST /api/study-sets/{id}/quiz-attempts/` with `{"format":"mixed","count":10,"difficulty":2}`. `GET` on that URL returns the latest attempt. `GET /api/study-sets/{id}/quiz-attempts/{attempt_id}/` resumes a specific attempt. Save each answer with `POST .../{attempt_id}/answer/` using `question_id`, `selected_index`, and optional `seconds_spent`, then `POST .../{attempt_id}/finish/`. Correct answers, explanations, and scores appear after completion. All routes require authentication and are scoped to the participant taking the quiz.

Owners can create a sharing code on a study set page. A signed-in friend enters the code at `/join` to add the set to their collection. Friends can read and practice the set, but cannot edit, delete, regenerate, or download its source file. Quiz attempts and flashcard progress are private to each participant. Owners can disable a code to stop new joins; existing participants keep access. Only API-backed sets can be shared.

## Classroom UI

The frontend opens at `/login`. After signing in, `/dashboard` links to the study set binder and the create, edit, flashcard, quiz, and results screens. The classroom design follows the supplied Stitch screenshots.

New study sets are saved to the API and can combine pasted notes with one `.txt`, `.md`, `.pdf`, or `.pptx` file. Gemini generates flashcards and quiz questions after the set is saved; a failed generation can be retried from the set page. Existing browser-saved sets and local quiz results remain available without migration. Text extraction does not support scanned PDFs or OCR. The existing username/password sign-in uses the Django API.

## Project structure

`backend/apps/` contains feature-owned Django apps. `backend/common/` contains only shared backend helpers. `frontend/src/app/` contains route groups, while `frontend/src/lib/api/` is the single place for frontend-to-Django requests.
