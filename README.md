# Helixed

Helixed is a student-development ecosystem. This repository currently contains the foundational modular-monolith architecture defined by the [master specification](docs/HELIXED_MASTER_SPEC.md); product modules are intentionally not implemented yet.

## Prerequisites

- Node.js 20.19 or newer
- npm 10 or newer
- PostgreSQL

## Setup

1. Install dependencies with `npm install`.
2. Copy `backend/.env.example` to `backend/.env` and set local secrets.
3. Copy `frontend/.env.example` to `frontend/.env` if the default API URL is unsuitable.
4. Generate the Prisma client with `npm run prisma:generate --workspace backend`.
5. Start both applications with `npm run dev`.

The frontend runs on `http://localhost:5173` and the backend on `http://localhost:3000` by default. The health endpoint is `GET /api/v1/health`.

## Commands

- `npm run dev` — run frontend and backend development servers
- `npm run build` — create production builds
- `npm run typecheck` — check TypeScript across both workspaces
- `npm run lint` — lint both workspaces
- `npm test` — run unit and backend integration tests
- `npm run test:e2e` — run Playwright tests
- `npm run format:check` — check formatting

See [docs/STATUS.md](docs/STATUS.md) for implementation status and verified commands.
