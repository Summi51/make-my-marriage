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
- A new account has no membership, so signup returns `hasWedding: false` and `/api/auth/me` returns null membership and wedding. Login and `/api/auth/me` return the real membership after a wedding is created. `/account` is the post-login destination. Password recovery is deferred to its own increment; V1 still does not require email verification.

## Wedding member invitation milestone decisions

- Member invitation emails link to the token landing page, never directly authenticate a recipient. Signup/sign-in preserve the invited email and return path; acceptance remains explicit. An active tab's account is never replaced by an auth form submission: switching that tab requires explicit logout. For same-origin multi-tab use, each tab has a random ID in `window.name`, carried in the `tab` page query and `x-mmm-tab` API header; its HttpOnly session cookie is keyed by that ID. Opening an email link in a new tab creates a new tab session, and logout deletes only that tab's session. Localhost cookie names also include the configured APP_ORIGIN port. Existing local sessions require signing in again after this migration.
- Member role changes, removal and Admin self-leave are now in scope. The existing transaction guard preserves at least one Admin. Account pages refresh membership on window focus/visibility; server requests always resolve current membership, so removal revokes subsequent private access. This is not realtime synchronization between devices.

- Wedding member invitations expire after 14 days. Tokens contain 32 random bytes and only an HMAC-SHA-256 hash is stored; `MEMBER_INVITATION_SECRET` is a separate secret of at least 32 characters.
- For this milestone, invitation email is delivered through the Volanea HTTP API using `VOLANEA_API_KEY` and `VOLANEA_FROM`, following the product owner's provider change. This supersedes the older Resend references in `SYSTEM_DESIGN.md` and `API_DESIGN.md` for wedding member invitations only; email delivery for future milestones remains to be decided when those milestones begin. A live key and a verified sending domain are required for actual delivery. If delivery fails or the provider reports test mode, the pending record is removed so the Admin can retry without encountering a false duplicate.
- An expired pending invitation may be replaced by a new invitation to the same wedding and email. Replacing it removes the expired record, so the older link becomes invalid after the replacement is sent.

## Remaining unresolved decisions

| Decision                                        | Current evidence                                                                                                                                                                                                                                                                    | Resolution point                                                                                                                                                            |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public gallery token storage and reconstruction | `DATABASE_DESIGN.md` requires persisting only `gallery.tokenHash`, but `API_DESIGN.md` recommends storing a stable high-entropy raw token so members can reconstruct copyable links and printable QR codes. These requirements conflict and neither should be implemented silently. | Resolve before public gallery token or QR implementation. Consider encrypted recoverable storage or a separately persisted public identifier alongside a verification hash. |
| Public gallery and QR milestone                 | The latest API clarification explicitly defers public/gallery-token routes, settings and QR after the authenticated organiser-gallery increment. The exact later milestone is not numbered.                                                                                         | Assign a milestone only after the authenticated organiser gallery is complete and reviewed.                                                                                 |
