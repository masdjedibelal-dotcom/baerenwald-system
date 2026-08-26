# A2-2 Tote Verweise — UI-Reaktion (Staging Live)

Stand: 2026-08-26 · Staging CRM + Website · Seed `LEGACY-*` / IDs `a1100000-…`

Legende: ✅ ohne Crash · 🔒 Aktion deaktiviert · ❌ fehlender Hinweis · 💥 Crash/Stack

| Fall | Seed | UI-Reaktion | Urteil |
|------|------|-------------|--------|
| Zahlplan-Zeile → gelöschte RE | Auftrag `…039`, tote RE `…03a` | Detail `/auftraege/…039` lädt; Tab **Zahlung**: Rate „LEGACY-Abschlag 1“, Status **Geplant** (tote RE = wie „keine RE“). Kein Text „gelöscht/nicht vorhanden“. Kein Stack. | ✅ rendert · ❌ kein toter-Ref-Hinweis (stillschweigend wieder „Geplant“) |
| Auftrag/Vorgang → totes Angebot | Auftrag `…034`, totes ANG `…033` | CRM-Detail lädt; Phase-Chip **„ANGEBOT · noch nicht erstellt“** (disabled). Kein Toast „nicht mehr vorhanden“. | ✅ Kette bricht nicht · 🔒 Chip disabled · ❌ Copy sagt „noch nicht“ statt „weg“ |
| Kunden-Projekt mit totem Angebot | Token auf `…034` | `/projekt/{token}`: Titel „LEGACY-Auftrag → Angebot weg“, Pipeline Anfrage→Angebot→Auftrag→…, „Noch keine Updates“. Kein Crash. | ✅ Kette bricht nicht · kein explizites „Angebot nicht mehr vorhanden“ |
| Lead nach Hard-Delete RE | Lead `…030` | `/anfragen/…030` lädt; RECHNUNG „noch nicht erstellt“. | ✅ |
| Soft-gelöschter Lead / Kunde CRM | Lead `…035`, Kunde `…002` | Detailseiten laden ohne Stack. | ✅ |
| Mieter-Status-Token (halb-gelöscht) | Token auf soft Lead `…035` (`auftraggeber_kunde_id` null) | `/melden/status/{token}`: **„Link nicht verfügbar“** / „Dieser Link ist ungültig oder nicht mehr aktiv.“ (`MIETER_WL_FEHLER` / `NeutralTokenFehler`). Kein Stacktrace. | ✅ neutrale Seite |
| Soft-Delete *mit* Org | (Codepfad) | Wenn `geloescht_am` + `auftraggeber_kunde_id`: Whitelabel `MIETER_WL_STATUS_INAKTIV` („Meldung nicht mehr aktiv“). | ✅ (Code) |
| Ungültiger Projekt-/Melde-Token | Fake-Token | Gleiche Neutrale-Copy „Link nicht verfügbar“. | ✅ |
| Portal Partner | Login `partner-elektro@…` | Dashboard inkl. LEGACY-Vorgang „Halb-migriert“ — kein Crash, kein Leer-Crash. | ✅ |
| Portal HV | Login `hv-nord@…` | Dashboard lädt (Zähler/Karten). `PortalStateView`/`PortalEmptyState` für Leer/404/Error verdrahtet; live kein Stack. | ✅ PortalStateView-Pfad vorhanden |

## Kurzantworten auf die vier Fragen

1. **Zahlplan → tote RE:** Zeile rendert ohne Crash; Rate wieder „Geplant“. **Nicht** disabled-mit-Grund und **kein** klarer „gelöscht“-Hinweis.
2. **Vorgang/Auftrag toter Angebots-Link:** Projekt-Kette bricht nicht; CRM zeigt „noch nicht erstellt“ (disabled), Kunden-Portal die Pipeline — **nicht** wörtlich „nicht mehr vorhanden“.
3. **Mieter-Status-Token halb-gelöscht:** Neutrale Fehlerseite, kein Stacktrace.
4. **Portal Kunde/HV/Partner:** Kein Crash; Empty/Fehler über `PortalStateView`-Familie; Partner zeigt LEGACY-Vorgang normal.

## Artefakte

- `docs/test/deadref-ui-results.json`
- `docs/test/deadref-ui-deep.json`
- Screenshots: `docs/test/screenshots/aktions-matrix/deadref-*.png`
