# Netlify Deploy — Functions & Cron

## Deploy-Fehler „environment variables exceed the 4KB limit“

Netlify packt **alle** Variablen mit Scope **Functions** in jede Serverless Function. Stehen dort viele große Keys (Supabase, Claude, Resend, …), schlägt der Upload fehl — oft zuerst bei `cron-dispatcher` oder `invoke-crm-cron`.

### Sofort-Lösung in der Netlify UI

**Site settings → Environment variables →** jede Variable bearbeiten → **Scopes**:

| Scope | Wofür |
|---|---|
| **Builds** | Nur `npm run build` (z. B. `NODE_VERSION`-artige Build-Hints) |
| **Functions** | Laufzeit: Next.js API-Routes **und** `cron-dispatcher` |
| **Runtime** | Forms, Proxy-Redirects |

**Functions brauchen** (Next.js + Cron): u. a. `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `RESEND_API_KEY`, `CLAUDE_API_KEY`, `NEXT_PUBLIC_*`, … — alles, was Server-Code zur Laufzeit liest.

**Nur Builds**, nicht Functions (Beispiele — prüfen ob bei euch gesetzt):

- Reine CI-/Build-Secrets ohne Laufzeit-Nutzung
- Doppelte / Legacy-Variablen mit gleichem Wert
- Sehr lange JSON-Blobs, die nur lokal genutzt werden

Ziel: Summe **Name + Wert** aller Functions-Variablen **unter ~4 KB**, solange Lambda-Kompatibilitätsmodus aktiv ist.

Nach Anpassung: **Clear cache and deploy site**.

### Langfristig

Ab 2026 unterstützt Netlify **modern Functions runtime** ohne 4-KB-Limit. Unsere Cron-Dateien nutzen bereits ESM (`.mjs`, `default export`, `Response`). `node_bundler = "esbuild"` ist in `netlify.toml` gesetzt.

---

## Cron-Jobs

Eine Scheduled Function **`cron-dispatcher`** (Schedule `0,30 * * * *` UTC) ruft die passenden Next.js-Routen auf:

| Job | Route | UTC |
|---|---|---|
| Rechnungen / Mahnung | `/api/cron/rechnungen` | 23:00 |
| KI-Hub Metriken | `/api/cron/ki-hub-metrics` | 06:30 |
| KI-Hub Analyse | `/api/cron/ki-hub-analyze` | 07:00 Mo–Sa |
| Copilot Briefing | `/api/cron/copilot-briefing` | 07:30 Mo–Sa |
| Einbehalte | `/api/cron/einbehalte` | 07:30 |
| Angebot Nachfass | `/api/cron/angebot-nachfass` | 09:00 |
| Datenschutz | `/api/cron/datenschutz` | 08:00 am 1. |

Auth: `Authorization: Bearer <CRON_SECRET>` (in Netlify setzen, **Functions**-Scope).

Manuell testen:

```bash
curl -sS -H "Authorization: Bearer $CRON_SECRET" \
  "https://baerenwald-backend.netlify.app/api/cron/rechnungen"
```

In der Netlify UI: **Functions → cron-dispatcher → Run now**.

---

## Commit-Hinweis

Geänderte Dateien bei Cron-Vereinfachung:

- `netlify/functions/cron-dispatcher.mjs` — ein Dispatcher statt 7+1 Functions
- `lib/netlify/invoke-crm-cron.mjs` — Helper außerhalb von `netlify/functions/`
- Gelöscht: `netlify/functions/cron-*.mjs`, `invoke-crm-cron.mjs`
- `netlify.toml` — `node_bundler = "esbuild"`
