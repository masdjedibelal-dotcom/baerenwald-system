# Portal-Hinweis: Teilabnahme → CRM-Freigabe

CRM (dieses Repo) ist umgestellt. **Portal (handwerks-plattform) getrennt anpassen.**

## Neues Verhalten (CRM API)

`createPortalAbnahmeNachSignatur` in `src/lib/auftraege/portal-abnahmeprotokoll.ts`:

- speichert Protokoll mit `ebene=handwerker`, `handwerker_id`, `freigabe_status=zur_freigabe`
- setzt `auftrag_handwerker.abnahme_signiert_am` + `abnahme_protokoll_id`
- **kein** `an_kunde_gesendet_at`
- **kein** Auto-Mail / Unterlagen-Verteilung an Kunde
- **kein** Auftrag `abgeschlossen`

`versendePortalAbnahme` nur noch nach `freigabe_status=freigegeben`.

## Schema

Migration `20260803150000_abnahme_teil_freigabe.sql` (bereits auf Remote applied).

## Portal-Soll

1. Nach Signatur: nur „Zur Freigabe an CRM“ — kein Kundenversand-CTA vor Freigabe
2. Status anzeigen: `zur_freigabe` | `freigegeben` | `abgelehnt`
3. Bei Ablehnung: Nacharbeit / Punch-List, erneut einreichen → wieder `zur_freigabe`
4. Auftrag abschließen im Portal erst möglich, wenn CRM Gesamtabnahme / Freigabe-Kette erlaubt (optional später sync)

Relevante HW = **alle zugewiesenen** (`auftrag_handwerker`).
