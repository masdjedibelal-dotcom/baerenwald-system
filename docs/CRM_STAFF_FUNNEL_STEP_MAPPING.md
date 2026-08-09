# CRM-Staff-Funnel — konkretes Step-Mapping

Website-Quelle: `handwerks-plattform` (`getBwRechnerScreenSequence`, `getResolvedStepsForSituation`).  
CRM-Ziel: verkürzter Staff-Funnel in `WizardShell`, gleiche Daten wie Website (`funnel_daten` + Lead-Spalten).

Legende Aktion:
- **übernehmen** = gleicher Screen / gleiche Frage
- **skip** = nicht im CRM
- **ersetzen** = anderer Screen / Staff-Variante
- **kompakt** = mehrere Website-Screens → eine CRM-Card
- **optional** = Skip-Button „Weiß ich nicht / später“

---

## 0. Globale CRM-Schale (vor/nach dem Funnel)

| # | CRM-Step-ID | Label | Website-Pendant | Aktion |
|---|-------------|-------|-----------------|--------|
| C0 | `crm_kontext` | Kunde · Kanal · optional Objekt/Melder | — (CRM-only) | **ersetzen** Einstieg |
| C1 | `crm_pruefen` | Zusammenfassung · Anlegen | `lead` + `result` (ohne Kundenkonto) | **ersetzen** Abschluss |
| — | — | Trust / Portal-Login / Danke | `trust_*`, MeinBärenwald-Konto, `danke` | **skip** |

CRM-only Felder in `crm_kontext`:
- `verknuepfterKundeId` / Neukunde
- bei HV: Kunde = Hausverwaltung, Melder optional
- `kanal` (telefon, email, vor_ort, hv_…)
- `interneNotiz`

---

## 1. Situation `erneuern` — Umbau & Modernisierung

### Website → CRM

| # | Website Screen-ID | Website-Label (kurz) | CRM-Step-ID | CRM-Label | Aktion |
|---|-------------------|----------------------|-------------|-----------|--------|
| 1 | `trust_intro` | Handwerk neu gedacht | — | — | **skip** |
| 2 | `situation` | Was planst du? | `situation` | Situation | **übernehmen** |
| 3 | `bereiche` | Was soll erneuert werden? | `bereiche` | Bereiche | **übernehmen** |
| 4a | `zugaenglichkeit` | Zugang (Fassade/Dach/Anbau) | `zugaenglichkeit` | Zugänglichkeit | **übernehmen** (nur wenn nötig) · **optional** |
| 4b | `zustand` | Zustand (Wände/Boden) | `zustand` | Zustand | **übernehmen** · **optional** |
| 4c | `groesse` | Größe / Umfang | `groesse` | Größe | **übernehmen** · **optional** |
| 4d | `bad_ausstattung` | Bad-Ausstattung | `bad_ausstattung` | Bad-Ausstattung | **übernehmen** |
| 4e | `fachdetail_*` | Fachfragen (1 Screen/Frage) | `fachdetails` | Fachdetails | **kompakt**: alle aktiven Fragen in einer Card-Gruppe (nicht 1 Screen pro Frage) · **optional** je Frage |
| 4f | `projekt_*` | Ausbau/Umbau/Garten-Screens | `projekt_details` | Projekt-Details | **kompakt** gleiche Felder · bei `direktKomplex` → `beratung` |
| 5 | `trust_qualitaet` | Sauber übergeben… | — | — | **skip** |
| 6 | `kundentyp` | Für wen? | `kundentyp` | Kundentyp | **übernehmen** · **optional** wenn Kunde schon Typ hat |
| 7 | `ort` (+ Zeitraum) | Wo? · Wann Start? | `ort_zeitraum` | Ort & Zeitraum | **übernehmen** (PLZ oft aus Kunde) · **optional** |
| 8 | `lead` | Kontaktdaten / Konto | — | (bereits in `crm_kontext`) | **skip** / schon erledigt |
| 9 | `loading` | Kalkulation | `preis` (intern) | — | unsichtbar |
| 10 | `result` | Preisrahmen | `preis` | Preisrahmen | **übernehmen** + manuell überschreibbar |
| — | `beratung-lead` | Beratung | `beratung` | Beratung / Rückruf | **übernehmen** wenn komplex |
| — | `ausserhalb` / `danke` | — | — | — | **skip** |

### CRM-Reihenfolge `erneuern` (Staff)

```
C0 crm_kontext
→ situation
→ bereiche
→ [zugaenglichkeit?] [zustand?] [bad_ausstattung?] [groesse?]   // conditional
→ fachdetails | projekt_details                                 // conditional, kompakt
→ kundentyp?                                                    // skip wenn bekannt
→ ort_zeitraum?
→ preis | beratung
→ C1 crm_pruefen
```

### Fachdetails `erneuern` — Website-IDs → CRM-Keys

| Website `fachdetail_*` | CRM-Feld / Key | Hinweis |
|------------------------|----------------|---------|
| `fachdetail_bad_was` (+ Folge) | `fachdetails.bad` (+ ggf. Sanitär-Lage) | Website feiner; CRM darf Folgefragen in Sub-Selects |
| `fachdetail_elektro_erneuern` (+ Folge) | `fachdetails.elektrik` | |
| `fachdetail_heizung_erneuern` → `…_ziel` → Anzahl/Öl | `fachdetails.heizung` | Folge kompakt unter einem Block |
| `fachdetail_maler_was` → Zustand | `fachdetails.waende` | |
| `fachdetail_boden_*` | `fachdetails.boden` | Reihenfolge Website: Details vor Größe — CRM: beides in einer Step-Gruppe |
| `fachdetail_dach_vorhaben` → Alter | `fachdetails.dach` | |
| `fachdetail_fassade_art` | `fachdetails.fassade` | |
| `fachdetail_fenster_erneuern` | `fachdetails.fenster` | |

Projekt-Bereiche (kein klassisches Fachdetail):

| Website | CRM-Step | Felder |
|---------|----------|--------|
| `projekt_ausbau_rohbau` → Deckenhöhe → `groesse` | `projekt_details` | rohbau, deckenhoehe, groesse |
| `projekt_durchbruch_*` | `projekt_details` | anzahl, statik |
| `projekt_garten_*` | `projekt_details` / `beratung` | leistung → ggf. Beratung |

---

## 2. Situation `betreuung`

| # | Website Screen-ID | CRM-Step-ID | Aktion |
|---|-------------------|-------------|--------|
| 1 | `trust_intro` | — | **skip** |
| 2 | `situation` | `situation` | **übernehmen** |
| 3 | `bereiche` | `bereiche` | **übernehmen** (garten, baum, winter→`winterdienst`, reinigung, hausmeister) |
| 4 | `umfang` | `umfang` | **übernehmen** (CRM neu: in `funnel_daten.umfang` speichern; Form hatte kein Feld) · **optional** bei purem Baum skip |
| 5 | `groesse` | `groesse` | **übernehmen** · skip bei purem Hausmeister |
| 6 | `fachdetail_garten_*` | `fachdetails` | **kompakt** |
| 7 | `trust_preis` | — | **skip** |
| 8 | `kundentyp` | `kundentyp` | **übernehmen** (inkl. HV) |
| 9 | ~~`ort`~~ | — | Website skippt PLZ — CRM: PLZ aus Kunde, kein Pflicht-Step |
| 10 | `lead` → `result` | `preis` → `crm_pruefen` | **ersetzen** |

### CRM-Reihenfolge `betreuung`

```
C0 → situation → bereiche → umfang? → groesse? → fachdetails? → kundentyp? → preis → C1
```

---

## 3. Situation `kaputt` — Reparatur & Notfall

| # | Website Screen-ID | CRM-Step-ID | Aktion |
|---|-------------------|-------------|--------|
| 1 | ~~trust~~ | — | **skip** (Website schon ohne Trust) |
| 2 | `situation` | `situation` | **übernehmen** |
| 3 | `bereiche` | `bereiche` | **übernehmen** |
| 4 | `fachdetail_*` | `fachdetails` | **kompakt** · **optional** |
| 5 | `zeitpunkt` (Dringlichkeit) | `dringlichkeit` | **übernehmen** (`sofort` \| `diese_woche` \| `flexibel`) |
| 6 | `kundentyp` | `kundentyp` | **übernehmen** |
| 7 | `ort` (ohne Zeitraum) | `ort` | **übernehmen** leicht · PLZ aus Kunde |
| 8 | `lead` → `result` | `preis` → `crm_pruefen` | **ersetzen** |

Sonderfälle → CRM-Step `beratung`:
- Schimmel (`direktKomplex`)
- Baum-Notfall (oft Beratung)
- Sanitär Lage Wand (Diagnose / wenig Screens)

### CRM-Reihenfolge `kaputt`

```
C0 → situation → bereiche → fachdetails? → dringlichkeit → kundentyp? → ort? → preis|beratung → C1
```

---

## 4. Situation `gewerbe`

| # | Website Screen-ID | CRM-Step-ID | Aktion |
|---|-------------------|-------------|--------|
| 1 | `situation` | `situation` | **übernehmen** |
| 2 | `beratung-lead` (B2B) | `beratung` | **übernehmen** — Kurzform: Beschreibung + Kontakt schon in C0 |
| — | Preisrechner | — | **skip** |

### CRM-Reihenfolge `gewerbe`

```
C0 → situation → beratung (Freitext Bedarf) → C1
```

Optional später: `gew_beschreibung` als eigenes Feld (Config existiert, Website nutzt es in Sequenz nicht).

---

## 5. CRM-Step-Katalog (kanonische IDs)

| CRM-Step-ID | Pflicht? | Speichert in |
|-------------|----------|--------------|
| `crm_kontext` | ja | Kunde, kanal, objekt, melder, interneNotiz |
| `situation` | ja | `leads.situation` |
| `bereiche` | ja* | `leads.bereiche` (*außer gewerbe) |
| `umfang` | bedingt | `funnel_daten.umfang` |
| `zugaenglichkeit` | bedingt | `funnel_daten` / Lead |
| `zustand` | bedingt | `funnel_daten` |
| `groesse` | bedingt | `funnel_daten.groessen` |
| `bad_ausstattung` | bedingt | `funnel_daten` |
| `fachdetails` | bedingt | `funnel_daten.fachdetails` |
| `projekt_details` | bedingt | `funnel_daten.projekt` |
| `dringlichkeit` | bedingt (kaputt) | `funnel_daten` / zeitraum-kaputt |
| `kundentyp` | optional | `leads.kundentyp` |
| `ort` / `ort_zeitraum` | optional | `plz`, `ort`, `zeitraum` |
| `preis` | ja* | `preis_min`/`preis_max`, `funnel_daten.breakdown` (*außer Beratung) |
| `beratung` | Altpfad | `funnel_daten.preis_modus=komplex` o.ä. |
| `crm_pruefen` | ja | Submit `createAnfrage` |

`funnel_quelle`: `'crm_staff_funnel'`

---

## 6. Branching (CRM = Website-Regeln)

| Regel | Verhalten CRM |
|-------|----------------|
| `direktKomplex` / Schimmel / Anbau / Garten-Planung / Baum-Notfall | → `beratung`, kein `preis` |
| Dach/Boden erneuern | Fachdetails vor Größe in derselben Step-Gruppe ok |
| Elektrik erneuern | `groesse` skip |
| Betreuung nur Baum | `umfang` skip |
| Betreuung nur Hausmeister | `groesse` skip |
| Kaputt | kein `groesse`/`umfang`/`zustand` |
| Gewerbe | kein `bereiche`/`preis` |

---

## 7. Mapping vs. heutiges `AnfrageNeuForm`

| CRM-Form heute | Staff-Funnel-Step |
|----------------|-------------------|
| Kontaktblock | `crm_kontext` |
| Situation / Bereiche / … alles auf einer Seite | auf Steps aufteilen (Tabelle oben) |
| `budgetMin`/`budgetMax` | `preis` (vorgefüllt aus Engine, editierbar) |
| `freitext` / `interneNotiz` | `crm_kontext` + optional `crm_pruefen` |
| `istBauprojekt` | `crm_pruefen` oder `projekt_details` |
| flache Fachdetail-Selects | bleiben Keys; UI = kompakte Gruppe statt Website-Einzelscreens |
| — | neu: `umfang` für Betreuung |

---

## 8. MVP-Schnitt (was zuerst bauen)

**MVP-Steps nur:**
`crm_kontext` → `situation` → `bereiche` → `fachdetails` (kompakt, optional) → `ort_zeitraum` (optional) → `preis` → `crm_pruefen`

**MVP-Situationen:** `erneuern` + `kaputt` zuerst; `betreuung` + `gewerbe` in V2.

**MVP skip:** alle `trust_*`, Portal-Lead, Projekt-Ausbau-Feinschliff, Foto-Upload.

---

## 9. Screen-Budget (Telefon)

| Pfad | Ziel max. Klicks Staff |
|------|-------------------------|
| erneuern Standard | 6–8 (inkl. C0/C1) |
| kaputt | 5–7 |
| betreuung | 5–7 |
| gewerbe | 3–4 |

Jeder Core-Step: **eine primäre Frage + Weiter + „Weiß ich nicht“**.
