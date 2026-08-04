# Komponenten-Übersicht — Surfaces, Inhalt, Struktur, Typo

**Zweck:** Prüfen, dass **kein Overload** entsteht — was *darf* in welcher Komponente stehen, was nicht.  
**Stand:** Juli 2026 · **Designer-Freigabe** (Checkliste F bestanden; S7/S8 Pflicht) · SoT: [SURFACE-KONSOLIDIERUNG.md](./SURFACE-KONSOLIDIERUNG.md)

**Typo-Basis (CRM/Mock):**

| Token | Größe | Gewicht | Farbe | Verwendung |
|-------|-------|---------|-------|------------|
| Display / Canvas-Titel | **20px** semibold | semibold | `--text` | DocumentCanvas-Header |
| Vorgang-Titel (Detail) | **20px** semibold | semibold | `--text` | VorgangHeader (ein Wert, 0.6) |
| Section-Label | 11–12px | bold · uppercase · tracking | `--text-3` | `KUNDE`, `POSITIONEN` |
| Titel (Sheet/Step) | 17px | semibold | `--text` | Sheet-Header, FlowStepIntro |
| Body | 14–15px | regular | `--text` | Werte, Listenzeilen |
| Hint / Meta | 13px | regular | `--text-3` | Untertitel, „automatisch“ — default **weg** |
| Caption | 11–12px | regular | `--text-4` | IDs, Zeitstempel |
| Primary-Button | 14–15px | semibold | on-primary | **Nur Text-Button** in Primärfarbe (0.1); Icons zählen nicht |

**Anti-Overload-Regel:** Pro Surface **max. 1 Primary-Text-Button**. Icon-✓ / DocBar zählen nicht mit. Keine doppelten Titel für denselben Job. Section-Labels zählen **nicht** als Titel-Ebene (F3).

**F3:** ≤ **2 Titel-Ebenen für denselben Job**; Section-Labels (uppercase) zählen nicht.

**Konkrete Nutzer-Wörter & Gleichzeitigkeits-Budget:** [SURFACE-NUTZER-COPY.md](./SURFACE-NUTZER-COPY.md)

---

## A · Shells (Rahmen)

### A1 · `DocumentCanvas` *(neu / ersetzt WizardShell-Body für AG/RE)*

| | |
|--|--|
| **Ersetzt / ändert** | `WizardShell` Step-Body, teils `AppFlowScreen` für Dokument-Flows |
| **Job** | Ein Dokument erstellen/bearbeiten |

**Struktur (von oben nach unten):**

```
[ Header: X | Titel 20px | ✓ Speichern ]
[ DocActionBar sticky unten — **kein FAB** wenn Bar da ist (0.8) ]
────────
 Section-Label (uppercase)
 Inhalt der Sektion (Cards / DashedAdd / Liste)
────────
 Section-Label …
 …
[ Summenband ]
[ DocActionBar: Vorschau · Senden · … ]
```

**Inhalt — erlaubt:**

| Slot | Inhalt | Typo |
|------|--------|------|
| Header-Titel | „Angebot erstellen“ | **20px** semibold |
| Header ✓ | Speichern Entwurf | Icon + optional Label |
| Sektion | Nur **eine** Job-Gruppe (Kunde / Kopf / Positionen / Fuß) | Label 11–12 uppercase |
| DashedAdd | Ein CTA-Text + Icon („Kunde wählen“) | 15px accent |
| Positionskarte | Titel · Meta · Betrag | Body 14 / Caption 12 / Betrag semibold |
| Summen | Zwischensumme · MwSt · Gesamt | Body; Gesamt semibold in Band |
| DocActionBar | 4–5 Icons, **keine** Labels außer Tooltip | Icon 20–22 |

**Verboten (Overload):**

- Stepper + Canvas-Sektionen gleichzeitig als Pflicht  
- Zweite Primary neben ✓ und „Senden“  
- Erklärtexte länger als 1 Zeile pro Sektion  
- ⋯ im Canvas-Header **und** in jeder Positionszeile ohne Not  
- Nested Formulare auf dem Canvas (→ EditorSheet)

---

### A2 · `WizardShell` *(behalten für Funnel / Übergang)*

| | |
|--|--|
| **Ändert** | Weniger Nutzung; AG/RE → Canvas; Funnel/Vertrag ggf. Shell |
| **Inhalt** | Stepper-Dots · Step-Titel 17 · Hint 13 · Sticky Weiter |

**Verboten:** Lange Meta-Formulare im Step ohne Overview→Sheet; doppelter Sticky-Footer + Header-Primary.

---

### A3 · `EntityDetailShell` *(Detailseite — konzeptionell; heute DetailClients)*

| | |
|--|--|
| **Ändert** | `*DetailClient` Header + Tabs (Auftrag, Angebot, …) |
| **Job** | Vorgang ansehen / Abschnitte wechseln |

**Struktur Desktop (Master-Detail):**

```
[ Vorgang-Titel 20 | Status | Primary | ⋯ global ]
+-- Nav Abschnitte --+-- Content ------------------+
| ✓ 1 …              | Content-Titel = Nav-Label   |
| ● 2 …              | Inline-Inhalt               |
|                    | Abschnitts-Aktionen (klein) |
+--------------------+-----------------------------+
```

**Struktur Mobile (Drill-Down):**

```
Screen1: Titel + Abschnittsliste (Status-Indicator)
Screen2: < Zurück · Abschnitts-Titel · Inhalt fullscreen
```

**Inhalt Header — erlaubt:**

| Slot | Max. | Typo |
|------|------|------|
| Titel | 1 Zeile | **20px** semibold |
| Status | 1 Chip | Caption / Badge |
| Primary | **1** Button | 14 semibold |
| Global ⋯ | **1** Menü | Icons |

**Verboten:** Primary im ⋯; ⋯ an jedem Tab; zweite Action-Bar die dieselben Globals wiederholt.

---

## B · EditorSheet-Familie

### B1 · `EditorSheet` *(neu — ersetzt Modal/FormSheet/SidePanel für Create/Edit)*

| | |
|--|--|
| **Ersetzt** | `Modal`, `MockModal`, `FormSheet`, `SidePanel`, viele `*Modal.tsx` |
| **Layout** | Mobile Bottom Sheet · Desktop Detail=Slide-over · Desktop Canvas=Center-Modal |

**Struktur:**

```
┌─ Header sticky (X · Titel 17 · ✓) ─────────┐  ← bleibt über Keyboard
│ Segmented (opt.)                             │
│ ┌─ Body scroll (flex:1) ─────────────────┐ │
│ │ GroupedFieldCard(s)                    │ │
│ │ AddRowList (opt.)                      │ │
│ └────────────────────────────────────────┘ │
└─ height ↔ visualViewport ───────────────────┘
```

**Mobile-Pflicht (S7 / S8):** siehe [SURFACE-KONSOLIDIERUNG](./SURFACE-KONSOLIDIERUNG.md) — sticky ✓ + Dirty-Confirm ActionSheet.

**Inhalt — erlaubt:**

| Slot | Inhalt | Typo |
|------|--------|------|
| Titel | Ein Job: „Leistung bearbeiten“, „Kunde anlegen“ | 17 semibold |
| Segmented | Max. 2–3 Optionen | 13–14 |
| Grouped fields | Label links · Wert rechts | Label 14 muted · Wert 14 |
| Textarea-Gruppe | Ein Block Beschreibung/Notiz | Body 14 |
| AddRowList | `+` + Label (Adresse, Mail…) | 14 accent |
| ✓ | Speichern / Fertig | Primary |

**Verboten:**

- Zweiter Titel unter dem Header  
- Wizard-Stepper *im* Sheet (außer 2 Micro-Steps max.)  
- DocActionBar / Versand / PDF  
- Lange Hilfe-Absätze (>2 Zeilen)  
- Liste **und** volles Create-Form gleichzeitig (→ Push nested)  
- Sofort-Dismiss bei dirty ohne Confirm (S8)  
- ✓ nur im scrollenden Body (S7)

**Dichte:** Ziel ≤ **8 sichtbare Felder** ohne Scroll-Zwang auf Mobile; Rest hinter „hinzufügen“ oder Nested.

---

### B1b · Compose-Variante (Mail / Versand) (0.7)

Gleiches EditorSheet-Chrome, aber:

| Slot | Soll |
|------|------|
| Rechte Header-Action | Text-Primary **Senden** (nicht ✓-Icon) |
| Entwurf | Implizit / Auto — kein zweiter Speichern-Button |
| Felder | An · Betreff · Body |

---

### B2 · `PickerSheet` *(EditorSheet-Variante Liste)*

| | |
|--|--|
| **Ersetzt** | Auswahl-Modals (Kunde, Artikel, Handwerker, Katalog) |
| **Job** | Etwas **wählen** (+ optional Neu) |

**Struktur:**

```
[ X | Titel 17 | + Neu ]          ← einziger Neu-Einstieg (0.10)
[ Chips: Manuell | Katalog ]      ← nur Quelle filtern, kein zweites „Neu“
[ Liste Cards ]
[ Suche — mobil unten / Desktop unter Header ]
```

**Inhalt — erlaubt:**

| Slot | Inhalt | Typo |
|------|--------|------|
| Listenzeile | Icon · Name · Meta rechts (Nr.) | Body 14 · Caption 12 |
| Empty | Ein Satz „Keine …“ | 13 muted |
| Chips | Max. 2 Quellen-Filter (Manuell / Katalog) | 13 |
| Suche | Ein Feld, Placeholder kurz | 14 |

**Verboten:** Formularfelder im Picker (außer Suche); Chip **Neu** zusätzlich zu Header-+; Primary ✓ *und* + als konkurrierende Hauptsave.

---

### B3 · Bestehende Bausteine → Mapping

| Heute | Wird zu | Inhalt bleibt / schrumpft |
|-------|---------|---------------------------|
| `MobileEditSheet` | EditorSheet (mobile host) | Fertig-Footer → ✓ Header |
| `MobileEditableBlock` | Detail/Canvas Overview→EditorSheet | Overview 1–3 Zeilen Caption |
| `PositionModal` / Leistung*Modal | EditorSheet | Felder gruppieren, Chips raus |
| `KundeModal` (tot) / `/neu?art=kunde` | EditorSheet | Eine Surface |
| `KatalogPickModal` / Auswahl* | PickerSheet | Liste + Suche |
| `HandwerkerZuweisenModal` etc. | EditorSheet / PickerSheet | Split zuweisen vs. wählen |
| `KundenMailComposeModal` | EditorSheet (Compose) | An · Betreff · Body · Senden |
| `FormSheet` / `SidePanel` | **löschen oder Alias** | Naming-Lüge beenden |

---

## C · Action & Chrome

### C1 · `ActionSheet`

| | |
|--|--|
| **Ändert** | `ActionSheet`, `actions-menu`, Listen-⋯ (W4-01) |
| **Job** | Aktion **wählen**, nichts editieren |

**Struktur:** Titel optional · Liste Actions · Abbrechen

**Typo:** Action 15–16 · Destruktiv rot · Cancel muted

**Verboten:** Formularfelder; mehr als ~7 Actions (Rest gruppieren oder weglassen); Primary-Job der Ebene hier verstecken.

---

### C2 · `DocActionBar`

| | |
|--|--|
| **Neu / aus Lexware** | An DocumentCanvas |
| **Inhalt** | Vorschau · Senden · (Druck) · (Mehr) · Verwerfen |
| **Typo** | Nur Icons; Labels = a11y/Tooltip |

**Verboten:** Text-Buttons „Speichern“ hier (gehört Header ✓); doppelte Senden-Primary im Header.

---

### C3 · `DashedAddCard`

| | |
|--|--|
| **Neu** | Empty-CTA auf Canvas |
| **Inhalt** | 1 Icon + 1 Label (+ optional 1 Secondary-Pill) |
| **Typo** | 15 accent |

**Verboten:** Erklärparagraph; mehrere CTAs gestapelt ohne „oder“.

---

### C4 · `GroupedFieldCard` / `AddRowList`

| | |
|--|--|
| **Neu / iOS-Settings-Muster** | In EditorSheet |
| **GroupedFieldCard** | Zeilen Label\|Wert, Divider |
| **AddRowList** | Nur `+` Zeilen für optionale Blöcke |

**Typo:** Section-Header darüber 13 muted („Preise“, „hinzufügen“)

**Verboten:** Cards in Cards; Schatten-Stapel; Section-Header + Card-Titel gleichlautend.

---

### C5 · Vorgang-Header / Content-Header *(Detail)*

| Komponente | Inhalt | Typo | Max. Actions |
|------------|--------|------|--------------|
| **VorgangHeader** | Titel · Status · **1 Primary-Text** · 1× ⋯ | **20px** / Badge / Button | 2 sichtbare + ⋯ |
| **SectionContentHeader** | Abschnitts-Titel · ggf. „Abschnitt …“-Actions | 17 semibold | 1–2 Text-Links, kein zweites ⋯ wenn global schon ⋯ |

---

## D · Inline

### D1 · `InlineEditSection` *(behalten)*

| | |
|--|--|
| **Grenze (0.9)** | ≤ **6** Felder ohne optionale Blöcke = inline; sonst Overview → EditorSheet |
| **Job** | Stammdaten-Kurzform auf Detail |
| **Struktur** | Lesemodus → Stift → Felder → Speichern/Abbrechen |
| **Typo** | Label 13 muted · Wert 14 |

**Verboten:** Ganze Positionstabellen inline; Versand/PDF hier.

---

## E · Was wir *nicht* als eigene Surface bauen

| Pattern | Bleibt | Inhalt |
|---------|--------|--------|
| Confirm Löschen | Kleiner Dialog | 1 Satz + 2 Buttons |
| PDF-Preview | Viewer / Sheet | Dokument, keine Edit-Felder |
| Filter | `MobileListFilterSheet` | Chips/Felder Filter only |
| FAB Neu | Popover / ActionSheet | Nur Einstiege, keine Forms |

---

## F · Checkliste „Overload?“ (Review)

**System-Review Designer 2026-07-27: Punkte 1–8 bestanden → Freigabe.**

Beim Review einer Surface / eines Screens:

| # | Frage | Soll | System |
|---|-------|------|--------|
| 1 | Wie viele **Primary-Text-Buttons**? (Icons zählen nicht) | ≤ 1 | ✓ |
| 2 | Wie viele **⋯**-Menüs **dauerhaft** sichtbar? | ≤ 1 global; Zeilen-⋯ nur Hover/Long-Press | ✓ |
| 3 | Titel-Ebenen **für denselben Job**? (Section-Labels zählen nicht) | ≤ 2 | ✓ |
| 4 | Wie viele **Jobs** auf einem Screen? | 1 | ✓ |
| 5 | Scrollt die erste Viewport schon Hilfe/Marketing? | Nein | ✓ |
| 6 | Modal über Modal? | Nein (Confirm-ActionSheet ok) | ✓ |
| 7 | Felder im EditorSheet ohne „hinzufügen“-Progressive? | ≤ 8 sichtbar | ✓ |
| 8 | Nav-Eintrag mit eigenem ⋯? | Nein | ✓ |
| **9** | Mobile: ✓ bei Tastatur sichtbar? (S7) | Sticky Header + visualViewport | Pflicht Ship |
| **10** | Dirty + X/Swipe → Confirm? (S8) | ActionSheet Verwerfen/Weiter | Pflicht Ship |
| **11** | Canvas X = Auto-Entwurf; Verwerfen nur DocBar? (S9) | Ja | Pflicht Ship |
| **12** | Back schließt Overlay / Drill-Down Zurück? (S10) | Ja | Pflicht Ship |

---

## G · Änderungs-Radar (Komponenten-Liste)

### Neu bauen

| Komponente | Surface |
|------------|---------|
| `DocumentCanvas` | A |
| `EditorSheet` *(inkl. S7 visualViewport + S8 dirty)* | B |
| `PickerSheet` | B |
| `DashedAddCard` | C |
| `GroupedFieldCard` | B/C |
| `AddRowList` | B |
| `DocActionBar` | C |
| `VorgangHeader` (vereinheitlichen) | A3 |
| `SectionContentHeader` | A3 |
| Dirty-Confirm via `ActionSheet` | C |

### Umbauen (Inhalt reinigen)

| Heute | Richtung |
|-------|----------|
| `AngebotWizard` / `RechnungWizard` | → DocumentCanvas + Picker/EditorSheets |
| `AbnahmeprotokollCreateWizard` | → Canvas-Muster |
| `AngebotLeistung*Modal` / `AuftragLeistung*Modal` | → EditorSheet |
| `PositionModal` / `KatalogPickModal` | → EditorSheet / PickerSheet |
| `Kunde`/`Partner` Create (`/neu`) | → EditorSheet |
| `Handwerker*Modal`, `TerminModal`, Mail-Compose | → EditorSheet / Picker |
| `DetailActionsBar` / Listen-⋯ | → Primary + 1× ⋯; ActionSheet mobil |
| Auftrag/Angebot Tabs | → Nav ohne ⋯; Status-Indicator |

### Deprecaten / ersetzen

| Heute | Grund |
|-------|-------|
| `FormSheet` als „Sheet“ | Ist Modal |
| `SidePanel` (aktuell Modal) | Echtes Slide-over in EditorSheet |
| Ungenutzte `KundeModal`, `*SidePanel` | Parallelwelten |

---

## H · Beispiel-Inhalte (kurz, overload-frei)

### Angebot DocumentCanvas

1. **Kunde** — DashedAdd oder eine Kundenkarte  
2. **Kopf** — Nr (auto) · Datum · Gültig · Segmented Netto/Brutto  
3. **Positionen** — Liste + DashedAdd/FAB  
4. **Summen** — 2–3 Zeilen + Gesamtband  
5. **Fuß** — 1–2 Tippen-Zeilen (Zahlungsbedingungen ›)  

→ Alles Weitere in Sheets.

### EditorSheet „Kunde anlegen“

- Segmented Firma|Person  
- Card: Name, Notiz  
- Card: Kundennummer (auto)  
- AddRowList: Adresse, Ansprechperson, Tel, Mail, …  

### PickerSheet „Kunde“

- Liste · Suche · + Neu  
- Empty: „Keine Kunden“  

### ActionSheet Auftrag ⋯

- Nur Seltenes: Stornieren, Historie, …  
- **Nicht:** „Rechnung erstellen“ wenn das Primary ist  

---

*Ende Übersicht — bei Review gegen Abschnitt F prüfen.*
