# Make My Marriage

A full-stack wedding-planning application built as a Next.js modular monolith.

## Local setup

Requires Node.js 22 or newer and npm (including the Argon2 native dependency).

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. The health endpoint is `/api/health`. Set `MONGODB_URI` in `.env.local` before using database-backed features. Other integration variables are not required yet.

Signup is at `/signup`, sign-in at `/login`, and the protected account screen at `/account`. Configure `APP_ORIGIN` with your public origin in production (for example, `https://your-app.example`); authentication rejects mutation requests from other origins. Sessions expire after 30 days. Wedding setup and password recovery are later increments.

## Validation

Run `npm run validate`, or run `format:check`, `lint`, `typecheck`, `test`, and `build` individually through npm.

For the complete browser authentication journey, run `npx playwright install chromium` once, then `npm run test:e2e`. It uses an isolated temporary MongoDB database and starts the production build on port 3100; no real accounts are created.

## Architecture

- `src/app/`: routes, layouts, UI composition and thin HTTP handlers
- `src/modules/`: domain behavior and feature-owned Mongoose models and Zod schemas
- `src/server/`: shared server infrastructure
- `src/lib/`: only genuinely shared, framework-neutral and domain-neutral utilities
- `docs/`: product and technical sources of truth

Feature directories are created only when implementation begins. See `AGENTS.md` for the full boundaries.
