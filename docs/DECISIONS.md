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

## Unresolved decisions

| Decision                                        | Current evidence                                                                                                                                                                                                                                                                    | Resolution point                                                                                                                                                            |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public gallery token storage and reconstruction | `DATABASE_DESIGN.md` requires persisting only `gallery.tokenHash`, but `API_DESIGN.md` recommends storing a stable high-entropy raw token so members can reconstruct copyable links and printable QR codes. These requirements conflict and neither should be implemented silently. | Resolve before public gallery token or QR implementation. Consider encrypted recoverable storage or a separately persisted public identifier alongside a verification hash. |
| Public gallery and QR milestone                 | The latest API clarification explicitly defers public/gallery-token routes, settings and QR after the authenticated organiser-gallery increment. The exact later milestone is not numbered.                                                                                         | Assign a milestone only after the authenticated organiser gallery is complete and reviewed.                                                                                 |
| Password-hashing package                        | The system design requires an industry-standard library but does not choose one.                                                                                                                                                                                                    | Select and document the package during the authentication milestone after checking runtime/deployment compatibility.                                                        |
| End-to-end testing tool                         | Unit/integration testing uses Vitest. The system design requires later end-to-end coverage but does not select Playwright or another tool.                                                                                                                                          | Choose when the first end-to-end journey is scheduled; do not install one in the scaffold.                                                                                  |
| Integration-test database strategy              | The documents require API/database and tenant-isolation tests but do not decide between a dedicated MongoDB test database, an ephemeral container or another isolated setup.                                                                                                        | Resolve in the environment/database milestone.                                                                                                                              |
| Rate-limiting implementation                    | Sensitive routes and required behavior are identified, but the Vercel-compatible mechanism and package are not selected.                                                                                                                                                            | Resolve before implementing the first sensitive authentication or public-write endpoint.                                                                                    |
