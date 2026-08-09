# Bärenwald Copilot (Telegram)

## 1. Supabase

Migrationen ausführen:

- `supabase/migrations/20260610120000_copilot_messages.sql`
- `supabase/migrations/20260625120000_copilot_alerts.sql` (Dedup für Echtzeit-Alerts)

## 2. Umgebungsvariablen

Siehe `.env.copilot.example` — Werte in `.env.local` und **Netlify** setzen:

- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
- `OPENWEATHER_API_KEY` (Briefing)
- `GOOGLE_MAPS_API_KEY` (optional, Abfahrtszeit)
- `CLAUDE_API_KEY` (oder alternativ `ANTHROPIC_API_KEY` — gleicher Wert, offizieller SDK-Name)
- bestehend: `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `RESEND_API_KEY`
- optional: `COPILOT_WEBHOOK_SECRET` (sonst `CRON_SECRET` für `/api/copilot/notify-lead`)

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

## 6. Echtzeit: Neue Anfrage → Telegram

Bei jeder neuen Website-Anfrage (`POST /api/lead`) wird automatisch eine Telegram-Nachricht gesendet (Dedup über `copilot_alerts`).

Manuell / Supabase-Webhook:

```bash
curl -X POST https://<SITE>/api/copilot/notify-lead \
  -H "Authorization: Bearer <CRON_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"lead_id":"<UUID>"}'
```

## 7. Webhook (nach Deploy, einmalig)

```
https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<DEINE-NETLIFY-URL>/api/telegram
```

## 8. Test

- Nachricht an den Bot senden (nur `TELEGRAM_CHAT_ID` wird akzeptiert)
- Manuell Briefing: `GET /api/cron/copilot-briefing` mit Header `Authorization: Bearer <CRON_SECRET>`

### Chat zurücksetzen (wenn der Bot „hängt“)

Telegram an den Bot:

- `/reset` oder `neustart` — löscht den gespeicherten Verlauf (`copilot_messages`)
- `/start` — gleich wie Reset (frischer Start)
- `/help` — Kurzbefehle

Nach einem Fehler wird die fehlgeschlagene User-Nachricht automatisch aus dem Verlauf entfernt; bei weiterem Hänger `/reset` senden.

## 8b. Telegram-Befehle (optional im BotFather)

Im [@BotFather](https://t.me/BotFather) → Bot → Edit Commands:

```
start - Chat zurücksetzen
reset - Verlauf löschen
help - Hilfe
```

## 9. Fehlerbehebung

### `401 status code (no body)` im Bot

Die Route `/api/telegram` liefert **kein** 401. Diese Meldung kommt fast immer vom **Anthropic SDK**: `CLAUDE_API_KEY` ist auf dem **deployten** Netlify-Build ungültig, leer oder falsch kopiert — auch wenn die Variable in der Netlify-UI steht.

Prüfen:

1. Netlify → Site configuration → Environment variables → `CLAUDE_API_KEY` → Scope **„All“** oder mindestens **Production** (nicht nur Deploy Previews).
2. Key neu von [console.anthropic.com](https://console.anthropic.com) kopieren (ohne Anführungszeichen, ohne Zeilenumbruch am Ende).
3. Nach Änderung: **Clear cache and deploy site**.
4. Key beginnt typischerweise mit `sk-ant-`.

### Webhook 401 (Telegram `getWebhookInfo`, kein Bot-Text)

Wenn Telegram den Webhook selbst mit 401 meldet (nicht die Copilot-Fehlernachricht):

- Netlify **Password protection** / Visitor access deaktivieren (blockiert `POST` von Telegram ohne Body).
- Prüfen: `curl -X POST https://<site>/.netlify/functions/...` bzw. `https://<site>/api/telegram` mit leerem/minimalem JSON.

### Bot antwortet gar nicht (kein 401)

`TELEGRAM_CHAT_ID` muss exakt deiner Chat-ID entsprechen (z. B. [@userinfobot](https://t.me/userinfobot)); bei falscher ID antwortet die Route still mit `{ ok: true }`.

### Supabase

Migration `copilot_messages` auf der Live-DB ausführen. Falscher `SUPABASE_SERVICE_ROLE_KEY` (Anon-Key statt Service Role) führt zu anderen Fehlertexten, selten exakt „401 no body“.

### Diagnose auf Production (nach Deploy)

Zeigt, was Netlify **zur Laufzeit** wirklich sieht (ohne den Key vollständig zu leaken):

```bash
curl -sS -H "Authorization: Bearer DEIN_CRON_SECRET" \
  "https://baerenwald-backend.netlify.app/api/copilot/health" | jq
```

- `anthropic_ping.ok: false` + `401` → Key auf Netlify ist **falsch/revokiert** oder kein API-Key von [console.anthropic.com](https://console.anthropic.com) (nicht Claude-Chat-Abo).
- `resolved_key_format_ok: false` → z. B. OpenAI- oder Supabase-Key in `CLAUDE_API_KEY` eingetragen.
- `supabase_copilot_messages` Fehler → Migration fehlt oder `SUPABASE_SERVICE_ROLE_KEY` falsch.
- `CLAUDE_API_KEY_set: false` aber du hast es in der UI gesetzt → Scope **Production**, danach **Clear cache and deploy**.

**Hinweis:** `/api/cron/copilot-briefing` ohne Header liefert absichtlich `401 {"error":"Unauthorized"}` — das ist **nicht** der Claude-Fehler im Bot.
