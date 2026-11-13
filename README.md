# Make My Marriage

A private wedding workspace for couples and the family helping them plan. One wedding, one shared place for the schedule, guests, photos, vendors, and the public page guests actually open.

The homepage includes a muted celebration film at `/videos/hero-wedding.mp4`. It starts silent, respects reduced-motion preferences, and can be played, paused, unmuted, or opened full screen.

## What you can do

- Create an account, set up a wedding, and invite family as Admin or Manager.
- Plan events and tasks, track expenses, and keep a private vendor roster.
- Invite guests, collect RSVPs, and prepare email or WhatsApp reminders.
- Store photos in a private gallery and share a guest photo QR.
- Publish a wedding website, a public portal, and a livestream link.
- Read [How it works](/how-it-works) and [Help](/help) before signing in.

Signed-in Admins, the bride, and the groom land on their wedding home, with their name and role shown in the workspace.

## Local setup

Requires Node.js 22 or newer and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. The health check is http://localhost:3000/api/health.

Set `MONGODB_URI` before using accounts or wedding data. Set `APP_ORIGIN` to the public HTTPS origin in production so invitation links leave localhost. Copy the remaining names from `.env.example` only when you enable email, gallery storage, reminders, vendor search, or the help widget. Never commit real values.

## Routes

| Path | Who it is for |
| --- | --- |
| `/` | Public homepage and celebration film |
| `/signup`, `/login` | Create an account or sign in |
| `/account` | Wedding home after sign-in |
| `/how-it-works`, `/help` | Planning guide and answers |
| `/w/[slug]` | Public wedding page |
| `/invite/[token]` | Guest invitation and RSVP |
| `/gallery/[token]` | Guest photo upload |

## Validation

```bash
npm run validate
```

That runs format check, lint, typecheck, unit tests, and the production build. For the browser sign-in journey, install Chromium once with `npx playwright install chromium`, then run `npm run test:e2e`.

## Architecture

- `src/app/`: routes, layouts, UI composition, and thin HTTP handlers
- `src/modules/`: domain behavior, Mongoose models, and Zod schemas
- `src/server/`: shared server infrastructure
- `src/lib/`: shared, framework-neutral utilities
- `docs/`: product and technical sources of truth

See `AGENTS.md` for the repository boundaries.
