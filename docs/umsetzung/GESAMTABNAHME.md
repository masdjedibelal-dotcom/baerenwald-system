# Gesamtabnahme — Vorgänge Spec (Soll ↔ Ist)

**Zweck:** Abgleich für Design-Review (Mock/Spec vs. Live-CRM).  
**Repo:** `baerenwald-crm-dashboard` · **Stand:** 2026-07-28  
**Quellen:** `UMSETZUNGSKATALOG.md` · ENTWICKLER-SPEC · HTML-Mocks · `docs/umsetzung/PHASE-*.md`

> **Hinweis Durchklick:** Flows wurden per Code- und Abnahmeprotokoll belegt; kein vollständiger manuelles QA-Durchklick Desktop+Mobil in dieser Welle. Abweichungen unten sind die Review-Priorität.

---

## 1. Phasen-Übersicht

| Phase | Thema | Status | Commit(s) | Offene Punkte (Designer-relevant) |
|---|---|---|---|---|
| 0 | Datenmodell Spec-W2 | ✅ | `fe1b29e` | — (keine UI) |
| 1 | Status-Töne + Primary-CTA | ✅ | `c43c100` | Bewertung-einholen = Toast-Platzhalter |
| 2 | Sheet / Canvas, WizardShell weg | ✅ | `a567b32` | API heißt oft noch „Modal“, Layout = Sheet |
| 3 | Nav Handwerker / Organisation | ✅ | `aeb233e` | Kein Pixel-1:1, Struktur Spec §3 |
| 4 | Vorgänge-Liste | ✅ | `3edebd3` | Swipe kam in Phase 11 |
| 5a | Auftrag 5 Tabs | ✅ | `f87e859` | — |
| 5b | Anfrage/Angebot/Rechnung 5 Tabs | ✅ | `5a8b362` | Anfrage→Zahlung = Hinweisplatzhalter |
| 5c | WV / NextStep / QuickBar | ✅ | `a65a15f`, `233ea72` | — |
| 5d | Akte nur Dateien+Notizen | ✅ | `79e020f` | — |
| 6 | LeistungenTab + Drawer | ✅ | `57844ed`, `ccb999e` | Tagebuch-Button teils Toast; Spalten-⋯ fehlt |
| 7 | Zahlung + RateDrawer | ✅ | `977dce9` | Mahnung = bestehendes Mail-Modal |
| 8 | Abnahme-Canvas | ✅ | `549e61b` | Signatur = Ort/Datum, kein Pad |
| 9 | Regie + Notfall (nur Aufwand) | ✅ | `8e9ddb7` | Regie-Chip in Rechnung nur Text |
| 10 | Alltag + Dashboard „Meine Arbeit“ | ✅ | `7a3a6cc` | Nachtrag-Persistenz dünn |
| 11 | Typo/Combobox/Shortcuts/Swipe | ✅ | `0a8eff5` | Legacy-Schriftgrößen; Card-in-Card lückenhaft |
| 12 | PDF Aushang/Regie/BTB/Rechnung | ✅ | `2613bc1`, `82a2644` | PDF-UI-CTAs teilweise API-only |
| 13 | Löschliste | ✅ | `457e335` | Alias-Deep-Links → Leistungen |

Einzelprotokolle: `docs/umsetzung/PHASE-0.md` … `PHASE-13.md`.

---

## 2. Mock-Abgleich (Designer-Checkliste)

Prüfe je Screen: **Soll (Mock)** · **Ist (App)** · **Abweichung**.  
Empfohlen: Desktop **und** mobil.

### 2.1 Navigation & Shell

| Soll | Ist | Abweichung |
|---|---|---|
| Sidebar: Dashboard · Vorgänge · Kunden · Handwerker · Organisation | `SIDEBAR_NAV_GROUPS` so | Kein „Partner“-Nav |
| Bottom-Nav: 5 Items inkl. + | Dashboard · Vorgänge · + · Kunden · Mehr | Kalender unter Mehr |
| `/partner` → Handwerker | Redirect | Partner-Tabelle bleibt (Daten) |
| Dialoge = Sheet unten/rechts oder Document-Canvas | `EditorSheet` / `DocumentCanvas` | Manche Komponenten heißen noch Modal |

### 2.2 Vorgangsliste

| Soll | Ist | Abweichung |
|---|---|---|
| Liste (kein Board), Checkboxen, Spalten-Toggle | `VorgaengeListeClient` | — |
| Chip „Wartung & Pflege“ | Label exakt | Filter-Key intern `bestand` |
| Ketten / ersetzt durchgestrichen | Aggregate + Chip „ersetzt“ | — |
| Hover-Aktionen / Edge / Flash | CSS-Klassen Phase 4 | — |
| Mobil: Karten + Swipe | Gestapelte Rows + `SwipeRow` | Undo-Verhalten je Delete-Helper |

### 2.3 Detail — alle vier Typen

| Soll | Ist | Abweichung |
|---|---|---|
| 5 Tabs: Übersicht · Leistungen · Zahlung · Akte · Aktivität | Identisch, Default **Leistungen** | Anfrage-Zahlung = Platzhaltertext |
| Ein grüner Primary-CTA | `primaryCta` + `DetailActionsBar` | — |
| StatusBadge 4 Töne | `STATUS_TONE` / `StatusBadge` | — |
| WV-Chip (editierbar) | `WiedervorlageChip` | — |
| NextStepBar + QuickBar (mobil) | Header-Chrome | Portal-Zeile vorhanden |
| Akte nur Dateien + Notizen untereinander | `VorgangAkteTab` | Kein Segment Zahlung/Kunde |

**Wo klicken:** `/anfragen/[id]`, `/angebote/[id]`, `/auftraege/[id]`, `/rechnungen/[id]`.

### 2.4 Leistungen (Drawer)

| Soll | Ist | Abweichung |
|---|---|---|
| Tabelle + Drawer Sheet | `LeistungenTab` + `LeistungDrawer` | Spalten-⋯ Nutzer-Defaults fehlen |
| Regie-Kennzeichnung | Badge / Aufwand-only | — |
| Tagebuch aus Position | Button teils Toast | Voll-Editor Portal/Legacy |

### 2.5 Zahlung & RateDrawer

| Soll | Ist | Abweichung |
|---|---|---|
| Plan + RateDrawer | `VorgangZahlungTab` + `RateDrawer` | Rechnung-Detail: Link „Im Auftrag“ |
| Mahnung | `ZahlungserinnerungMailModal` | Kein Inline-only-Toast |

### 2.6 Abnahme-Canvas

| Soll | Ist | Abweichung |
|---|---|---|
| 3 Schritte Checkliste · Angaben · Prüfen & PDF | Document-Canvas-Flow | Signatur = Ort/Datum-Proxy |
| Kein Abschluss-Modal | entfernt (Phase 8/13) | — |

### 2.7 Dashboard

| Soll | Ist | Abweichung |
|---|---|---|
| „Meine Arbeit“ vor Charts | `MyWorkInbox` first | — |
| Aufträge ohne Fortschritt | Filter `letzte_aktivitaet` | — |

### 2.8 Feinschliff (§14)

| Soll | Ist | Abweichung |
|---|---|---|
| 4 Typo-Stufen 12 / 13.5 / 15 / 19 | Tokens `--fs-*` | Viele Legacy-`font-size` außerhalb Tokens |
| Card-Padding 20 / Gap 16 | `--sp-*` | Tailwind-Karten nicht alle |
| Combobox >15 Optionen | `Select` → Combobox | Kunden oft Picker-Sheet |
| Shortcuts ⌘K · ⌘J · n · ? · Esc | `GlobalShortcuts` | TopBar-Suche parallel zu ⌘K |
| `.shrunk` / `kb-open` | Detail-Header + body | Sticky-CTA-Selektoren unvollständig |

### 2.9 PDFs (§16)

| Soll | Ist | Einstieg |
|---|---|---|
| Aushang einseitig, QR, HV | `aushang-template` + API | `GET /api/objekte/[id]/aushang-pdf` |
| Regiebericht | gemeinsame Quelle Positions-Doku | `…/regiebericht-lebenszyklus` |
| Bautagebuch Tag→Position | gleiche Quelle | `…/bautagebuch-lebenszyklus` |
| Rechnung §35a / §13b | Flags im HTML-Template | Rechnungs-PDF-Route |

**Gap:** dedizierte „PDF drucken“-Buttons in der CRM-UI nicht überall verdrahtet (APIs da).

---

## 3. Durchklick-Protokoll (Code-Beleg)

| Flow | Status | Beleg / Hinweis |
|---|---|---|
| Anfrage → Angebot → Versand → Annehmen → Auftrag | ✅ Kern | Wizard + Accept; Primary-CTA-Matrix |
| Auftrag: HW anfragen → doku → Abnahme → abschließen | ⚠️ | Doku/Tagebuch teilweise Toast; Abnahme-Canvas da |
| Rechnung Einzel + Zahlplan → Versand → bezahlt | ✅ | Zahlung-Tab + Wizard; Schluss-PDF Restsumme |
| Angebot überarbeiten · Nachtrag · Korrektur · Gutschrift | ⚠️ | Nachtrag-Band da; Persistenz `nachtraege[]` dünn |
| Notfall-Direktauftrag | ✅ | nur Aufwand, kein Deckel |
| Duplikat zusammenführen | ✅ | `DuplikatBand` + `zusammengefuehrt_in` |
| Mahnung · Reklamation · WV | ⚠️ | WV editierbar; Mahnung = Mail-Modal |

---

## 4. Gesamt-Ist (Änderungsprotokoll)

### Neu / zentral
- Surfaces: `EditorSheet`, `DocumentCanvas`
- Detail: `DetailShell`, Header-Chrome (WV / NextStep / QuickBar)
- Leistungen / Zahlung / Abnahme: neue Tab-/Drawer-/Canvas-Komponenten
- PDF: Aushang, Regie-, Bautagebuch-Lebenszyklus-Templates + gemeinsame `loadBerichtDatenquelle`
- Tokens: `--fs-*`, `--sp-*`; Combobox, SwipeRow, GlobalShortcuts
- Migration: `20260901120000_vorgang_datenmodell_spec_w2.sql`

### Entfernt (Löschliste)
- Partner-CRM-UI · Board-Liste · Akte-Segmente · Tab „Vor Ort“ · Abschluss-Modal · Notfall-Deckel · Tagebuch-CRM-Tab · Legacy-Leistungs-/Zahlungs-Orphans (~6,8k LOC in Phase 13)

### Bewusst nicht umgesetzt
- Handwerker-Portal / Schicht-Gate (außerhalb Welle)
- Pixel-identische HTML-Mock-PDFs (Angleichung an Puppeteer-Pipeline)
- Vollständige Typo-Migration aller Legacy-px
- Signatur-Pad

---

## 5. Review-Priorität für den Designer

1. **Vorgangsliste** Desktop+Mobil (Chips, Ketten, Swipe, Empty)
2. **Alle 4 Detail-Typen × 5 Tabs** inkl. Header-Chrome und Primary-CTA
3. **Leistungs-Drawer** und **RateDrawer**
4. **Abnahme-Canvas** (3 Schritte)
5. **Dashboard „Meine Arbeit“**
6. **Typo/Spacing** Stichproben (Cards vs. Legacy-Buttons)
7. **PDF-Muster** Aushang / Regie / Bautagebuch / Rechnung mit §35a bzw. §13b

**Abnahmekriterien Gesamtabnahme:** Phasen 0–13 committed und protokolliert; Löschliste abgearbeitet; Nicht-löschen-Liste unangetastet; Migration angewendet. Offene Punkte = dokumentierte Gaps oben, keine stillen Spec-Lücken ohne Beleg.
