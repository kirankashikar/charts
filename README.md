# Graphos — Chart Studio

A wizard for turning a spreadsheet into an advanced chart, publishing it at a stable URL, and hyperlinking that URL from a PowerPoint slide — no add-ins and no local server in the room.

Implemented from the Claude Design handoff in [`design-handoff/`](design-handoff/) (the original prototype, its chat transcript and the Modernist design system it was built on).

## What's here

| Route | What it does |
| --- | --- |
| `/` | Sign in with Google (the only auth path; redirects to the dashboard when signed in) |
| `/dashboard` | Your charts, with a thumbnail drawn from each chart's real data |
| `/wizard/[id]` | The five-step wizard: Data → Chart → Map → Style → Publish, with a live preview that redraws on every keystroke |
| `/c/[id]` | The public viewer a slide links to. Honours the chart's access setting; `?v=N` pins a version, `?embed=1` strips the chrome for an iframe |
| `/api/charts/[id]/image` | The chart rasterized to PNG (`?download=1` to save it for the slide) |

### Charts

Nine types render from the flow sheet or the segment matrix: sankey, sunburst, treemap, circle packing, chord, network, parallel coordinates, Marimekko and radar. Violin and the two map types show what they'd need instead of a broken frame — they want observation-level rows and geographic columns the sheets don't carry yet.

### Render engines

Every chart picks its own renderer on the Style step:

- **Graphos** — the built-in SVG renderer, covers every type and is what the published PNG still is exported from
- **Apache ECharts** — sankey, sunburst, treemap, network, chord, parallel, radar
- **Plotly.js** — sankey, sunburst, treemap, parallel, radar
- **D3** — sankey, sunburst, treemap, circle packing, chord, network

Library engines load on demand and fall back to the built-in renderer for anything they can't draw, so a chart never renders empty.

### Publishing

Publishing writes an immutable `ChartVersion` snapshot. The viewer URL always serves the newest published version, so editing a chart never changes a deck mid-presentation until you publish again. Access is per chart: anyone with the link, anyone in your email domain, or only you.

## Setup

```bash
npm install
cp .env.example .env        # fill in DATABASE_URL, AUTH_SECRET, Google client id/secret
npx prisma migrate dev      # or: npm run db:push against an existing database
npm run dev
```

Google OAuth needs `https://<your-domain>/api/auth/callback/google` registered as an authorized redirect URI (and `http://localhost:3000/api/auth/callback/google` for local work).

## Deploying

```bash
npm ci
npm run db:migrate          # applies migrations to DATABASE_URL
npm run build
npm start                   # serves on PORT, default 3000
```

Self-hosting behind a reverse proxy needs `AUTH_TRUST_HOST=true` and `NEXT_PUBLIC_APP_URL` set to the public origin, so published links are generated against the real domain. Node 20.9+ is required. PNG export uses `sharp`, which needs the platform's prebuilt binary — install dependencies on the target platform rather than copying `node_modules` across architectures.

### Vercel (charts.fluidpalette.com)

The app deploys to Vercel, which runs Next.js natively — no VPS, PM2, or reverse proxy to manage. `.github/workflows/deploy.yml` builds, lints, tests, applies pending Prisma migrations, and deploys to Vercel on every push to `main`.

1. **Database** — a MySQL instance reachable from Vercel's servers (not `localhost` — Vercel functions are external to wherever the DB is hosted). Set `DATABASE_URL` accordingly.
2. **DNS** — an `A` record for `charts` on `fluidpalette.com` pointing at Vercel (`76.76.21.21`), added as a custom domain on the Vercel project.
3. **Google OAuth** — add `https://charts.fluidpalette.com/api/auth/callback/google` as an authorized redirect URI on the OAuth client.
4. **Environment** — set on the Vercel project (Production): `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `NEXT_PUBLIC_APP_URL=https://charts.fluidpalette.com`.
5. **CI secrets** — for the GitHub Actions workflow to deploy: `VERCEL_TOKEN` (personal token from vercel.com/account/tokens), `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` (from `.vercel/project.json` after `vercel link`), plus `DATABASE_URL` and `AUTH_SECRET` for the migration step.

## Stack

Next.js 16 (App Router) · React 19 · Auth.js v5 with the Google provider · Prisma 6 + MySQL/MariaDB · sharp for PNG export · ECharts / Plotly / D3 as optional render engines.
