# Make My Marriage

Plan one wedding in one private place. Couples and family keep the schedule, guests, budget, vendors, and photos together, then share a public page that guests can actually open.

**Live dev site:** [https://dev.debru5zwxk5qm.amplifyapp.com](https://dev.debru5zwxk5qm.amplifyapp.com)

The homepage opens with a muted celebration film. Guests can play it, turn the sound on, or watch it full screen. The same film is used on Wedding Made Easy.

https://github.com/Summi51/make-my-marriage/raw/main/public/videos/hero-wedding.mp4

[Watch the celebration film](https://dev.debru5zwxk5qm.amplifyapp.com/)

## Live Amplify links

| Page | Link |
| --- | --- |
| Home | [https://dev.debru5zwxk5qm.amplifyapp.com](https://dev.debru5zwxk5qm.amplifyapp.com) |
| Sign up | [https://dev.debru5zwxk5qm.amplifyapp.com/signup](https://dev.debru5zwxk5qm.amplifyapp.com/signup) |
| Log in | [https://dev.debru5zwxk5qm.amplifyapp.com/login](https://dev.debru5zwxk5qm.amplifyapp.com/login) |
| Wedding home | [https://dev.debru5zwxk5qm.amplifyapp.com/account](https://dev.debru5zwxk5qm.amplifyapp.com/account) |
| How it works | [https://dev.debru5zwxk5qm.amplifyapp.com/how-it-works](https://dev.debru5zwxk5qm.amplifyapp.com/how-it-works) |
| Help | [https://dev.debru5zwxk5qm.amplifyapp.com/help](https://dev.debru5zwxk5qm.amplifyapp.com/help) |
| Health | [https://dev.debru5zwxk5qm.amplifyapp.com/api/health](https://dev.debru5zwxk5qm.amplifyapp.com/api/health) |

The `main` branch URL, `https://main.debru5zwxk5qm.amplifyapp.com`, is not deployed. Use the dev link above.

## Plan together

| | |
| --- | --- |
| Wedding home | Set up the wedding, then see names and roles after sign-in |
| People | Invite Admins and Managers. Only an Admin can change membership |
| Plan | Events, tasks, expenses, and a private vendor list |
| Guests | Invitations, RSVPs, email reminders, and WhatsApp links to open |
| Memories | Private gallery, guest photo QR, and a public wedding page |
| Help | [How it works](https://dev.debru5zwxk5qm.amplifyapp.com/how-it-works) and [Help](https://dev.debru5zwxk5qm.amplifyapp.com/help) |

Sign in at [login](https://dev.debru5zwxk5qm.amplifyapp.com/login) or create an account at [signup](https://dev.debru5zwxk5qm.amplifyapp.com/signup). An Admin, bride, or groom returns to their own wedding home.

## Run it locally

Node.js 22 or newer, plus npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Health check: [http://localhost:3000/api/health](http://localhost:3000/api/health).

Set `MONGODB_URI` before creating accounts. In production, set `APP_ORIGIN` to `https://dev.debru5zwxk5qm.amplifyapp.com` so invitation links are not stuck on localhost. Add email, gallery, reminder, vendor-search, and help-widget values only when you turn those features on. Keep real values out of git.

## Check the app

```bash
npm run validate
```

That checks formatting, lint, types, unit tests, and the production build. For the browser sign-in path:

```bash
npx playwright install chromium
npm run test:e2e
```

## Stack

Next.js modular monolith, MongoDB, session cookies, and Zod validation. Routes and screens live in `src/app/`. Wedding rules live in `src/modules/`. Shared server code lives in `src/server/`. Product decisions live in `docs/`. See `AGENTS.md` for the repository boundaries.

## License

Copyright (c) 2026 Summi51

Permission is granted to use, copy, modify, and share this software for personal and internal planning, provided this copyright notice stays with the source.

The software is provided as is, without warranty of any kind. The authors are not liable for any claim or damages arising from its use. Do not publish guest data, photos, or secrets from a deployment you do not control.
