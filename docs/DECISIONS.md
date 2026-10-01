# Architecture Decisions

## Accepted foundation decisions

- Use one deployable Next.js full-stack application at the repository root.
- Use TypeScript, App Router Route Handlers and REST.
- Organize product behavior as a modular monolith under `src/modules/`.
- Co-locate Mongoose models and Zod schemas with their domain modules.
- Isolate shared infrastructure in `src/server/`.
- Separate authentication domain behavior from authentication infrastructure.
- Do not add speculative feature folders or abstraction layers.
- Use npm and Tailwind CSS for the scaffold.
- Use Prettier for formatting, Next's ESLint configuration for linting, TypeScript for static checking and Vitest for unit/integration tests. Select an end-to-end runner only when the first critical browser journey is implemented.
- Use Webpack for production builds in this environment because Turbopack's CSS worker requires a local port bind that is unavailable here.
- Defer Mongoose, Zod, R2, Resend and Google Places packages until the milestone that uses them.
- Use `mongodb-memory-server` for isolated API and database tests. Do not require a dedicated external test database.

## Authentication milestone decisions

- Use `argon2` for Argon2id password hashing (64 MiB, three passes, parallelism one). Its native binary supports the Node runtime; deployment requires Node 22 or newer. [Library documentation](https://github.com/ranisalt/node-argon2).
- Signup passwords accept 12–128 characters without composition rules or trimming. Names are trimmed and limited to 100 characters; emails are trimmed and limited to 254 characters. Login accepts existing passwords without applying the signup minimum.
- Sessions use 32 random bytes, a SHA-256 hash in MongoDB, and a fixed 30-day expiry. Authentication checks expiry directly rather than relying on TTL cleanup. Cookies are HttpOnly, SameSite=Lax, Path=/ and Secure in production. Random opaque tokens require no signing secret.
- `APP_ORIGIN` is the trusted public origin for mutation checks and is required in production. Local development defaults to the request origin. All auth responses disable caching.
- Use atomic MongoDB fixed-window counters in the infrastructure collection `auth_rate_limits`, with hashed keys and TTL cleanup. Each 15-minute window allows five signup attempts or ten login attempts per normalized email. Shared application limits are 50 signup attempts and 200 login attempts per window, including successful attempts. This conservative initial traffic budget should be revisited before a larger launch; client-provided forwarding headers are not trusted. No Redis/provider integration is needed for this increment.
- Playwright covers the first account browser journey against a production build and an isolated MongoDB server. Run `npm run test:e2e` after installing Chromium with `npx playwright install chromium`.
- Until wedding tenancy is implemented, users have no membership: auth returns `hasWedding: false`, and `/api/auth/me` returns null membership/wedding. `/account` is the temporary post-login destination. Password recovery is deferred to its own increment; V1 still does not require email verification.

## Remaining unresolved decisions

| Decision                                        | Current evidence                                                                                                                                                                                                                                                                    | Resolution point                                                                                                                                                            |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public gallery token storage and reconstruction | `DATABASE_DESIGN.md` requires persisting only `gallery.tokenHash`, but `API_DESIGN.md` recommends storing a stable high-entropy raw token so members can reconstruct copyable links and printable QR codes. These requirements conflict and neither should be implemented silently. | Resolve before public gallery token or QR implementation. Consider encrypted recoverable storage or a separately persisted public identifier alongside a verification hash. |
| Public gallery and QR milestone                 | The latest API clarification explicitly defers public/gallery-token routes, settings and QR after the authenticated organiser-gallery increment. The exact later milestone is not numbered.                                                                                         | Assign a milestone only after the authenticated organiser gallery is complete and reviewed.                                                                                 |
