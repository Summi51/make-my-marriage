# Architecture Decisions

## Accepted foundation decisions

- Vendor discovery (2026-10-14): My Vendors is fully private and editable; optional Google Places Text Search displays live results without caching them. A Google result links to Maps and a member may enter their own vendor record. `DATABASE_DESIGN.md` §52 and `API_DESIGN.md` §61 previously required copying Places details into a permanent internal vendor record. Google's [Places policies](https://developers.google.com/maps/documentation/places/web-service/policies) restrict long-term storage of Places content (Place IDs are an exception), so automatic copying and `/api/vendors/from-place` are deferred until a compliant user-confirmation/data-lifecycle design is agreed. Do not silently persist Google names, addresses, ratings, or contact details from the provider. Discovery requires a server-side Places API key and may incur usage charges; it remains disabled when no key is configured. No paid service or subscription is activated by the app.

- Expense payment types (2026-10-13): An expense row records an amount
  actually paid, with a structured `paymentKind` of `PAID`, `ADVANCE`,
  `PARTIAL`, or `FINAL`. The total includes all of these amounts exactly
  once. This narrows the older PRD phrase “spent or committed”: unpaid
  commitments cannot be represented as paid expenses. It does not introduce
  installment schedules, vendor balances, budgets, or payment processing;
  those remain deferred.

- Gallery follow-up (2026-10-12): the requested ZIP download expands the initial
  single-download scope. Build ZIPs in the browser from private signed URLs with
  a 100 MiB album limit, preserving the direct-to-R2 architecture. Refresh checks
  object existence and tombstones metadata only for confirmed missing objects.
  Each wedding may store 2,000 ready photos or 5 GiB, whichever comes first.
  Expired pending staging objects for that wedding are deleted before the next
  upload link is issued. The gallery loads one album page at a time.

- Free R2 gallery cap (2026-10-13): the live account stays on Cloudflare R2's
  free allowance (10 GB storage, 1 million Class A and 10 million Class B
  operations a month). The quoted 100,000 requests/day and 10 ms CPU limits are
  Cloudflare Workers limits, not R2, and this app does not put uploads through a
  Worker. The 2026-10-12 per-wedding 2,000-photo or 5 GiB cap is superseded:
  the whole account may keep 2,000 ready or pending photos or 8 GiB, whichever
  comes first, and 400 new uploads a day. A full account or a used daily
  allowance rejects the next upload; already saved photos stay viewable.
  Each photo is 4 MB or smaller so the same-origin fallback fits Amplify's
  request-body ceiling when browser-to-R2 CORS is unavailable. Gallery listing
  signs URLs from metadata and no longer HEADs every tile. Download still
  checks the object and tombstones a confirmed missing file. Direct upload
  remains the first attempt; the same-origin fallback is the production path
  until bucket CORS can be edited.

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
- `APP_ORIGIN` is the trusted public origin for mutation checks and is required in production. A present Origin must match it. Amplify can omit Origin on a same-site browser POST, so a missing Origin is accepted only when Host matches APP_ORIGIN and `x-forwarded-proto` is `https`. A foreign Origin is never accepted through Host. Local development defaults to the request origin. All auth responses disable caching.
- Use atomic MongoDB fixed-window counters in the infrastructure collection `auth_rate_limits`, with hashed keys and TTL cleanup. Each 15-minute window allows five signup attempts or ten login attempts per normalized email. Shared application limits are 50 signup attempts and 200 login attempts per window, including successful attempts. This conservative initial traffic budget should be revisited before a larger launch; client-provided forwarding headers are not trusted. No Redis/provider integration is needed for this increment.
- Playwright covers the first account browser journey against a production build and an isolated MongoDB server. Run `npm run test:e2e` after installing Chromium with `npx playwright install chromium`.
- A new account has no membership, so signup returns `hasWedding: false` and `/api/auth/me` returns null membership and wedding. Login and `/api/auth/me` return the real membership after a wedding is created. `/account` is the post-login destination. Password recovery is deferred to its own increment; V1 still does not require email verification.
- Wedding edits preserve the existing `website.slug`, as required by `SYSTEM_DESIGN.md`, `DATABASE_DESIGN.md` and `API_DESIGN.md`. The earlier implementation and progress log described regenerating the address on name/date changes; that conflicted with these source documents and is superseded by the stable-address behavior.

## Wedding member invitation milestone decisions

- Member invitation emails link to the token landing page, never directly authenticate a recipient. Signup/sign-in preserve the invited email and return path; acceptance remains explicit. An active tab's account is never replaced by an auth form submission: switching that tab requires explicit logout. For same-origin multi-tab use, each tab has a random ID in `window.name`, carried in the `tab` page query and `x-mmm-tab` API header; its HttpOnly session cookie is keyed by that ID. Opening an email link in a new tab creates a new tab session, and logout deletes only that tab's session. Localhost cookie names also include the configured APP_ORIGIN port. Existing local sessions require signing in again after this migration.
- Member role changes, removal and Admin self-leave are now in scope. The existing transaction guard preserves at least one Admin. Account pages refresh membership on window focus/visibility; server requests always resolve current membership, so removal revokes subsequent private access. This is not realtime synchronization between devices.

- Wedding member invitations expire after 14 days. Tokens contain 32 random bytes and only an HMAC-SHA-256 hash is stored; `MEMBER_INVITATION_SECRET` is a separate secret of at least 32 characters.
- For this milestone, invitation email is delivered through the Volanea HTTP API using `VOLANEA_API_KEY` and `VOLANEA_FROM`, following the product owner's provider change. This supersedes the older Resend references in `SYSTEM_DESIGN.md` and `API_DESIGN.md` for wedding member invitations only; email delivery for future milestones remains to be decided when those milestones begin. A live key and a verified sending domain are required for actual delivery. If delivery fails or the provider reports test mode, the pending record is removed so the Admin can retry without encountering a false duplicate.
- An expired pending invitation may be replaced by a new invitation to the same wedding and email. Replacing it removes the expired record, so the older link becomes invalid after the replacement is sent.

## Wedding events and tasks milestone decisions

- Workspace navigation and dashboard cards render sections whose routes do not exist yet (guests, invitations & RSVP, expenses, vendors, website, gallery, guest QR, livestream) as non-clickable "Soon" items instead of links, so the design preview never sends a member to a 404. Each entry becomes a real link when its module ships.
- Task due dates are date-only. `POST`/`PATCH /api/tasks` stores the UTC instant of midnight in `Wedding.timeZone`, as `API_DESIGN.md` requires, so the saved day matches the day the member chose in every supported time zone. Storing plain UTC midnight shifted the day backwards in time zones behind UTC and moved it again on each edit.
- Events are archived, not hard-deleted, because tasks, guests, expenses, and photos keep the event id. Archive is reversible: `POST /api/events/:eventId/restore` clears `archivedAt` and returns the same record to the active itinerary. Permanent delete is not offered, even for unused events, because a missed reference would leave a dangling link. `PRD.md` says events should be deletable; the newer archive rule in `DATABASE_DESIGN.md` and `API_DESIGN.md` is the one implemented.

## Wedding guests milestone decisions

- `Guest.isFamily` is a persisted boolean added for the "Invite with family" affordance in the guest UI. It is a labelling flag only: party size still lives in `maxGuests`, so the `DATABASE_DESIGN.md` rule that one Guest record represents one invitation is unchanged. `DATABASE_DESIGN.md` now lists the field.
- `GET /api/guests/:guestId/invitation-link` returns `{ url, token }` rather than the `{ url }` shown in `API_DESIGN.md` §45. The UI rebuilds the link against the browser's current origin so a preview deployment does not hand members a link pointing at `APP_ORIGIN`. The token is already present inside `url`, so this does not widen exposure.
- Guest lists return `{ data, pagination: { page, limit, total, totalPages } }`, order by name then ID, and default `limit` to 20, matching `API_DESIGN.md` §39.
- Guest RSVP writes happen only through the public token route. That route compares and sets on the document version (`__v`), increments it, and enforces party-size capacity, so a member edit and a guest response cannot silently overwrite each other.
- Guest invitation and reminder email is delivered through the same email provider already used for member invitations. The provider name is an implementation detail and is not shown in the product UI or in member-facing errors.
- WhatsApp is not sent by the server. Email is delivered directly; WhatsApp opens a prefilled chat for the member to send. Scheduled reminders follow the same split: the daily job emails, and it stores a ready WhatsApp message for the member to open.
- The daily job is `POST /api/internal/jobs/reminders`, authorized with `Authorization: Bearer <CRON_SECRET>`. Amplify has no built-in scheduler, so an external daily caller is required. Three days before `weddingDate`, pending guests receive an RSVP reminder. On the day before and the day of an event, guests who accepted that event receive an event reminder. A unique dispatch key stops the same reminder being sent twice. A manual reminder to the same guest is also blocked for 24 hours.

## Remaining unresolved decisions

| Decision                                        | Current evidence                                                                                                                                                                                                                                                                    | Resolution point                                                                                                                                                            |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public gallery token storage and reconstruction | `DATABASE_DESIGN.md` requires persisting only `gallery.tokenHash`, but `API_DESIGN.md` recommends storing a stable high-entropy raw token so members can reconstruct copyable links and printable QR codes. These requirements conflict and neither should be implemented silently. | Resolve before public gallery token or QR implementation. Consider encrypted recoverable storage or a separately persisted public identifier alongside a verification hash. |
| Public gallery and QR milestone                 | The latest API clarification explicitly defers public/gallery-token routes, settings and QR after the authenticated organiser-gallery increment. The exact later milestone is not numbered.                                                                                         | Assign a milestone only after the authenticated organiser gallery is complete and reviewed.                                                                                 |
