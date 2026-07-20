# CRM Handoff: Handwerker-Zuweisung & Bauauftrag

**Stand:** Juni 2026  
**Repos:** `baerenwald-crm-dashboard` (CRM) · `handwerks-plattform` (Partner-Portal)

## Ziel

CRM und Partner-Portal nutzen **dieselbe strikte Bauprojekt-Regel** (`gewerke.ist_bauleistung === true`). Handwerker-Zuweisung läuft primär über das Leistungs-Popup in v3.

## Umgesetzt im CRM (Code)

| Teil | Änderung |
|------|----------|
| **B1** | `ist-bauprojekt.ts`: `ist_bauleistung === true` (nicht mehr `!== false`) |
| **B2/B4** | `compliance-partner-profile.ts`: `typGiltFuerProjekt` nur Auftrags-`gewerk_slug`, kein HW-Profil-Fallback |
| **B2** | `sync-auftrag-ist-bauprojekt.ts` + Aufruf nach Position anlegen/ändern/löschen |
| **B2/B3** | Auftrag-Detail: Toggle „Bauprojekt“ im Projekt-Modal, Chip Bauprojekt/Standardauftrag |
| **B3** | Tabs Baustelle + Compliance nur bei `auftragIstBauprojekt()` |
| **A1/A4** | `AuftragLeistungNewModal`: „Speichern“ + „Speichern & senden“, Copy angepasst |
| **A4** | `sendAuftragLeistungenAnHandwerkerV3`: optional `positionIds` für Einzelversand |
| **A2** | `addAuftragPosition`: `gewerk_slug` Pflicht |
| **A3** | `AuftragLeistungDetailModal`: Hinweis „beim Anlegen zuweisen“ |

## Regel Bauprojekt (CRM = Portal)

**Ja**, wenn:

1. `auftraege.ist_bauprojekt = true` (manuell), **oder**
2. Mindestens eine Position mit `gewerke.ist_bauleistung = true`

**Nein**, wenn:

- `auftraege.ist_bauprojekt = false` (manuell, überschreibt Heuristik), **oder**
- Keine Bau-Gewerk-Position

`syncAuftragIstBauprojekt` setzt den Flag nur automatisch, wenn `ist_bauprojekt` noch **nicht** explizit `true`/`false` gesetzt wurde.

## Nachreichung (laufender Auftrag)

Neue Leistung mit Handwerker + **Speichern & senden** → `sendAuftragLeistungenAnHandwerkerV3` mit `positionIds`. Portal erkennt Delta über `auftrag_positionen` + `angebot_handwerker` (`hw_konditionen`, `gewerk_slug`).

## Datei-Index

| Thema | Datei |
|-------|-------|
| Bauprojekt-Logik | `src/lib/auftraege/ist-bauprojekt.ts` |
| Auto-Sync Flag | `src/lib/auftraege/sync-auftrag-ist-bauprojekt.ts` |
| Compliance-Filter | `src/lib/handwerker/compliance-partner-profile.ts` |
| Leistung + HW | `src/components/auftraege/leistungen-v3/AuftragLeistungNewModal.tsx` |
| Position speichern | `src/app/(dashboard)/auftraege/actions.ts` |
| HW senden | `src/app/(dashboard)/auftraege/leistungen-steuerung-v3-actions.ts` |
| Auftrag-Tabs | `src/components/auftraege/AuftragDetailClient.tsx` |

## Offen / Ops

- Gewerk **„Allgemein“** in DB prüfen (`ist_bauleistung`) — Migration ggf. separat
- Legacy `AuftragPositionenTab` / SteuerungTabLegacy: `gewerk_slug` bei manuellen Adds sicherstellen
