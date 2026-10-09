# Project Status

Living log of major features that have been built. This is a progress record, not a source of truth for product, architecture, data or API behavior. Those remain `PRD.md`, `SYSTEM_DESIGN.md`, `DATABASE_DESIGN.md` and `API_DESIGN.md`.

Update this file when a major feature is completed. Do not log small fixes, copy tweaks or refactors.

## Current state

Foundation, the public homepage, database infrastructure, account authentication, wedding tenancy, wedding member invitations, wedding events and wedding tasks are built. Wedding creation, the wedding home, editing wedding details, member invitation management, the event itinerary and task planning are on screen.

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
- Signed-in visits to the login and signup screens redirect to the account screen. Each browser tab uses its own session; signing out of one tab leaves other tabs and their accounts untouched.
- API integration tests and a Playwright browser journey using isolated MongoDB.
- Reviewed and verified in Chrome: signup, logout, sign-in, validation, duplicate email, and the session and password fixes above.

### Wedding tenancy

- Wedding and membership models. A person belongs to one wedding. Creating a wedding and its Admin membership happens in one transaction.
- Create, read, and update wedding routes. The wedding comes from the signed-in membership, not from a client-supplied wedding id. Saving a new name or date updates the website slug. The gallery token does not change.
- Member list, role change, and removal routes. Only an Admin can change roles or remove a member. The last Admin cannot be changed or removed, including when two removals happen at the same time.
- Login and current-user responses include the real membership after a wedding exists.
- API tests cover creation, duplicate membership, impossible dates, request size, slug updates, last Admin, and cross-wedding access.

### Wedding setup and home

- After sign-in, a person with no wedding sees the wedding setup screen. Creating a wedding makes them its Admin and shows the wedding home.
- The wedding home shows the couple, date, days remaining, location, time zone, title, and the wedding address. The workspace header shows the signed-in name and Admin or Manager role. The logo returns to the public homepage.
- Reviewed and verified in Chrome: signup, logout, sign-in, wedding validation, bride and groom creation, refresh, and return after signing in again.
- Events, guests, and guest invitations are not shown as working actions.

### Edit wedding details

- Edit wedding on the wedding home opens a page prefilled with the saved names, date, location, title, description, and time zone.
- Save changes updates the overview, countdown, and wedding address. Cancel leaves the saved wedding unchanged and clears the unsaved draft.
- If the session expires while editing, the draft stays in this tab and returns after sign-in.
- Reviewed and verified in Chrome: prefilled edit, address preview, cancel, save, countdown, and refresh.

### Homepage session actions

- A signed-out visit keeps Sign In and Start Planning.
- A signed-in visit with no wedding shows Continue setup and opens wedding setup.
- A signed-in visit with a wedding shows Go to your wedding and opens the overview.
- The header, mobile menu, hero, and closing planning buttons follow the session in this tab. Another tab can stay signed in as a different person.

### Wedding member invitations

- Admins can view wedding members, invite an Admin or Manager by email, see pending invitations, and revoke a pending invitation. Managers receive the approved forbidden state.
- Secure 14-day invitation links store only an HMAC hash. Email delivery uses Volanea and removes the pending record if delivery fails so the Admin can retry.
- Public invitation acceptance covers signed-out, ready, success, wrong-email, existing-wedding, expired, revoked, already-accepted, and retry states. A new guest is sent to signup; a registered guest is sent to sign-in. Both open with the invited email filled in and return to the invitation.
- Accepting an invitation creates the wedding membership and marks the invitation accepted in one transaction.
- Admins can change Admin/Manager roles, remove another member or leave with confirmation. The final Admin cannot leave, be removed or be demoted. The recipient's workspace refreshes membership on return to the window; removed members see wedding setup.
- Invitation links open in a new tab session without switching another tab's account. Browser regressions cover Admin and Manager acceptance, role changes, removal, and two different accounts in tabs of one browser context.

### Workspace layout and dashboard preview

- Workspace layout matching the reference Stitch atelier design with full sidebar navigation: Planning (Events, Tasks), Guests (Guests, RSVP), Finance & Vendors (Expenses, Vendors), Website & Media (Website, Gallery, QR, Livestream), Settings (Details, Members), and dynamic user footer with sign out.
- Header bar with breadcrumbs (`Workspace / Dashboard`), real-time countdown badge, `Edit wedding details` button, user role indicator, and sign-out action.
- Dynamic Hero overview with couple names, wedding date, venue, time zone, co-planning team avatars, and member management link.
- 5 high-level metric cards (`Wedding events`, `Tasks completed`, `Invited guests`, `RSVP responses`, `Total expenses`).
- Muslim celebrations schedule preview (Mehndi & Dholki, Sangeet & Qawwali Night, Nikah Ceremony & Feast [Main Event], Walima Reception).
- Preparation tasks preview with assignees and status pills (`Done`, `Due in 3 days`, `In progress`, `Pending`).
- RSVP donut chart with attending/declined/awaiting breakdown and legend.
- Category-level wedding expenses breakdown with visual dots.
- "A celebration worth remembering" card with Qur'anic ayah reflection.
- Full-width photo highlights preview gallery with celebration badges.
- Fully responsive across desktop (1440px) and mobile (390px) with slide-out drawer navigation.
- Verified in Chrome across desktop and mobile viewports.

### Wedding events

- Event model, Zod schemas, and use-cases scoped by wedding id (`src/modules/events/`). Create, list, get, update, and archive (soft delete via `archivedAt`), matching `API_DESIGN.md`.
- API routes: `GET/POST /api/events`, `GET/PATCH/DELETE /api/events/:eventId`.
- Events list page grouped by day with wine/ivory styling and Cormorant Garamond headings, matching the Stitch design. Empty state with three feature tiles and a call to add the first event.
- Add event page with three sections (Event details, Date & time, Venue & details), validation, and redirect back to the list on success.
- Sidebar "Events" link already routed to this page.

### Wedding tasks

- Task model, Zod schemas, format utilities, and use-cases scoped by wedding id (`src/modules/tasks/`). Create, list, get, update, and hard delete matching `PRD.md`, `DATABASE_DESIGN.md`, and `API_DESIGN.md`.
- Status transition logic: setting status to `COMPLETED` sets `completedAt`, moving away clears it, and metadata edits preserve completion timestamp.
- Associations: assigned wedding members and related active wedding events are resolved safely into task DTOs.
- Time zone aware overdue calculation comparing wedding-local due dates with current date.
- API routes: `GET/POST /api/tasks`, `GET/PATCH/DELETE /api/tasks/:taskId`.
- Wedding tasks list view matching Stitch screens `84070788af9d4a2997016d4ce3f1ca29` and `4d89729f9854417aa4eb8139e14f9336`:
  - Tabs (`All Tasks`, `My Tasks`, `Completed`) with dynamic count badges and active underline indicators.
  - Filter card with Status, Priority, Event, and Assigned member dropdowns and Clear filters action.
  - Empty state with warm cream circular checkmark badge and "+ Add your first task" CTA.
  - Populated task cards with high/medium/low priority badges, overdue badges, completed pills with strikethrough styling, assignee icon/label, related event icon/label, due date formatting, in-place interactive status dropdown selector, Details link, and Delete modal confirmation.
- Add and Edit task forms matching Stitch screen `54dc98053a5a499f95be7503168c468e`:
  - Section 1: Task details (Task title *, optional Description).
  - Section 2: Assignment & planning (Assigned member dropdown, Related event dropdown, wedding time zone-aware Due date input, Priority dropdown, Status dropdown).
  - Cancel and Create/Save actions with clean client redirection.
- Task detail view (`/account/wedding/tasks/:taskId`) displaying complete task metadata, description card, edit navigation, and delete confirmation dialog.
- 0 hydration errors across all pages, verified with Playwright end-to-end tests and full test suites passing.
- Dashboard shows saved task progress: completed/total count and the latest saved tasks, instead of the sample task preview.
- Unsaved add and edit task details stay in this browser tab and return after session expiry and sign-in. Cancel and a successful save clear the draft.
- Task due dates save the wedding-local day as a UTC instant, and task updates use a compare-and-set so a concurrent edit returns `CONFLICT` instead of overwriting silently.
- Malformed member or event ids on task requests return `VALIDATION_ERROR` (400) rather than a server error.
- Sidebar and dashboard sections whose routes are not built yet render as non-clickable "Soon" items instead of links that would reach a 404.

## Not started

- Password recovery.
- Permanent event deletion (archiving is the only removal path).
- Functional backing domain modules for guests, invitations, expenses, vendors, website, gallery and livestream.

## Next

Domain implementation for the next active workspace module (Guests & Invitations).
