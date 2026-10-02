# Project Status

Living log of major features that have been built. This is a progress record, not a source of truth for product, architecture, data or API behavior. Those remain `PRD.md`, `SYSTEM_DESIGN.md`, `DATABASE_DESIGN.md` and `API_DESIGN.md`.

Update this file when a major feature is completed. Do not log small fixes, copy tweaks or refactors.

## Current state

Foundation, the public homepage, database infrastructure, account authentication, and wedding tenancy are built. Wedding creation and the wedding home are on screen. Edit details, member management screens, and external integrations have not started.

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

### Wedding tenancy

- Wedding and membership models. A person belongs to one wedding. Creating a wedding and its Admin membership happens in one transaction.
- Create, read, and update wedding routes. The wedding comes from the signed-in membership, not from a client-supplied wedding id. The website slug stays the same when names or the date change.
- Member list, role change, and removal routes. Only an Admin can change roles or remove a member. The last Admin cannot be changed or removed, including when two removals happen at the same time.
- Login and current-user responses include the real membership after a wedding exists.
- API tests cover creation, duplicate membership, impossible dates, request size, slug stability, last Admin, and cross-wedding access.

### Wedding setup and home

- After sign-in, a person with no wedding sees the wedding setup screen. Creating a wedding makes them its Admin and shows the wedding home.
- The wedding home shows the couple, date, days remaining, location, time zone, title, and the stable wedding address.
- Reviewed and verified in Chrome: signup, logout, sign-in, wedding validation, bride and groom creation, refresh, and return after signing in again.
- Edit details and wedding member screens are not built yet. Events, guests, and invitations are not shown as working actions.

## Not started

- Password recovery and email delivery.
- Edit wedding details and wedding member management screens.
- Dashboard, events, tasks, guests, invitations, expenses, vendors, website, gallery and livestream.

## Next

Edit wedding details and wedding members, once those Stitch screens are approved.
