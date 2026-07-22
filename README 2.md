# Bärenwald CRM Dashboard

Next.js 14 CRM — Deployment ausschließlich über **Netlify** (`netlify.toml`, `@netlify/plugin-nextjs`).

## Lokal starten

```bash
npm install
cp .env.example .env.local   # Werte ausfüllen
npm run dev
```

Optional ohne Login: `npm run dev:skip-auth` (Port 3001).

## Build (wie Netlify)

```bash
npm run build
```

Vor dem Build werden veraltete Root-Duplikate und abgelöste Dateien per `scripts/remove-deploy-blockers.mjs` entfernt.

## Netlify

1. Repo verbinden, Build-Command: `npm run build` (steht in `netlify.toml`)
2. **Environment variables** (Site settings):
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` — produktive CRM-URL (z. B. `https://crm.example.de`)
   - `CRON_SECRET` — für Scheduled Functions (`Authorization: Bearer …`)
   - `RESEND_API_KEY`, ggf. weitere aus `.env.example`
3. **Scheduled Functions** (in `netlify.toml`):
   - `/api/cron/einbehalte` — täglich 07:30
   - `/api/cron/rechnungen` — täglich 08:00
   - `/api/cron/datenschutz` — monatlich, 1., 08:00
   - `/api/cron/angebot-nachfass` — täglich 09:00

Ohne `NEXT_PUBLIC_APP_URL` nutzt die App auf Netlify die Variable `URL` (Site-URL).

## Supabase

Migrationen unter `supabase/migrations/`. Lokal z. B. `npm run db:angebot-handwerker-gaps` (siehe `package.json`).
