# Project Status

Living log of major features that have been built. This is a progress record, not a source of truth for product, architecture, data or API behavior. Those remain `PRD.md`, `SYSTEM_DESIGN.md`, `DATABASE_DESIGN.md` and `API_DESIGN.md`.

Update this file when a major feature is completed. Do not log small fixes, copy tweaks or refactors.

## Current state

Foundation is scaffolded and the public homepage is built. Authentication, database access, wedding functionality and external integrations have not started.

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

## Not started

- Environment validation and MongoDB connection.
- Authentication.
- Wedding tenancy and member roles.
- Dashboard, events, tasks, guests, invitations, expenses, vendors, website, gallery and livestream.

## Next

Environment validation and the MongoDB connection.
