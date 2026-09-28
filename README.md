# Make My Marriage

A full-stack wedding-planning application built as a Next.js modular monolith.

## Local setup

Requires Node.js 20.9 or newer and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. The health endpoint is `/api/health`. Database and integration variables are not required for the foundation scaffold.

## Validation

Run `npm run validate`, or run `format:check`, `lint`, `typecheck`, `test`, and `build` individually through npm.

## Architecture

- `src/app/`: routes, layouts, UI composition and thin HTTP handlers
- `src/modules/`: domain behavior and feature-owned Mongoose models and Zod schemas
- `src/server/`: shared server infrastructure
- `src/lib/`: only genuinely shared, framework-neutral and domain-neutral utilities
- `docs/`: product and technical sources of truth

Feature directories are created only when implementation begins. See `AGENTS.md` for the full boundaries.
