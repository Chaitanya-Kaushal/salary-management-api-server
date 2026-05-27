# Salary Management — API Server

Backend for the salary management tool. Express + TypeScript + Prisma + Postgres. Take-home assignment for Incubyte.

## Stack

- Node.js 20 + TypeScript (ESM)
- Express 5
- Prisma + PostgreSQL 16
- Zod for request validation (shape mirrors the frontend `api-contract.ts`)
- bcryptjs + JWT in httpOnly cookie for auth
- Winston-ready logger setup (Winston is a project dependency; current logging uses `console.warn/error` and can be swapped in later)
- Vitest + Supertest for tests (in-memory fakes for repositories)
- Docker Compose for local Postgres

## Endpoints

```
GET    /health
POST   /auth/login            { email, password }                       → 204 + auth cookie
POST   /auth/logout                                                      → 204
GET    /auth/me                                                          → { id, email, name }
GET    /employees?page&pageSize&search&country&jobTitle&department       → paginated list
POST   /employees             EmployeeInput                              → 201 Employee
GET    /employees/:id                                                    → Employee
PUT    /employees/:id         EmployeeInput                              → Employee
DELETE /employees/:id                                                    → 204
GET    /insights/summary
GET    /insights/by-country
GET    /insights/by-job-title?country=XX
GET    /insights/by-department
GET    /insights/by-employment-type
```

All `/employees` and `/insights` routes require the auth cookie. `/auth/login` is rate-limited to 5 attempts per 15 minutes per IP.

## Run locally

```bash
docker compose up -d                # start local Postgres
cp .env.example .env                # adjust DATABASE_URL if needed
npm install
npx prisma migrate dev --name init  # create schema on the database
npm run seed                        # 10K employees + 1 HR user
npm run dev                         # API on http://localhost:4000
```

Or skip Docker and point `DATABASE_URL` at a Neon Postgres URL.

## Seed script

`scripts/seed.ts` reads names from `scripts/first_names.txt` and `scripts/last_names.txt`, generates 10,000 employees with a seeded RNG (deterministic), and bulk-inserts via `pg-copy-streams` (`COPY FROM`). One currency per country (`US→USD`, `IN→INR`, `UK→GBP`, etc.). Wrapped in a transaction with `TRUNCATE … RESTART IDENTITY CASCADE` so re-runs are idempotent. Also upserts the HR user defined by `SEED_HR_*` env vars.

```bash
npm run seed              # default 10,000
SEED_COUNT=1000 npm run seed
```

## Tests

```bash
npm run test:run          # vitest + supertest
npm run lint
npm run format:check
```

Tests use in-memory fake repositories (no DB connection needed). Adding a Testcontainers-based test suite that exercises the real Prisma + Postgres path is a future addition once Docker is available locally.

## Branching

- `main` — release branch (PR-merged from `dev`).
- `dev` — integration branch.
- `feature/<slug>` — one branch per feature, merged into `dev` with `--no-ff`.

## Deployment

Render web service builds from the Dockerfile on push and connects to Neon Postgres via `DATABASE_URL`. Migrations run via `npx prisma migrate deploy` as a Render predeploy step.

Required env vars on Render:

- `DATABASE_URL` — Neon connection string
- `JWT_SECRET` — long random string
- `CORS_ORIGINS` — Amplify URL (comma-separated for multiple)
- `SEED_HR_EMAIL`, `SEED_HR_PASSWORD`, `SEED_HR_NAME` — optional, used only by the seed script
