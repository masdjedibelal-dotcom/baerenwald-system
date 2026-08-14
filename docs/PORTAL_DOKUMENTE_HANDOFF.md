# Portal-Dokumente — CRM-Handoff

## Grundregel

**Alles, was das CRM per E-Mail mit PDF/Dokument an den Kunden sendet, muss auch im Kundenportal unter Auftrag → Dokumente landen.**

Dafür braucht es immer eine **persistierte URL** (oder freigegebene Timeline-Fotos) — reine Mail-Anhänge ohne DB-Eintrag reichen nicht.

Sortierung: **neueste zuerst**, ohne Datum unten (`sortDokumentZeilenNachDatum` / `sortPartnerDokumentZeilen`).

## Mapping Mail → Portal

| Versand (CRM) | Speicherort | Portal-Feld |
|---------------|-------------|-------------|
| Angebot an Kunde | `angebote.pdf_url` + `gesendet_am` | `dokumenteFromAngebot` |
| Rechnung an Kunde | `rechnungen.pdf_url` + `status in (gesendet, bezahlt)` | `dokumenteFromRechnungen` |
| Abnahmeprotokoll | `auftraege.abnahme_protokoll_url` + Unterlagen HV/Mieter via `verteileAbnahmeAnUnterlagen` | `dokumenteFromAuftrag` / `kunden_dokumente` |
| **Abschlussdokumentation** | `auftraege.abschlussdokumentation_url` + `abschlussdokumentation_gesendet_at` | `dokumenteFromAuftrag` |
| Projekt-Update mit Fotos | `auftrag_timeline` + `fuer_kunde_freigegeben` | `dokumenteFromTimeline` |
| Bautagebuch (freigegeben) | `auftrag_bautagebuch_eintraege` | `dokumenteFromBautagebuch` |

**Nur Hinweis-Mails** (Auftragsbestätigung, „Zur Abnahme“) ohne PDF → kein Dokumenteneintrag (Status-Link in Mail).

## Kundenportal (Bärenwald → Kunde)

| Tabelle / Objekt | Pflichtfelder | Wann sichtbar | CRM setzt bei |
|------------------|---------------|---------------|---------------|
| **`angebote`** | `pdf_url`, `gesendet_am`, `status_einfach` | `gesendet` / `kunde_akzeptiert` / `angenommen` | `sendAngebotToKunde` → `persistPdfForAngebot` + Status |
| **`rechnungen`** | `pdf_url`, `rechnungsnummer`, `status ∈ {gesendet, bezahlt}`, `gesendet_at` oder `rechnungsdatum` | Nach Versand (bleibt nach Zahlung) | `sendeRechnungAnKunde` → `persistPdfForRechnung` |
| **`auftraege`** | `abnahme_protokoll_url`, optional `abnahme_datum` | Nach Abnahme | `abnahmeprotokoll-actions` → zusätzlich `verteileAbnahmeAnUnterlagen` |
| **`kunden_dokumente`** | `datei_url`, `typ=abnahmeprotokoll` | HV + Mieter (eigene `kunde_id`) | `verteileAbnahmeAnUnterlagen` nach Kundenversand |
| **`auftrag_bautagebuch_eintraege`** | `fuer_kunde_freigegeben = true` | Nach Freigabe | `bautagebuch-actions` (Kunden-RLS) |
| **`auftraege`** | `abschlussdokumentation_url`, `abschlussdokumentation_gesendet_at` | Nach Mail-Versand | `sendAbschlussdokumentationAnKunde` |
| **Bautagebuch** | `fuer_kunde_freigegeben = true`, `foto_urls` | Nach Freigabe | `bautagebuch-actions` (publish) |
| **Timeline** | `fuer_kunde_freigegeben = true`, `foto_urls` | Nach Freigabe | Dokumente-Tab / Kunden-Status |

Nicht ans Kundenportal: `hw_angebot_*`, `hw_rechnung_*`.

## Partnerportal (Handwerker ↔ Bärenwald)

| Tabelle / Objekt | Pflichtfelder | Anzeige |
|------------------|---------------|---------|
| **`handwerker_vertraege`** (Projekt) | `pdf_url`, optional `signiert_am`, `vertrags_nr` | „Projektvertrag …“ |
| **`angebot_handwerker`** | `hw_angebot_pdf_url`, `hw_angebot_anhang_urls`, `hw_eingereicht_at` | „Handwerker · Unterlage“ |
| **`angebot_handwerker`** | `hw_rechnung_pdf_url`, `hw_rechnung_eingereicht_at` | „Handwerker · Rechnung“ |
| **`partner_dokumente`** | `datei_url`, `hochgeladen_am`, `bezeichnung`, `auftrag_id` | Compliance/Bauprojekt |

**Rahmenvertrag** (`typ = rahmen`): `pdf_url` + ggf. `portal_akzeptiert_am`.

### PostgREST-Joins (CRM)

`angebot_handwerker`-HW-Felder sind in `AUFTRAG_DETAIL_SELECT` und im Fallback (`auftraege-data.ts`) über `ANGEBOT_HANDWERKER_HW_DOKUMENT_SELECT` (`partner-hw-dokument-typen.ts`).

HW-Uploads aus dem Portal landen in `angebot_handwerker` — CRM **liest** nur (signed URLs via `signHandwerkerDokumentStoragePaths`).

## Kurz-Checkliste CRM

1. Angebot an Kunde: PDF + `gesendet_am` + `status_einfach`
2. Rechnung an Kunde: PDF + `status ∈ {gesendet, bezahlt}` + `gesendet_at`
3. Projektvertrag: `handwerker_vertraege.pdf_url` (auto via `provision-projektvertrag.ts`)
4. Abschlussdoku: PDF in Storage `protokolle` → `abschlussdokumentation_url` (bei Mail-Versand)
5. Abnahme: PDF + Unterlagen HV/Mieter (`kunden_dokumente`) + ggf. HV-Notification
6. HW-Uploads: nur lesen, nicht doppelt pflegen
7. Bautagebuch/Timeline: erst nach `fuer_kunde_freigegeben` (Legacy `sichtbar_fuer_kunde` allein reicht nicht)
8. HV-Portal: Leads/Angebote auch über `auftraggeber_kunde_id` (`portal_kunde_lead_ids`)

**Fehlt ein Dokument in der Portal-Liste → fast immer fehlende `pdf_url` oder Status/Datum**, nicht die Portal-Logik.
