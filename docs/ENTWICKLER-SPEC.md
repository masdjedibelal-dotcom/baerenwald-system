# Bärenwald CRM — Entwickler-Briefing (Build-Spec)

Ziel dieses Dokuments: Ein Programmierer soll damit das **produktive CRM** aus dem HTML-Mockup
bauen können — ohne Rückfragen. Es beschreibt **was** gebaut wird (Domäne, Screens, Regeln),
nicht nur wie der Prototyp aufgebaut ist. Der Prototyp (`Baerenwald CRM (standalone) (2).html`)
ist die **verbindliche Referenz für UI, Layout und Interaktion** — bei Zweifeln gilt: „so wie im Mockup",
**außer** wo §2.1 und §0 ausdrücklich abweichen.

Ergänzend: `KOMPONENTEN.md` im Mock-Ordner (Architektur & Komponenten-Details des Prototyps).

**Bei Widerspruch zwischen Mockup und diesem Dokument gilt §0 und §2.1 „Verbindliche Domänenregeln".**

**Umsetzungsreihenfolge (Session-Stops):** [CRM_TRACK.md](./CRM_TRACK.md) — einzige Reihenfolge für CRM-Arbeit.

---

## 0. Freigaben & Umsetzungsreihenfolge (Stand Jul 2026)

### Freigegebener Scope

| Paket | Inhalt | Status |
|-------|--------|--------|
| **A** | Checkout grün, Design-Tokens, Shell, PosBoard v1 | freigegeben |
| **B** | `resolveVorgang()` + 6 Fixtures + `/vorgaenge` (Wave 1 Liste) | freigegeben |
| **C — CRM** | EntityDetailLayout + Detail-Migration | nach Fixture-Abnahme |
| **C — Portal** | `handwerks-plattform`: Wave 1 **read-only** (Resolver konsumieren, kein Listen-UI-Rewrite) | nach Fixture-Abnahme |
| **D** | Wave 2 Journey (Objekt-Regeln, Auto-Angebot, Abschluss, Paketversand, Abschläge, …) + Kalender | nicht in diesem Sprint |

**Testdaten-Cleanup** (`cleanup-test-vorgaenge.sql`): für diesen Sprint **nicht erforderlich**.

### Verbindliche Reihenfolge (Stopp-Punkte)

Siehe [CRM_TRACK.md](./CRM_TRACK.md). Kurz:

1. **Schritt 0 — Spec-Patch** (7 Punkte unten) — Diff zeigen, **Stopp**.
2. **Schritt 1 — Checkout-Audit** — fehlende/kaputte Module, Build, Env-Check; **Stopp**.
3. **Schritt 2 — `resolveVorgang()` + Fixtures** — Shared-JSON aus Portal-Repo, Testlauf; **Stopp**.
4. **Phase A–D** — Mockup-Umbau gemäß [CRM_TRACK.md](./CRM_TRACK.md).

### Schritt 0 — Spec-Patch (7 verbindliche Punkte)

| # | Regel | Spec-Anker |
|---|--------|------------|
| 1 | **Resolver kanonisch** — Phase, Unterstatus, NeedsAction nur aus `resolveVorgang()`, nie aus `vorgang_phase` | §2.1 Regel 1 |
| 2 | **Vorgänge-Liste** — keine NeedsAction-Spalte, keine Kontext-Badges; Resolver-Badges (`notfall`, `wartet_freigabe`) **nur im Detail-Header** (StatusBadge/Banner), nicht in der Tabelle; Sortierung **letzte Aktivität** (`updated_at` absteigend) | §0, §2.1 Regel 2, §8 |
| 3 | **Lead-Unterstatus** in Phase Anfrage nur: `neu` · `kontaktiert` · `termin` · `abgebrochen` | §2.1 Regel 3 |
| 4 | **Auftrag** — nur `auftraege.status`; Mock-Feld `phase (planung\|arbeit\|abnahme)` **entfällt** | §2.1 Regel 4 |
| 5 | **Rechnung** — Status `entwurf` · `gesendet` · `bezahlt` · `storniert`; **kein** Status `ueberfaellig` — Mahn-/Überfällig-Badge aus `faellig` + Events | §2.1 Regel 5 |
| 6 | **Detail §3** — Auftrag-Tabs **Zahlplan** und **Bautagebuch**; Mock-Altstatuswerte **nicht** übernehmen (siehe §0) | §3, §5 |
| 7 | **Angebot** — `status_einfach`: `entwurf` → `gesendet` → `angenommen` / `abgelehnt` + `abgelaufen` / `ersetzt`; Alt-Werte nur Mapping | §5 |

### Mock-Abweichungen (explizit ignorieren)

Im Mock `(2)` **nicht** in die Produkt-Liste übernehmen:

- Spalte **„Aktion"** / `act-badge` / `ACTOR_LABEL` in der Tabelle
- Filter-Chip **„Aktion nötig"** (`onlyAction`)
- **`ContextBadges`** in der **Vorgänge-Liste** (Notfall / Wartet Freigabe / Kanal als Listen-Badges)
- **Alt-Statuswerte** aus Mock/`data.jsx`: Angebot `gesendet_hw`, `hw_akzeptiert`, `gesendet_kunde`, `kunde_akzeptiert`; Rechnung `ueberfaellig` als DB-Status; Auftrag `phase` (planung/arbeit/abnahme); Lead `angebot`/`auftrag`/`abgeschlossen` als Listen-Unterstatus

**Produkt-Liste Wave 1** zeigt nur: **Phase · Unterstatus · Titel · Meta** (Meta = Datum, optional Wert, Kanal als Textzeile — kein Badge-Strip).

`NeedsAction`, `actor`, Notfall- und Freigabe-Hinweise: im **Resolver-Output** und **nur im Detail-Header** (StatusBadge, Banner, CTA, Blockaden) — **nicht** als Listen-Spalten oder Listen-Badges.

---

## 1. Was ist das Produkt

Bärenwald ist ein **Handwerks-Vermittler**: nimmt Kunden-Anfragen entgegen, erstellt Angebote,
vermittelt geprüfte Handwerker, wickelt Aufträge ab und stellt Rechnungen. Das CRM bildet
diesen kompletten Fluss ab:

```
Anfrage ──► Angebot ──► Auftrag ──► Rechnung
   (Lead)   (Kalkulation)  (Ausführung)  (Faktura)
```

Dazu Stammdaten (Kunden, Handwerker, Partner) und Planung (Kalender — siehe §2.1, Umsetzung Phase D).

**Stack (produktiv):** Next.js (App Router) + TypeScript + Postgres/Supabase + CSS-Variablen wie im Mockup.

**Portal-Projekt (separates Repo):** `handwerks-plattform` — Kunde/HV (`/portal`), Handwerker (`/partner`), Mieter (`/melden`). Wave 1: nur Resolver-Anbindung read-only (§0).

---

## 2. Navigation (verbindliches Schema)

Sidebar, gruppiert:

- **Arbeit:** Dashboard · Vorgänge · Kalender *(Kalender: Phase D, blockiert Journey nicht)*
- **Stammdaten:** Kunden · Handwerker · Partner *(Objekte über Kundenakte / Objekt-Detail, nicht zwingend eigener Nav-Punkt)*
- **System:** Einstellungen

**Vorgänge** ist die zentrale Liste. Sie enthält alle vier Phasen (Anfrage, Angebot, Auftrag,
Rechnung) in EINER Tabelle, per Chip-Leiste filterbar (Alle · Anfrage · Angebot · Auftrag · Rechnung).
Die vier Phasen sind kein eigener Menüpunkt — sie sind Filter derselben Liste.

Alte Routen `/anfragen`, `/angebote`, `/auftraege`, `/rechnungen` (Listen): Redirect oder Deprecation-Hinweis auf `/vorgaenge?phase=…`.

Mobil: Bottom-Nav mit Dashboard · Vorgänge · Kalender + „Mehr". Sidebar wird zum Overlay-Drawer.

---

## 2.1 Verbindliche Domänenregeln (Resolver & Status)

Diese Regeln gelten für **produktives CRM + Portale**. Sie überschreiben Mockup-Annahmen in `data.jsx` / alten DB-Feldern.

### 1) Resolver ist kanonisch

**Phase, Unterstatus und NeedsAction** werden im CRM **ausschließlich** aus `resolveVorgang()`
abgeleitet — nie aus `vorgang_phase`.

- `vorgang_phase` ist **Portal-Sync / Lifecycle-Feld** (wird bei Übergängen gesetzt, von Portalen gelesen).
- `leads.status`, `angebote.status_einfach`, `auftraege.status`, `rechnungen.status` sind **Rohdaten** für die Ableitung.

**Priorität Phase:** Rechnung → Auftrag → Angebot → Anfrage (Storno-Regeln siehe unten).

**Portal Wave 1:** `resolveVorgangDisplay(input, role)` mappt Resolver-Output auf rollenspezifische Labels (read-only, keine Portal-UI-Änderung bis Fixture-Abnahme).

### 2) Vorgänge-Liste: Spalten (UI) vs. Resolver (Logik)

**Listen-UI (Wave 1, verbindlich):**

| Spalte | Inhalt |
|--------|--------|
| **Phase** | Anfrage · Angebot · Auftrag · Rechnung |
| **Unterstatus** | Ein Wert aus der Phase-Quelle (siehe §5) |
| **Titel** | Situation — Gewerk — Objekt/Ort (bei HV: kein Kundenname als Haupttitel) |
| **Meta** | Datum · optional Wert · Kanal als Klartext (z. B. „HV-Meldung", „Direktkunde") — **keine Badge-Leiste** |

**Resolver-Output (intern + Detail + Portal read-only, nicht als Listen-Spalten in Wave 1):**

| Feld | Inhalt |
|------|--------|
| `needsAction` | boolean |
| `actor` | `freigabe` · `handwerker` · `kunde` · `bw` · null |
| `badges` | optional: `notfall`, `wartet_freigabe` (strikt `org_freigabe_status = ausstehend`) |

**Actor-Priorität** (nur ein Wert): `freigabe` > `handwerker` > `kunde` > `bw`.

Badge **„Notfall"** wenn `hv_meldung_status = notmassnahme` (auch in Phase Anfrage) → typisch `needsAction` + `actor = bw`.

### 3) Lead-Status in Listen nur Anfrage-Werte

In der Vorgänge-Liste (Phase **Anfrage**) gilt als Unterstatus **nur**:

`neu` · `kontaktiert` · `termin` · `abgebrochen` (Anzeige: Verloren)

**Nicht** als Listen-Unterstatus: `angebot`, `auftrag`, `abgeschlossen` am Lead — diese Phasen
werden über die Existenz von Angebot/Auftrag/Rechnung abgeleitet.

### 4) Auftrag: nur `auftraege.status`

Unterstatus in Phase **Auftrag** = ausschließlich `auftraege.status`:

`offen` · `in_arbeit` · `abnahme` · `abgeschlossen` · `storniert`

Das Mock-Feld **`phase (planung|arbeit|abnahme)` entfällt als Datenfeld.**

**NeedsAction (HW/Kunde)** läuft **nicht** über Unterstatus, sondern über Resolver (`needsAction` + `actor`).

Der **AuftragPositionPipelineStepper** entfällt **visuell und logisch** — HW-Zustand lebt am PosBoard pro Zeile.

### 5) Rechnung: DB-Naming

Statuswerte = DB-Werte:

`entwurf` → `gesendet` → `bezahlt` (+ `storniert`)

- UI-Label „Gesendet", **nicht** „Versendet".
- **`ueberfaellig` ist kein Status** — Hinweis „Überfällig" / Mahnung aus `faellig`-Datum + Events.

---

### Storno-Regeln (Resolver)

- Storno-Ausschluss: Eine **neuere nicht-stornierte** Entität desselben Typs gewinnt (z. B. Ersatzrechnung).
- Sind **alle** Entitäten eines Typs storniert, zählt die neueste trotzdem für die Phase, Unterstatus **Storniert**.
- Bei storniertem Vorgang: **needsAction = false** — Reaktivierung ist manuelle Aktion.

### Parallel-Handwerker

Mehrere Handwerker können parallel angefragt werden. **Bei Annahme durch einen:**

- übrige Anfragen werden **automatisch beendet**,
- im **Verlauf** als „nicht gewählt" protokolliert,
- kein manueller Aufräumschritt.

### Kalender

Kalender-Screen ist **Phase D**. Blockiert Wave 1 nicht.

---

## 3. Einheitliches Detail-Schema (gilt für ALLE Entitäten)

Jede Entität — **Anfrage, Angebot, Auftrag, Rechnung, Kunde, Handwerker, Partner** — hat
denselben Detail-Aufbau (Tab-Navigation links, Inhalt rechts):

| Tab | Inhalt |
|---|---|
| **Stammdaten** | Kontakt-/Basisdaten. Bei Vorgängen: **Kunden-Stammdaten** + bei HV-Meldung **Org-Kontext-Block** (Verwaltung, Objekt, Einheit, Melder). |
| **Details** | Projekt-Übersicht + **PosBoard** (§6). |
| **Verlauf** | Chronologische Timeline (inkl. „nicht gewählt" bei Parallel-HW). |
| **Dokumente** | Datei-/Foto-Liste mit Freigabe-Flag fürs Portal. |
| **Notizen** | Interne Notizen. |

Zusätzliche, entitätsspezifische Tabs:

- **Kunde/Handwerker/Partner:** erster Tab „Übersicht" (Kennzahlen-Karten).
- **Auftrag:** **Zahlplan** (Abschläge, Fortschritt) · **Bautagebuch** (Einträge/Fotos; Mock-Referenz).

**Detail-Header:** Breadcrumb „← Zurück zu den Vorgängen · {Phase} › {Titel}". Grüner CTA phasenabhängig (§5). Resolver-Badges (`notfall`, `wartet_freigabe`, Mahn-Hinweis) und `needsAction` / `actor` **nur hier** (StatusBadge-Zeile, Banner, CTA) — **nicht** in der Vorgänge-Liste.

---

## 4. Datenmodell

IDs sind fachliche Kennungen (`L-2024-0142`, `AN-2026-0084`, `AU-2024-0042`, `RE-2026-0142`,
`C-001`, `T-01`, `P-01`). Beträge in Euro.

**Anfrage (Lead)** — Listen-Unterstatus: nur §2.1 Regel 3.

**Angebot** — `status_einfach` (§5). Kein HW-Status im Angebot.

**Auftrag** — `status` (§5), `gewerke[]`, `zahlplan[]`. Kein separates `phase`-Feld.

**Rechnung** — `status` (§5), `faellig` für Überfällig-Hinweis.

**Position (PosBoard):** `handwerkerId`, `hwStatus`, `verhandlungspreis` am Auftrag.

Vollständige Feldlisten: siehe Mock `data.jsx` / frühere Spec-Version; Resolver-Felder §2.1 haben Vorrang.

---

## 5. Statusflüsse & phasenabhängige Aktionen

### Angebot — vereinfachter Prozess

**Unterstatus:** `status_einfach` — `entwurf` · `gesendet` · `angenommen` · `abgelehnt` · `abgelaufen` · `ersetzt`

**Entfallen:** `gesendet_hw`, `hw_akzeptiert`, `gesendet_kunde`, `kunde_akzeptiert` (nur Alt-Mapping).

### Auftrag / Rechnung

Siehe §2.1 Regeln 4 und 5.

### CTA je Phase

- **Anfrage:** „Angebot erstellen"
- **Angebot:** „Angebot annehmen" · PDF · erneut versenden
- **Auftrag:** „Auftrag abschließen" → „Rechnung erstellen"
- **Rechnung:** „Als bezahlt markieren" · PDF · erneut versenden

Einheitliches ⋯-Menü: Bearbeiten, Kopieren, Löschen, Kontakt, Portal-Link. **Kein** „Öffnen".

---

## 6. PosBoard

Eine wiederverwendete Komponente für Anfrage, Angebot, Auftrag, Wizards, Einstellungen.

- Nach **Gewerk** gruppiert; Spalten: Bezeichnung · Menge · Preis · Summe · ⋯
- Auftrag: **HW-Status-Badge** pro Zeile; **Handwerker-Zuweisen-Modal**; Parallel-HW über `HwAntwortenModal`-Logik (Mock-Referenz)
- Bulk „Handwerker zuweisen" nur im Auftrag

---

## 7. Wizards

Gemeinsame `WizardShell` + PosBoard:

- **Angebot:** 3 Schritte (Positionen → Finalisieren → Versenden)
- **Rechnung:** 3 Schritte im Mock (Positionen → Zahlplan → Paket & Versand); produktiv mindestens Positionen + Versand; Zahlplan/Paket = Phase D wenn nicht in B

---

## 8. Listen (einheitlich)

### Vorgänge-Liste (zentral, Wave 1)

- **KPI-Karten:** Neue Anfragen · Offene Angebote · Aktive Aufträge · Offene Rechnungen
- **Chip-Leiste:** Alle · Anfrage · Angebot · Auftrag · Rechnung
- **Spalten (UI):** Phase · Unterstatus · Titel · Meta — **§0 Mock-Abweichungen beachten**
- **Filter:** Phase, Unterstatus (pro Phase), Volltext; **kein** „Aktion nötig"-Chip aus dem Mock
- **Sortierung:** **letzte Aktivität** absteigend (`updated_at` der führenden Entität bzw. letzter Timeline-Eintrag — kein Sort nach `needsAction` in Wave 1)

### Weitere Listen

Unverändert: KPI-Karten, Filter, Pagination, Status-Badges farbig (Stammdaten-Listen).

---

## 9. Weitere Screens

Dashboard, Einstellungen, globale Suche (⌘K). Kalender = Phase D.

**Objekt-Einstellungen HV** (Autopass, Schwelle, Notfall): Mock `FreigabeRegelnEditor` — Phase D, sofern nicht in B nachgezogen.

---

## 10. Design-Tokens

`:root` aus Mock `styles.css` — `--green:#2E7D52`. Tabler-Icons. 1:1 aus Mock `(2)` wo nicht §0 widerspricht.

---

## 11. Persistenz & Tests

**Resolver:** `src/lib/vorgang/resolve-vorgang.ts` — `resolveVorgang(input): ResolvedVorgang`

**Fixtures (Single Source of Truth):** `shared/crm-vorgang/resolve-vorgang.fixtures.json` — byte-identisch mit `handwerks-plattform/shared/crm-vorgang/`. CRM-Tests laden die JSON (Schritt 2); `src/lib/vorgang/fixtures.ts` ist Übergang/Generator bis zur JSON-Migration.

**6 Referenz-Fixtures** (Unit-Tests, vor UI):

| # | Szenario | Erwartung (Kurz) |
|---|----------|------------------|
| 1 | HV-Meldung Notfall, Phase Anfrage | `badges.notfall`, `actor=bw`, `needsAction=true` |
| 2 | `org_freigabe_status=ausstehend` | `badges.wartet_freigabe`, `actor=freigabe` |
| 3 | Auftrag, HW-Anfrage offen | `actor=handwerker`, `needsAction=true` |
| 4 | Angebot gesendet, Kunde muss | `actor=kunde` |
| 5 | Rechnung gesendet, fällig überschritten | Phase Rechnung, Unterstatus `gesendet`, Überfällig-Hinweis separat |
| 6 | Alle Angebote storniert, Lead bleibt | Phase Anfrage, Unterstatus Storniert, `needsAction=false` |

**Portal read-only (Wave 1):** gleiche Fixtures über `resolveVorgangDisplay` — keine Portal-Listen-Umbauten bis Abnahme.

---

## 12. Abnahme-Kriterien (Definition of Done — Paket A+B)

1. Build/Checkout-Audit dokumentiert, `npm run build` grün.
2. `resolveVorgang()` — 6 Fixtures grün, **keine** UI-Regression in alten Details.
3. **Vorgänge-Liste:** Spalten **Phase · Unterstatus · Titel · Meta**; **keine** Mock-Aktion-Spalte/Badges in der Liste.
4. Chip-Filter alle 4 Phasen; alte Listen-Nav deprecated.
5. Resolver-Output (`needsAction`, `actor`) im **Detail** sichtbar (Banner/CTA), nicht in Listen-Spalten.
6. PosBoard v1 in mindestens Anfrage-Detail nutzbar (Paket A Restpunkt).
7. Keine Konsolenfehler auf `/vorgaenge`.

**Nach Abnahme (Paket C):** Detail-Migration alle Entitäten, Portal `resolveVorgangDisplay` read-only live.

---

## 13. Umsetzungsphasen (Kurz)

Vollständige Reihenfolge: [CRM_TRACK.md](./CRM_TRACK.md).

| Phase | Inhalt | Status |
|-------|--------|--------|
| **A** | Konditionen / Anfragen bis „übernommen“ (Shell, Tokens, PosBoard v1) | freigegeben |
| **B** | Angebot → Auftrag (`resolveVorgang`, `/vorgaenge`, KPI/Chips) | freigegeben |
| **C** | Nachreichung (EntityDetailLayout, Detail-Migration, Portal read-only) | freigegeben |
| **D** | HV-Support & Erweiterungen — siehe [CRM_TRACK.md § Phase D](./CRM_TRACK.md#phase-d--ehem-5-punkte-liste-einsortiert) | backlog |

### Phase D — CRM-Einträge (kein paralleler Plan)

| ID | Thema | CRM-Fokus |
|----|--------|-----------|
| **D1** | Objekte / `melde_slug`, Melde-Links | CRM-Parität zu Portal (Objekte, QR optional) |
| **D2** | Organisation-Tab, Freigabe-Regeln | `KundenOrganisationTab`, `FreigabeRegelnEditor` |
| **D3** | Anfragen-Filter + HV-Kontext-Blöcke | Filter, `LeadOrgKontextBlock` |
| **D4** | Freigabe-Workflow + Partner-Gate | `send-handwerker-anfrage`, Org-Freigabe prüfen |
| **D5** | E-Mail-Templates CRM | Org-Einladung, Freigabe-Mails (M9, …) |

Kalender, PosBoard v2, WizardShell, Auto-Angebot: Journey-Erweiterungen innerhalb Phase D / Wave 2 — nicht vor Abschluss A–C.
