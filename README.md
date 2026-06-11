<div align="center">

<img src="images/grand_tour_logo.svg" alt="Grand Tour" width="180" />

# Grand Tour

**DBSCG EU Circuit tracker** — plan, track and recap your Dragon Ball Super Card Game Masters European season.

![Angular](https://img.shields.io/badge/Angular-21-DD0031?style=for-the-badge&logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Leaflet](https://img.shields.io/badge/Leaflet-1.9-199900?style=for-the-badge&logo=leaflet&logoColor=white)
![Netlify](https://img.shields.io/badge/Netlify-00C7B7?style=for-the-badge&logo=netlify&logoColor=white)

![Status](https://img.shields.io/badge/status-actively_built-CFA30F?style=flat-square)
![Auth](https://img.shields.io/badge/auth-Supabase-3FCF8E?style=flat-square)
![License](https://img.shields.io/badge/license-personal_use-110E11?style=flat-square)

</div>

An Angular 21 SPA to follow Regional events and Finals across Europe, log results, expenses and matches, and visualise your season at a glance — built for the DBSCG EU community.

---

## Features

| Domain        | What you get                                                                |
|---------------|-----------------------------------------------------------------------------|
| **Map**       | Interactive Leaflet (CARTO dark) with Regional / Finals markers — **public** |
| **Calendar**  | Filterable list by type, country, period, search — **public**               |
| **My Season** | Upcoming and past events you've registered to                               |
| **Per-event** | Result (deck, leader, placement), matches (W/L/D/Bye), expenses             |
| **Budget**    | Aggregate view: totals (spent / prizes / net), category breakdown, by event |
| **Dashboard** | Bento grid: global WR, best placement, visited cities map, matchup vs deck filter, deck WR, financial recap, upcoming events |
| **Auth**      | Email + password via Supabase (bcrypt server-side), email confirmation, reset by link |
| **i18n**      | FR / EN throughout, including welcome and reset emails                      |

---

## Stack

```
Angular 21 (standalone components, signals, control flow)
Supabase  (Auth, Postgres, RLS, transactional emails)
Resend    (SMTP provider — 100 emails/day free)
Leaflet 1.9 + @types/leaflet
RxJS 7, SCSS, Vitest
Netlify   (CDN + auto-deploy from GitHub)
```

---

## Quick start (dev)

```bash
# Install deps (Windows: prefix with NODE_OPTIONS="--use-system-ca")
npm install

# Set your Supabase project URL + anon key
# in src/environments/environment.ts

# Start the dev server
npm start
```

Open <http://localhost:4200>. First-time Supabase setup is documented in [`docs/supabase-setup.md`](docs/supabase-setup.md) (~15 min, includes the SQL schema, RLS policies, email templates).

---

## Architecture in one diagram

```
                ┌──────────────────────────────────────────────┐
                │  Netlify CDN  (static SPA)                   │
                │  https://<site>.netlify.app                  │
                └──────────────────┬───────────────────────────┘
                                   │ supabase-js SDK
                                   ▼
                ┌──────────────────────────────────────────────┐
                │  Supabase (eu-central-1)                     │
                │   • Auth (bcrypt, JWT, email confirmation)   │
                │   • Postgres 4 tables, RLS scoped to user_id │
                │   • Storage (logo, future deck photos)       │
                └──────────────────┬───────────────────────────┘
                                   │ SMTP relay
                                   ▼
                ┌──────────────────────────────────────────────┐
                │  Resend  (transactional emails FR + EN)      │
                └──────────────────────────────────────────────┘
```

- **Map and calendar are public** — anyone can browse the EU circuit before signing up.
- **Per-user data** (registrations, results, expenses, profile) lives in Supabase with Row-Level Security enforced server-side.
- **Session** persisted by `supabase-js` in `localStorage` (JWT auto-refresh).

---

## Design system

```
--color-bg        #110E11   night background
--color-surface   #1A171B   card surface
--color-primary   #C62338   DBSCG red
--color-accent    #CFA30F   gold accent
--color-text      #FFFFFC   off-white text
--font-display    HeadingNowTrial-57Extrabold
```

Signature visual: the **offset gold shadow** on cards mirrors the logo's offset triangle.

---

## Scripts

| Command           | What it does                              |
|-------------------|-------------------------------------------|
| `npm start`       | Angular dev server with watch on :4200    |
| `npm run build`   | Production build into `dist/`             |
| `npm test`        | Vitest run (single pass)                  |

---

## Deployment

Push to `main` → Netlify auto-deploys via `netlify.toml`. Complete walkthrough in [`docs/netlify-deploy.md`](docs/netlify-deploy.md) — first deploy takes ~5 min.

Supabase env vars live in `src/environments/environment.prod.ts` (the anon key is **safe to commit**: it's public by design, RLS enforces access).

---

## Roadmap

```
Phase 1     Map + seed + design system           [DONE]
Phase 1.5   Auth + profile                       [DONE]
Phase 2     Calendar + My Season                 [DONE]
Phase 3     Event detail (result + matches +     [DONE]
            expenses)
Phase 4     Dashboard + aggregated Budget        [DONE]
Phase 5     Supabase + Netlify deploy            [DONE]
Future      OAuth (Discord)
            Community zone (leaderboards,
            share season, deck photos)
            Custom domain
```

---

## Notes

Branding asset `images/grand_tour_logo.svg` © its author.

**DBSCG** = Dragon Ball Super Card Game Masters. Not affiliated with Bandai.
