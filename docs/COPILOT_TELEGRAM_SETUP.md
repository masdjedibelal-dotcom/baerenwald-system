# Bärenwald Copilot (Telegram)

## 1. Supabase

Migration ausführen:

`supabase/migrations/20260610120000_copilot_messages.sql`

## 2. Umgebungsvariablen

Siehe `.env.copilot.example` — Werte in `.env.local` und **Netlify** setzen:

- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
- `OPENWEATHER_API_KEY` (Briefing)
- `GOOGLE_MAPS_API_KEY` (optional, Abfahrtszeit)
- `CLAUDE_API_KEY`
- bestehend: `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `RESEND_API_KEY`

## 3. NPM

```bash
npm install @anthropic-ai/sdk
```

## 4. Middleware

`/api/telegram` ist in `middleware.ts` unter `isPublic` freigegeben (Telegram-Webhook ohne CRM-Login).

## 5. Netlify Cron

In `netlify.toml` (falls noch nicht vorhanden):

```toml
[[scheduled]]
  path = "/api/cron/copilot-briefing"
  schedule = "30 7 * * 1-6"
```

Mo–Sa 07:30 — Morgen-Briefing per Telegram.

## 6. Webhook (nach Deploy, einmalig)

```
https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<DEINE-NETLIFY-URL>/api/telegram
```

## 7. Test

- Nachricht an den Bot senden (nur `TELEGRAM_CHAT_ID` wird akzeptiert)
- Manuell Briefing: `GET /api/cron/copilot-briefing` mit Header `Authorization: Bearer <CRON_SECRET>`
