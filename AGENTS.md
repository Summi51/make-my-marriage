# Make My Marriage repository instructions

## Sources of truth

Read the documents in `docs/` before implementing product behavior. Their responsibilities and precedence are:

1. `PRD.md` defines product intent and the complete feature backlog.
2. `SYSTEM_DESIGN.md` controls architecture and infrastructure.
3. `DATABASE_DESIGN.md` controls persisted fields, relationships, constraints and indexes.
4. `API_DESIGN.md` controls current HTTP contracts and implemented V1 behavior.

When an older PRD detail conflicts with a newer aligned technical document, use the newer aligned decision and record the conflict. Do not silently combine contradictory designs; record unresolved choices in `docs/DECISIONS.md`.

## Architecture boundaries

- Keep `src/app/` limited to routing, layouts, UI composition and thin HTTP entry points.
- Use one deployable Next.js application organized as a modular monolith, not microservices or separate frontend/backend applications.
- Keep domain business logic in `src/modules/<domain>/`; keep feature Mongoose models and Zod schemas there too.
- Keep shared server infrastructure in `src/server/`.
- `src/modules/auth/` owns authentication use cases and domain rules. `src/server/auth/` owns session cookies, token mechanics and other authentication infrastructure.
- Route Handlers must stay thin: authenticate, authorize, parse and validate input, call domain code, map errors and format the response. Do not place business workflows in route files.
- Wedding is the tenant boundary. Derive the current wedding from authenticated membership and include its ID in every private wedding-owned query; never trust a client-supplied `weddingId`.
- The only V1 member roles are `ADMIN` and `MANAGER`. Both can perform normal wedding-management operations; only `ADMIN` may invite, remove or change the role of Wedding Members. Never allow removal of the final Admin.
- Server/client boundaries are explicit: database access, sessions, authorization, secrets and provider SDKs stay in server-only code. Client Components receive only safe serialized data and must never import server modules or read server environment variables.
- Do not create routes, modules or integrations before their milestone needs them.
- Do not introduce repository, service or interface layers unless real complexity justifies them.
- Add to `src/lib/` only when code is framework-neutral, domain-neutral and clearly reusable.

## Scope and validation

- Keep every change limited to the active milestone. Do not accidentally implement deferred routes, product modules, realtime behavior or provider integrations.
- Before handoff run `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run test` and `npm run build`. `npm run validate` runs that sequence.
- Never commit secrets; document safe variable examples in `.env.example`.
- After completing a major feature, update `docs/STATUS.md` with what was built and what remains next. Do not log small fixes, copy tweaks or refactors. `docs/STATUS.md` is a progress log only; it does not override `PRD.md`, `SYSTEM_DESIGN.md`, `DATABASE_DESIGN.md` or `API_DESIGN.md`.
