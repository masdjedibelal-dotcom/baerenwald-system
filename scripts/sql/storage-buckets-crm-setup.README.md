# Storage-Buckets CRM — Setup

## Ausführen

**Supabase → SQL → New query** → gesamte Datei `storage-buckets-crm-setup.sql` einfügen → Run.

Oder lokal (mit `SUPABASE_DB_URL` in `.env.local`):

```bash
npm run db:storage-buckets
```

## Was angelegt wird

| Bucket-ID | Inhalt |
|-----------|--------|
| `rechnungen-pdfs` | Rechnungs-PDFs |
| `protokolle` | Abnahme-PDF, Bautagebuch-/Timeline-Fotos |
| `partner-dokumente` | HW-Compliance (privat) |
| `hw-formular-fotos` | Formular-Fotos |
| `logos` | Firmenlogo |
| `eingangsrechnungen` | Eingangsrechnungen (Kleinbuchstaben!) |
| `buergschaften` | Bürgschaften (Kleinbuchstaben!) |
| + Policies für `handwerker-uploads` | falls Bucket schon existiert |

## Alte Buckets (optional löschen)

Diese werden vom Code **nicht** verwendet — nur aufräumen, wenn leer/überflüssig:

- `generierte PDFs`
- `Abnahmeprotokolle`
- `Eingangsrechnungen` (Großschreibung)
- `Buergschaften` (Großschreibung)
- `Handwerker Fotos`

## Nach dem Lauf

Die Prüf-Query am Ende des Skripts sollte **10 Zeilen** zeigen (alle CRM-Bucket-IDs).

Test: Rechnung versenden oder Abnahme-PDF erzeugen — in Storage unter `rechnungen-pdfs` bzw. `protokolle` sollte eine neue Datei erscheinen.
