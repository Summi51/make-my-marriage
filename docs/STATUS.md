# Project Status

Living log of major features that have been built. This is a progress record, not a source of truth for product, architecture, data or API behavior. Those remain `PRD.md`, `SYSTEM_DESIGN.md`, `DATABASE_DESIGN.md` and `API_DESIGN.md`.

Update this file when a major feature is completed. Do not log small fixes, copy tweaks or refactors.

## Current state

Foundation, the public homepage, database infrastructure and account authentication are built. Wedding functionality and external integrations have not started.

## Completed

### Foundation scaffold

- Next.js App Router application with TypeScript and Tailwind CSS.
- Minimal application shell and health endpoint.
- Shared HTTP response helper.
- Validation tooling: format check, lint, typecheck, test and build.

### Homepage

- Public marketing page at `/`.
- Header, hero, sample workspace preview, problem and solution, family roles, feature grid, multi-event timeline, guest invitation preview, photo sharing, themes, trust pillars, closing call to action and footer.
- Styling follows the Stitch homepage design, limited to V1 features.
- Social-proof numbers are static placeholders.

### Environment and database

- Server environment validation for `MONGODB_URI` with Zod.
- Cached Mongoose connection reused across requests.
- Isolated database tests use an in-memory MongoDB server.

### Account authentication

- Signup and sign-in screens matching the homepage, linked from its planning and sign-in actions.
- Signup, login, logout and current-user API routes with MongoDB-backed sessions, Argon2id password hashing, origin checks and database rate limits.
- Protected account confirmation screen and persistent sign-in across refreshes.
- Signed-in visits to the login and signup screens redirect to the account screen. Signing out also moves other open account tabs to sign-in.
- API integration tests and a Playwright browser journey using isolated MongoDB.
- Reviewed and verified in Chrome: signup, logout, sign-in, validation, duplicate email, and the session and password fixes above.

## Not started

- Password recovery and email delivery.
- Wedding tenancy and member roles.
- Dashboard, events, tasks, guests, invitations, expenses, vendors, website, gallery and livestream.

## Next

Wedding setup and tenancy: wedding creation, membership and Admin/Manager authorization.
