# Handwerker-Angebot: Einreichung & CRM-Bestätigung

## Daten (`angebot_handwerker`)

| Feld | Werte / Bedeutung |
|------|-------------------|
| `status` | `angefragt` → `akzeptiert` / `abgelehnt` |
| `hw_status` | `offen` → `eingereicht` → **`uebernommen`** |
| `hw_eingereicht_at` | gesetzt bei Portal- oder CRM-Einreichung |
| `hw_angebot_pdf_url` | Storage `handwerker-uploads` |

**Migrationen (Reihenfolge):**

- `20260603120100_portal_handwerker_angebot_einreichung.sql` — Preis/PDF-Einreichung
- `20260603120500_portal_handwerker_rechnung_einreichung.sql` — Rechnungs-PDF
- `20260607120000_angebot_handwerker_schema_gaps.sql` — Token, `ablehnung_grund`, `aufgabe_notiz` (falls Live-DB hinterherhinkt)

Alternativ einmalig: `scripts/sql/supabase-remote-gap-repair.sql` im SQL Editor.

## CRM (dieses Repo)

| Aktion | Server Action |
|--------|----------------|
| Manuell erfassen (PDF + Preis) | `crmManuelleHandwerkerEinreichung` |
| Bestätigen + EK + Mail | `bestaetigeHandwerkerEinreichung` |
| Nur EK (legacy) | `uebernehmeHandwerkerEinreichungEk` |

UI: Angebot-Detail → Sektion **Handwerker & Partner-Portal** (`#handwerker-partner`).

## Website (Partner-Portal)

- Phasen: `handwerks-plattform/src/lib/partner/partner-portal-phase.ts`
- Nach Einreichung bleibt Eintrag unter **Angebote**, bis `hw_status = uebernommen`
- API-Mail: `POST /api/internal/partner-notify-angebot-bestaetigt`

## Env (CRM + Website)

- `PARTNER_INTERNAL_API_SECRET` (gleicher Wert)
- `NEXT_PUBLIC_SITE_URL` im CRM (Ziel der Notify-Calls)
- Storage-Bucket `handwerker-uploads` in Supabase
