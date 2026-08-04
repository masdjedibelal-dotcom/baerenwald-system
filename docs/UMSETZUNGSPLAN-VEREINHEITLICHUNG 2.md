# Umsetzungsplan — Vereinheitlichung UX/UI

**Stand:** Juli 2026  
**Ziel:** Eine App-Sprache — nicht „jedes Modul anders“.  
**Vorarbeit erledigt:** Surface-Kit S-0…S-6 (EditorSheet · DocumentCanvas · PickerSheet · Drill-Down · `/neu`-Host).  
**SoT:** [SURFACE-KONSOLIDIERUNG](./SURFACE-KONSOLIDIERUNG.md) · [AUDIT-TODOS](./AUDIT-TODOS.md) · [FLOW-KATALOG](./FLOW-KATALOG.md) · [ENTSCHEIDUNGSLOG](./ENTSCHEIDUNGSLOG.md)

---

## Zielbild (eine Regel für alles)

| Job | Surface | Mobile | Desktop |
|-----|---------|--------|---------|
| Dokument erstellen/bearbeiten (AG, RE, später Abnahme) | **DocumentCanvas** | Fullscreen | Fullscreen |
| Entity anlegen/ändern · Subtask | **EditorSheet** | Bottom Sheet | Slide-over (Detail) / Center (aus Canvas) |
| Etwas aus Liste wählen | **PickerSheet** | Bottom Sheet | Center/Slide |
| Aktion wählen (≤7) | **ActionSheet** | Bottom | Menü/Sheet |
| Leichte Stammdaten am Detail | **Inline** (Stift/Section) | — | — |
| Filter in Listen | Sheet/Modal ok | — | — |
| Preview / Confirm / PDF | Modal ok | — | — |

**Verboten als Parallel-Wahrheit:** zweites Fullpage-Formular neben Sheet · WizardShell neben Canvas für denselben Job · ⋯ im ⋯ · Primary nur im ⋯.

---

## Priorisierte Phasen

Nicht parallel alles anfassen. Reihenfolge = „Unterschiedlichkeit spürbar reduzieren“ zuerst, Polish später.

```
P0 Geld + Kette  →  P1 Eine Surface-Sprache  →  P2 Orientierung Detail
      →  P3 Alltag  →  P4 Polish / Admin
```

---

### P0 · Vertrauen & Kette (1–2 Sprints) — ohne das fühlt sich nichts „fertig“ an

| # | ID | Was | Warum zuerst |
|---|-----|-----|--------------|
| 0.1 | **ZP-01** | Schluss/Abschlag: keine Doppelabrechnung; Warnung Σ RE > VK | Geld falsch = UX egal |
| 0.2 | **W1-03** | Angebot ablehnen (UI + Grund) | Pipeline schließt |
| 0.3 | **W1-04** | Auftrag stornieren (UI) | Parallel zu Ablehnen |
| 0.4 | **W1-01** | Angebot: ein Primary + Versand-Banner konsistent | „Was tippe ich?“ |
| 0.5 | **W1-02** | Partner-CTA + Naming „Partner“ am Angebot | Kette AG→Partner |

**Done P0:** Jeder Vorgangs-Status hat eine klare Exit-Aktion; keine stillen Geld-Fallen.

---

### P1 · Eine Surface-Sprache (2–3 Sprints) — „nicht alles unterschiedlich“

Kern: **alles Create/Edit → EditorSheet/PickerSheet; Dokument-Flows → Canvas; keine WizardShell-Parallelwelt.**

| # | ID | Was | Abnahme |
|---|-----|-----|---------|
| 1.1 | **W9-01/02** | **Abnahme:** 1 Canvas/Wizard ≤3 Steps; Inline/FillFlow löschen oder mergen | Ein Einstieg „Abnahme“ |
| 1.2 | Rest-Modals A | Position **neu**, Leistung-Detail, Zuweisung → EditorSheet/Picker | Symmetrie Edit=Neu |
| 1.3 | Rest-Modals B | Vor-Ort-Eintrag, PosBoard-Gewerk, Objekt Bewohner/Kontakt → EditorSheet | — |
| 1.4 | **W10** Teil | Staff-Funnel / Anfrage: WizardShell → gleiches Chrome wie AG (Canvas oder Sheet-Stack) | Kein zweites Wizard-Feeling |
| 1.5 | AG/RE | Chip-Steps → **eine Scroll-Seite** (Lexware) + Sheets nur für Subtasks | Kein Stepper-Feeling |
| 1.6 | **W9-03/06** | Vor-Ort Segmented; bei Status abnahme Primary = Abnahme | — |

**Stopp vor Löschung:** Alt-Komponente erst weg wenn 0 Imports + Entscheidungslog.

**Done P1:** Nutzer kann nicht mehr „zufällig“ in ein zentriertes Alt-Modal oder 7-Step-Wizard für denselben Job rutschen.

---

### P2 · Detail-Orientierung (1–2 Sprints) — „Wo bin ich, was ist der Job?“

| # | ID | Was |
|---|-----|-----|
| 2.1 | **W7-01** | Phasen-Strip (AN→AG→AU→RE) im Detail-Kopf verdrahten |
| 2.2 | **W7-02** | Status → Default-Tab + **ein** Primary |
| 2.3 | **W7-04** / #3 | Auftrag mobil: 5 Kern-Abschnitte + Mehr (Drill-Down-Liste kürzen) |
| 2.4 | **W4-01** | Eine Action-Bar; Listen-⋯ → ActionSheet (kein Desktop-Menü-Feeling mobil) |
| 2.5 | Header-SoT | Alle Details über `DetailActionsBar` (Kunde/Partner angleichen) |

**Done P2:** Jede Detailseite: Titel · 1 Status · 1 Primary · 1× ⋯ · klarer Ort in der Kette.

---

### P3 · Alltag nach Versand (1–2 Sprints)

| # | ID | Was |
|---|-----|-----|
| 3.1 | **W2-01** | My Work / Tages-Inbox |
| 3.2 | **W2-02/03** | Zone „Warten auf Kunde“ · Lifecycle in URL · ehrliche Back-Links |
| 3.3 | **W3** | Kunde-Vorgänge-Tab · Aktivität/Phasen-Labels |

**Done P3:** Nach Feierabend klar: was wartet auf mich vs. auf den Kunden.

---

### P4 · Polish & System (laufend / danach)

| # | ID | Was | Prio |
|---|-----|-----|------|
| 4.1 | **W8-01** | Breakpoint-SoT 768 überall | hoch |
| 4.2 | Verträge | Projekt-/Rahmenvertrag → Canvas/Shell wie AG | ✅ P5.4 |
| 4.3 | Admin/Settings | Modals → EditorSheet nur wenn Create/Edit | ✅ P5.5 (Kern) |
| 4.4 | Inline-Grenze | Stammdaten: Stift-Section ok; **kein** Pflicht-Click-jedes-Feld | mittel |
| 4.5 | W5/W6 Copy · Farben · Empty States | nach P0–P2 | niedrig |

**Nicht Ziel P4:** Jedes Feld im Detail sofort klickbar (überladen). Ziel = **vorhersehbar**: leichte Felder inline, schwere Jobs Sheet/Canvas.

---

## Was bewusst *nicht* parallel

| Parken | Grund |
|--------|--------|
| Designer-Mocks neu zeichnen | Kit + Spec reichen; Bau gegen SoT |
| Board-View / Split-View (W5-02) | Nice-to-have |
| Alle Preview-Modals „umbauen“ | Preview darf Modal bleiben |
| Voll-Merge Epics (W6-09) | eigenes Programm |

---

## Definition of Done — je Screen (Vereinheitlichung)

1. Create/Edit = **nur** EditorSheet/PickerSheet (Ausnahme: Preview/Confirm/Filter).  
2. Dokument-Job = **nur** DocumentCanvas (kein WizardShell daneben).  
3. Header: **1 Primary** sichtbar, nicht im ⋯.  
4. Mobile: Overlay = Bottom Sheet; Back schließt Overlay (S10).  
5. Dirty: Confirm (S8).  
6. Copy ≤ Budget (SURFACE-NUTZER-COPY).  
7. Belal: 2-Min-Smoke laut [SURFACE-ABNAHME-NUTZER](./SURFACE-ABNAHME-NUTZER.md) + Screen-Checkliste.

---

## Empfohlene Startreihenfolge (nächste 4 Arbeitspakete)

1. **ZP-01 + W1-03/04** (Geld + Schließen)  
2. **W9 Abnahme** (größte Surface-Lüge)  
3. **Rest-Create-Modals A/B** (Pos neu, Zuweisung, Vor-Ort, Objekt)  
4. **W7-01/02** (Phasen-Strip + Primary)

Danach: Chip-Steps→Scroll-Canvas · Funnel-Shell · My Work.

---

## Mapping auf alte Docs

| Dieses Doc | Ersetzt / priorisiert |
|------------|------------------------|
| P0 | AUDIT Welle 1 + ZP-01 |
| P1 | Surface-Rest + W9 + W10 + W11-Reste |
| P2 | W7 + W4 |
| P3 | W2 + W3 |
| P4 | W5 + W6 + W8 Polish |

Surface-Plan [UMSETZUNGSPLAN-SURFACE](./UMSETZUNGSPLAN-SURFACE.md) = **Kit-Historie (done)**.  
**Dieses Doc = ab hier der aktive Umsetzungsplan.**

---

## Umsetzung 2026-07-27 (Code)

| Phase | Status | Geliefert |
|-------|--------|-----------|
| **P0** | ✅ Kern | ZP-01 Gate `validateGestellteRechnungenGegenVk` + Wizard-Hard-Gate + UI-Warnung Zahlplan; Angebot **Ablehnen**-Modal; Auftrag **Stornieren**; Primary **Senden** / Partner; Partner-Section am Detail |
| **P1** | ✅ Kern | Abnahme → **DocumentCanvas**; Position neu / Zuweisung / Bewohner / Kontakt → EditorSheet; Abnahme-Primary am Auftrag |
| **P2** | ✅ Kern | **ProjektKette** in EntityDetailLayout; DetailActionsBar Kunde/Partner/HW; Back „Vorgänge“; Auftrag Primary Abnahme |
| **P3** | ✅ Kern | **MyWorkInbox** „Mein Tag“ am Dashboard; Lifecycle-Links |
| **P4** | ✅ Teil | Breakpoint-SoT 767 dokumentiert; Abnahme-Docs |
| **P5** | ✅ Kern | Abnahme ein Pfad; AG/RE Scroll-Canvas; Staff-Funnel Canvas; Verträge Canvas; Admin EditorSheet; My-Work Counts |

**Bewusst offen (nicht P5):** Preview/CSV-Modals; Lexware ohne „Weiter“-Gate; reichere My-Work-Feeds.

---

## Umsetzung 2026-07-27

P0–P5 Kern in diesem Slice-Strang.

### P0 — Vertrauen & Kette
- Ablehnen / Storno / Primary „Senden“ / Partner-CTA; ZP-01 Gate.

### P1 — Surface-Sprache
- Kit S-0…S-6; Abnahme DocumentCanvas; Rest-Create → EditorSheet.

### P2 — Detail-Orientierung
- **ProjektKette** · DetailActionsBar · Auftrag Primary Abnahme.

### P3 — Alltag
- **MyWorkInbox** · Lifecycle-Links · Back „Vorgänge“.

### P4 — Polish
- Breakpoint-SoT 767; Docs/Smoke.

### P5 — Delta schließen (**done 2026-07-27**)

| # | Was | Status |
|---|-----|--------|
| **P5.1** | Abnahme: FillFlow / Inline / FlowClient gelöscht → ein Pfad `/abnahme/erstellen` | ✅ |
| **P5.2** | AG/RE: alle Abschnitte auf einer Scroll-Seite; Chip → `scrollIntoView` | ✅ |
| **P5.3** | Staff-Funnel → **DocumentCanvas** (≤3 Phasen) | ✅ |
| **P5.4** | `ProjektVertragWizard` / `RahmenvertragWizard` → **DocumentCanvas** | ✅ |
| **P5.5** | Admin Create/Edit → **EditorSheet**: Benutzer, Vorlagen, Preisliste, Kalender-Termin, E-Mail-Templates; Preview/CSV bleiben Modal | ✅ |
| **P5.6** | `MyWorkInbox` Count-Badges + Docs/Smoke | ✅ |
