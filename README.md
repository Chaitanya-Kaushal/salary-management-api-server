# Salary Management — API Server

Backend for the salary management tool. Express + TypeScript + Prisma + Postgres. Take-home assignment for Incubyte.

## Stack

- Node.js 20 + TypeScript (ESM)
- Express 5
- Prisma + PostgreSQL 16
- Zod for request validation (shared shape with the frontend `api-contract.ts`)
- bcryptjs + JWT in httpOnly cookie for auth
- Winston for structured logging
- Vitest + Supertest + Testcontainers for tests
- Docker Compose for local Postgres

## Run locally

```bash
docker compose up -d        # start local Postgres
cp .env.example .env
npm install
npm run dev                  # API on http://localhost:4000
```

## Tests

```bash
npm run test:run             # vitest + supertest + testcontainers
npm run lint
npm run format:check
```

## Branching

- `main` — release branch.
- `dev` — integration branch where features land.
- `feature/<slug>` — one branch per feature, merged into `dev` with `--no-ff`.

## Deployment

Render web service builds from the Dockerfile and connects to Neon Postgres via `DATABASE_URL`.
