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
4. Use `/api/subjects/` and `/api/study-sessions/` for user-owned study data.

## Project structure

`backend/apps/` contains feature-owned Django apps. `backend/common/` contains only shared backend helpers. `frontend/src/app/` contains route groups, while `frontend/src/lib/api/` is the single place for frontend-to-Django requests.
