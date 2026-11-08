# Repository Guidelines

## Project Structure

StudyBuddy is a Dockerized monorepo:

- `backend/` contains the Django REST API. Feature code lives in `backend/apps/` (`users`, `subjects`, and `study_sessions`); shared helpers belong in `backend/common/`.
- `frontend/` contains the Next.js App Router client. Routes are under `frontend/src/app/`, reusable components under `frontend/src/components/`, and Django API integrations under `frontend/src/lib/api/`.
- `docker-compose.yml` runs the backend, frontend, and PostgreSQL services.
- Environment templates are `backend/.env.example` and `frontend/.env.example`. Never commit real secrets.

## Development Commands

Start the full development stack:

```bash
docker compose up --build
```

Initialize Django after the containers start:

```bash
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
```

Useful URLs are `http://localhost:3000` for the frontend, `http://localhost:8000/api/health/` for the API health check, and `http://localhost:8000/admin/` for Django admin.

For frontend checks, run `docker compose exec frontend npm run build` or `docker compose exec frontend npm run lint`.

## Coding Style & Naming

Use 4 spaces for Python and 2 spaces for TypeScript/TSX. Follow Django conventions: `snake_case` modules and functions, `PascalCase` models, serializers, views, and React components. Use `camelCase` for frontend variables and functions. Keep API calls inside `frontend/src/lib/api/`; do not scatter raw `fetch` calls across pages.

## Testing Guidelines

This small one-month project currently has no formal unit-test suite or coverage requirement. Before opening a PR, manually verify registration, login, authenticated API requests, subject creation, and the main dashboard flow. Run the Docker Compose stack and confirm the health endpoint responds successfully.

## Commits & Pull Requests

No Git history is currently available, so use short imperative commit messages, preferably with a scope, such as `feat(subjects): add subject creation` or `fix(auth): handle expired token`.

Pull requests should explain the user-visible change, list verification steps, identify environment or migration changes, and include screenshots for meaningful frontend changes. Keep unrelated refactors out of feature PRs.

## Configuration & Security

Use local `.env` files copied from the provided examples. Do not commit passwords, tokens, or production keys. Keep user-owned querysets filtered by the authenticated user when adding new API endpoints.
