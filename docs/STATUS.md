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
- Secure 14-day invitation links store only an HMAC hash. Email delivery removes the pending record if delivery fails so the Admin can retry.
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
- Restore returns an archived event to the active itinerary through `POST /api/events/:eventId/restore`. Linked guests, tasks, expenses, and photos keep the same event id. Permanent delete is not offered.
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

### Wedding guests & invitation links

- Guest model, Zod schemas, format utilities, and use-cases scoped by wedding id (`src/modules/guests/`). Create, list, get, update, and hard delete matching `PRD.md`, `DATABASE_DESIGN.md`, and `API_DESIGN.md`.
- Cryptographically secure 32-byte base64url stable `invitationToken` generated on Guest creation, excluded from default model reads and CRUD projections.
- "Invite with family" feature option: dedicated family group toggle adding `👨‍👩‍👧‍👦 Family` categorization, group party size support, and personalized "and Family" greeting on the invitation.
- API routes: `GET/POST /api/guests`, `GET/PATCH/DELETE /api/guests/:guestId`, `GET /api/guests/:guestId/invitation-link`, `GET /api/guests/rsvp-summary`, `GET /api/public/invitations/:token`, `POST /api/public/invitations/:token/rsvp`.
- Rate-limited public RSVP endpoints that enforce party size capacity and validate origin and input before consuming quota.
- Wedding guests list view matching Stitch screen `99857df1c96d4b02867d4baf5159bf42`:
  - Search input, Event filter dropdown, RSVP status dropdown, and bottom count summary with Apply/Clear filters actions.
  - Empty state with warm gold circular badge and "+ Add your first guest" CTA.
  - Populated guest card grid displaying initials avatar, family group badge, party size, RSVP status pill, invited events count, quick link copy button, and details navigation.
- Add and Edit guest forms matching Stitch screen `5edae1592db84d25b7572c13b60c2e83`:
  - Two-column layout with Guest details, Invitation planning (including maximum party size and "Invite with family" toggle), and Event association checkboxes.
  - Wedding program events are listed from the member's own itinerary; the form links to create one when none exist yet.
  - Master "All program events" toggle checkbox for one-click selection of all ceremonies or individual ceremony toggling.
  - Right-hand contextual guidance cards ("Planning Together", "A Thoughtful Detail").
- Guest detail and invitation management view matching Stitch screen `715e1abab230439b8279f33ae5091971`:
  - Stable invitation link card with readonly copyable URL, "Copy invitation link" with instant checkmark feedback, and "Open invitation" external link.
  - Contact Registry card with initials monogram, email, phone, overall RSVP status, and maximum party size.
  - Permitted Ceremonies card listing invited celebrations.
  - Celebratory deep wine hero card.
  - Delete guest modal with confirmation.
- Public guest invitation and RSVP experience matching Stitch screens `cc9c61b5bb114754867ac94b920bd962`, `017eda1dd246463eaad2d5bd09fcfff4`, and `eb5ec48ff0a44ebdbebf6abfe9802c8d`:
  - Top navigation bar with Make My Marriage logo and guest initial monogram.
  - Couple invitation header with circular heart emblem, personalized recipient greeting ("An invitation for [Guest Name]"), serif typography, quote, and wedding date.
  - Hero image celebration banner featuring high-resolution wedding photograph with golden overlay typography.
  - Floating RSVP status card with real-time status transitions:
    - Pending RSVP state with "Respond to invitation →" CTA and headcount capacity.
    - Confirmed attending state with emerald status indicator, confirmed attendee headcount, and "Update response →" button.
    - Regretfully declined state with update option.
  - Celebration Itinerary timeline displaying personalized ceremony cards (Mehndi, Haldi, Sangeet, Nikah/Solemnization with `MAIN EVENT` styling, and Walima Reception) with venue, dress codes, and dates/times.
  - Ceremony-level `✓ Attending • X Guests` badges on itinerary cards when RSVP is confirmed.
  - Interactive Formal RSVP modal dialog matching screen `017eda1dd246463eaad2d5bd09fcfff4`:
    - "Yes, joyfully accepting!" and "Regretfully declining" custom radio cards.
    - Dynamic headcount selector buttons (1 to max party size).
    - Notice banner, private submission disclaimer, and instant async submit with real-time optimistic update.
- Workspace sidebar activated for Guests navigation item.
- Dashboard updated to display real Guest groups and RSVP responses counts linked directly to the guest list.
- Guest and invitation flows were exercised in a real browser (Chromium) against the dev server on localhost:3001, including the public RSVP route. That browser script is a manual QA aid and is not part of the committed `tests/e2e` suite.

### Invitations & RSVP management dashboard

- Dedicated "Invitations & RSVP" workspace dashboard at `/account/wedding/invitations`, matching the Make My Marriage luxury wine-and-gold design aesthetic.
- Activated the `Invitations & RSVP` link in `src/app/_components/wedding/workspace-sidebar.tsx`.
- Summary statistics cards displaying Total Invited (parties & guest headcount capacity), Confirmed Attending parties & guests (emerald status), Pending RSVPs (amber status), and Declined responses (rose status).
- Interactive segmented filter tabs: `All`, `Pending RSVP`, `Confirmed`, `Declined`, and `Unsent`.
- Search by guest name, phone, or email with debouncing, plus event/celebration filtering dropdown.
- Guest invitations tracking data table:
  - Guest/Family info with party size badge, contact info, and notes.
  - Invited ceremonies pill tags.
  - Delivery status ("Sent [Date]" or "Not Sent") with reminder count indicators.
  - RSVP confirmation status badge.
  - Action buttons:
    - One-click WhatsApp share with pre-filled luxury personalized greeting and direct guest `/invite/[token]` link.
    - Copy personalized invitation link with visual feedback.
    - Direct open invitation in new tab.
    - Mark as sent and individual reminder triggers.
- Interactive Modals:
  - **WhatsApp Share Modal**: Review/edit personalized invitation copy with couple names, wedding venue, and unique RSVP link, with "Copy Message" and "Open in WhatsApp" (`https://wa.me/...`) triggers.
  - **Preview Digital Invite Modal**: Authentic luxury digital card preview with couple names, wedding date/venue, ceremonies list, and interactive RSVP widget.
  - **Batch Send Reminders Modal**: Confirmation dialog targeting all pending guests, with real-time feedback toast and live summary refresh.
- Backend API endpoints and domain use-cases:
  - `POST /api/guests/[guestId]/send-invitation`
  - `POST /api/guests/[guestId]/send-reminder`
  - `POST /api/guests/send-reminders` (batch update)
  - Enhanced `listGuests` with `invitationStatus` filter (`ALL`, `SENT`, `UNSENT`) and direct `invitationToken` inclusion.
  - Enhanced `getRsvpSummary` with `totalCapacity`, `sentInvitations`, and `unsentInvitations`.
- Unit tests added covering invitation delivery, individual and batch reminders, and status filtering.

### Scheduled guest reminders

- A daily job emails guests who still need to reply, three days before the wedding date.
- Guests who have already accepted receive an event reminder on the day before and the day of each celebration they were invited to.
- Email is sent by the job. WhatsApp is prepared as a message the member opens and sends; the server does not send WhatsApp.
- The same reminder is not sent twice. A manual reminder to the same guest is also blocked for 24 hours.
- The job route is `POST /api/internal/jobs/reminders`, protected by `CRON_SECRET`.

### Wedding gallery photo storage

- Signed-in Admin and Manager members can upload JPEG, PNG, and WebP photos, up to 4 MB each and 20 at a time, from `/account/wedding/gallery`.
- The browser tries a direct upload to a private Cloudflare R2 staging key. If that fails, the same photo is sent through the app and checked before it is stored. The server then checks the stored size, type, and image signature, and copies the photo to a final private key before it appears in the gallery.
- Photos stay scoped to the signed-in wedding. The free R2 account is shared, so every wedding together can keep 2,000 photos or 8 GB, and 400 new uploads a day. A full account or a used daily allowance blocks the next upload. Photos already saved stay viewable. Expired unfinished uploads are removed before the next upload link, and only after their staging file is deleted.
- The gallery loads one page of 24 photos. Load more fetches the next page of the open album. Download uses a short-lived private link. Delete removes the stored photo and hides it from the gallery.
- Download Zip collects the open album, not only the page on screen, and stops at 100 MB. R2 must allow browser GET for that download.
- Guest gallery links and QR sharing are not part of this step.

### Upgraded RSVP reminders automation modal

- Upgraded the "Send RSVP Reminders" modal on `/account/wedding/invitations` matching Stitch screen `c8498b37`.
- Multi-template selection (`Gentle Reminder` [Recommended] vs `Final Deadline Reminder` [7 Days Left]) with dynamic subject prefilling and live editable subject line.
- Dynamic targeting summary banner calculating pending guests and estimated attendees across celebrations.
- Live personalized email preview card reflecting the selected reminder template.
- Pinned modal footer with count-aware batch delivery trigger.
- Supported in backend use-case `batchSendReminders` with custom subjects and template styles.

### Wedding expenses ledger and finance tracker

- Full production-grade Expenses feature implemented at `/account/wedding/expenses` matching the Stitch atelier layout and workspace design.
- Backend domain module in `src/modules/expenses/` with Mongoose model `Expense`, Zod schemas, and use-cases (`listExpenses`, `createExpense`, `getExpense`, `updateExpense`, `deleteExpense`, `getExpenseSummary`).
- Exact tenant boundary enforcement: all records, queries, and summaries are strictly scoped to the authenticated member's `weddingId`. Amounts stored in integer `amountPaise` to eliminate floating-point rounding errors.
- Support for 13 official wedding categories: `VENUE`, `CATERING`, `PHOTOGRAPHY`, `VIDEOGRAPHY`, `DECORATION`, `CLOTHING`, `JEWELLERY`, `ENTERTAINMENT`, `INVITATIONS`, `GIFTS`, `TRAVEL`, `MAKEUP`, `OTHER`.
- Optional ceremony linking (`eventId`); vendor linking remains deferred until Vendors exists.
- Endpoints: `GET /api/expenses`, `POST /api/expenses`, `GET /api/expenses/summary`, `GET /api/expenses/[expenseId]`, `PATCH /api/expenses/[expenseId]`, `DELETE /api/expenses/[expenseId]`.
- Frontend client component with empty state, financial overview, category breakdown, transaction ledger, search and ceremony filtering, CSV export, add/edit modal, and delete confirmation. Structured payment types distinguish advances from full, part, and final payments; balances and budgets remain deferred.
- Workspace sidebar navigation item activated under `FINANCE & VENDORS` -> `Expenses`.
- Main dashboard (`/account`) synchronized with real live `expenseSummary`.

### My Vendors and Discovery (Stitch Matched with Google Maps)

- Dedicated vendor domain `src/modules/vendors/` with Mongoose model, Zod validation schemas, and wedding-scoped use-cases.
- Endpoints: `GET /api/vendors`, `POST /api/vendors`, `GET /api/vendors/[vendorId]`, `PATCH /api/vendors/[vendorId]`, `DELETE /api/vendors/[vendorId]`, `POST /api/vendors/[vendorId]/restore`, and `GET /api/vendor-discovery/search`.
- Production UI at `/account/wedding/vendors`:
  - Metric cards show active vendor count, recorded agreed cost, how many vendors have a cost, and how many categories are in use. Paid advances and balances stay on Expenses.
  - City search area, category filters, search, and archived roster with Restore.
  - Map search opens the wedding city. It does not invent ratings, distances, or a vetted badge.
  - Vendor cards show the recorded agreed cost, contact actions, and archive. Archived cards restore instead of editing.
  - "+ Connect Another Vendor" card and ceremony-specialist discovery link.
  - Export contacts to CSV.
- `/account/wedding/vendors/discover` uses Google Places when a key is configured. Without a key, search opens a free Google Maps link instead of a hard error. Category links from My Vendors open the matching category.
- Sidebar highlights Discover Vendors without also highlighting My Vendors.

## Not started

- Password recovery.
- Permanent event deletion (archiving is the only removal path).
- Functional backing domain modules for website, guest QR live photo drops, and livestream.

## Next

- Wedding Website and guest live QR code experience.
