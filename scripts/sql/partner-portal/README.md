# Partner-Portal — SQL in Supabase (Schritt 1)

**Eine Datenbank** für CRM + Website. Die Dateien liegen auch im Frontend-Repo (`handwerks-plattform/supabase/migrations/`). Hier im CRM als Kopie zum Ausführen.

## Voraussetzung (zuerst!)

Funktion `public.is_crm_staff()` muss existieren. Falls noch nicht:

1. `scripts/sql/fix-portal-token-not-exists.sql` **oder**
2. `supabase/migrations/20260602120000_portal_auth_kunden.sql`

Prüfung:

```sql
select proname from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in ('is_crm_staff', 'portal_kunde_id');
-- is_crm_staff → muss eine Zeile sein
```

## Reihenfolge im SQL Editor

| Schritt | Datei | Aktion |
|--------|--------|--------|
| **0** | Dashboard | Storage → **New bucket** `handwerker-uploads`, **Private** |
| **1** | `01_portal_auth_handwerker.sql` | Auth + RLS Anfragen |
| **2** | `02_portal_handwerker_angebot_einreichung.sql` | `hw_*` Spalten |
| **3** | `03_portal_handwerker_bautagebuch.sql` | Bautagebuch + Aufträge RLS |
| **4** | `04_portal_handwerker_storage_policies.sql` | Storage RLS (nach Bucket!) |

Datei `03_storage_notes.sql` ist nur Doku — **nicht** ausführen.

## Nach dem SQL

```sql
-- Spalten da?
select column_name from information_schema.columns
where table_name = 'handwerker' and column_name = 'auth_user_id';

select column_name from information_schema.columns
where table_name = 'angebot_handwerker'
  and column_name like 'hw_%';

select column_name from information_schema.columns
where table_name = 'auftrag_bautagebuch_eintraege' and column_name = 'handwerker_id';
```

Supabase Dashboard:

- **Authentication → URL Configuration:** Redirects mit `https://baerenwaldmuenchen.de/partner/**`
- **Storage:** Bucket `handwerker-uploads` existiert

## Schritt 2 — CRM Env (nach SQL)

In `.env.local` (CRM) und Netlify (Website) **derselbe** Secret-Wert:

| CRM | Website |
|-----|---------|
| `PARTNER_INTERNAL_API_SECRET` | `PARTNER_INTERNAL_API_SECRET` |
| `NEXT_PUBLIC_SITE_URL=https://baerenwaldmuenchen.de` | (bereits `SITE_CONFIG`) |
| — | `RESEND_API_KEY`, `RESEND_FROM_SYSTEM` |
| — | `NEXT_PUBLIC_DASHBOARD_URL` → CRM-URL für Token-Fallback in Mails |

Ablauf im Angebot: **WhatsApp-Link** kopiert `/partner/login` und setzt Status; **Partner-Mail** ruft `POST /api/internal/partner-notify-anfrage` auf (kein CRM-Resend mehr).

**Menü-Phasen im Partner-Portal (Website):** Siehe `handwerks-plattform/docs/PARTNER_PORTAL_PHASEN.md` — Aufträge mit Status `offen` (HW-Zuweisung am Auftrag) erscheinen unter **Anfragen**, nicht unter Aufträge.

## Schritt 3–4 — CRM (Code)

- Angebot-Detail: Karte **Handwerker & Partner-Portal** (Einreichungen `hw_*`, PDF, EK übernehmen)
- Auftrag aus Angebot: EK aus Partner-Einreichung automatisch in `preis_partner`
- Bautagebuch: Badge **Partner**, Filter „Nur Partner“
- Website: interne Mail bei Annahme/Ablehnung im Partner-Portal

## Lokal (optional)

```bash
npm run db:partner-portal
```

Braucht `SUPABASE_DB_URL` oder `DATABASE_URL` in `.env.local`.
