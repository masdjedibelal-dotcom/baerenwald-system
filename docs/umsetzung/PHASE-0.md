# Phase 0 — Datenmodell scharf machen

### Abnahmekriterien (vorher definiert)
- [x] Migration `20260901120000_vorgang_datenmodell_spec_w2.sql` frisch aus der Datei angewendet → Beleg: Spalten + Mapping live auf Projekt `wnotlydvhsmfkhexgeol` (PostgREST-Probe 2026-07-28); Datei `supabase/migrations/20260901120000_vorgang_datenmodell_spec_w2.sql`
- [x] `wiedervorlage_datum` + `wiedervorlage_notiz` auf leads, angebote, auftraege, rechnungen → Beleg: `GET /rest/v1/{leads|angebote|auftraege|rechnungen}?select=wiedervorlage_datum,wiedervorlage_notiz` → 200
- [x] `ersetzt_durch`, `korrektur_von`, `korrektur_art` auf angebote und rechnungen → Beleg: angebote 200; rechnungen-Zeile mit `korrektur_art: "gutschrift"` + `korrektur_von` (Backfill)
- [x] `zusammengefuehrt_in` auf leads → Beleg: `GET /rest/v1/leads?select=zusammengefuehrt_in` → 200
- [x] `letzte_aktivitaet` auf auftraege → Beleg: `GET /rest/v1/auftraege?select=letzte_aktivitaet` → 200
- [x] `notfall_verguetung` auf `aufwand` festgeschrieben (Default + Check), nicht gedroppt → Beleg: PATCH `festpreis` → 400 `auftraege_notfall_verguetung_check`; PATCH `aufwand` → 200; Spalte weiterhin vorhanden
- [x] Partner→Handwerker: Kategorie erhalten, `herkunft: "partner"`, Mapping, Zeilenzahl vorher/nachher → Beleg: `partner` 28 Zeilen; `handwerker?herkunft=eq.partner` 28; `partner_handwerker_migration` 28 Zeilen (migrated_at ~ 2026-07-28T11:52:30Z)
- [x] Kein UI-Code in diesem Commit → Beleg: Commit enthält nur Migration + Katalog/Protokoll unter `docs/`

### Was sich am Ist geändert hat
| Datei | vorher | nachher | Art |
|---|---|---|---|
| `supabase/migrations/20260901120000_vorgang_datenmodell_spec_w2.sql` | fehlte / unvollständig | idempotente Spec-W2-Migration | neu |
| `docs/UMSETZUNGSKATALOG.md` | fehlte im Repo | verbindlicher Katalog | neu |
| `docs/umsetzung/PHASE-0.md` | fehlte | Abnahmeprotokoll Phase 0 | neu |

### Neu entstanden
- Migration W2 · `supabase/migrations/20260901120000_vorgang_datenmodell_spec_w2.sql` · Ketten, WV, letzte_aktivitaet, Notfall-Check, Partner-Migration
- Mapping-Tabelle `partner_handwerker_migration` · Rückholbarkeit Partner→Handwerker

### Entfernt
- nichts (Spalte `notfall_verguetung` bewusst behalten)

### Bewusst nicht geändert
- UI / Detail-Clients / Nav — außerhalb Phase 0
- `partner`-Tabelle bleibt (28 Zeilen), nur Daten kopiert nach `handwerker`

### Bekannte Abweichungen zum Mock
- keine (Datenmodell-Phase)
