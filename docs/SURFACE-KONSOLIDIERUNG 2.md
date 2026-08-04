# Surface-Konsolidierung — Create / Edit / Detail

**Stand:** Juli 2026  
**Status:** **Freigabe Implementierung** (Designer-Review bestanden · Checkliste F ✓)  
Verwandt: [WIZARD-LEXWARE-KONZEPT.md](./WIZARD-LEXWARE-KONZEPT.md) · [WIZARD-UI-MUSTER.md](./WIZARD-UI-MUSTER.md) · [ENTSCHEIDUNGSLOG.md](./ENTSCHEIDUNGSLOG.md) · **Inhalte/Typo/Overload-Check:** [SURFACE-KOMPONENTEN-INHALTE.md](./SURFACE-KOMPONENTEN-INHALTE.md) · **Nutzer-Copy (Wörter/Budget):** [SURFACE-NUTZER-COPY.md](./SURFACE-NUTZER-COPY.md) · W8-02 / W4 / W11

> **SoT für Refactoring.** DocumentCanvas aggregiert nur; Mutationen → EditorSheet. Naming-Lügen (`FormSheet`/`SidePanel`) enden. `/neu?art=kunde` → kontextgetriebenes EditorSheet.

---

## 0. Grundproblem (Designer)

**Context Overload + unklare Hierarchien.**  
Wenn auf jeder Ebene (Vorgang · Abschnitt/Tab · Zeile) dasselbe ⋯-Icon sitzt, verliert der Nutzer die Orientierung *welche* Ebene er bearbeitet. Auf Mobile kommt Platznot für Sidebars hinzu.

**Gegenmittel:** Aktionen nach **Ebene und Häufigkeit** trennen · Surfaces nach **Job-Größe** · Desktop Master-Detail · Mobile Drill-Down · Overlay max. eine Layer-Familie.

---

## 1. Finale Surface-Matrix (Soll — beschlossen)

| Surface | Mobile | Desktop | Wann |
|---------|--------|---------|------|
| **DocumentCanvas** | Fullscreen | Fullscreen | Dokument-Flow (AG, RE, Abnahme, Vertrag, Funnel) |
| **EditorSheet** | Bottom Sheet (hoch) | **kontextabhängig** ↓ | Entity create/edit, Picker, Compose |
| **ActionSheet** | Bottom Sheet (kurz) | Context-Menu / Dropdown | Nur Aktion *wählen* |
| **Inline** | Inline (mobil ggf. Overview→Sheet) | Inline | Leichte Detail-Felder |

### EditorSheet Desktop — **beschlossen**

Eine Komponente, zwei Render-Layouts nach **Aufruf-Kontext** (kein Regelbruch):

| Kontext | Desktop-Layout | Warum |
|---------|----------------|-------|
| **Von Detailseite** | **Slide-over rechts** | Kontext links bleibt sichtbar; Erweiterung, keine Unterbrechung |
| **Aus DocumentCanvas** | **Center-Modal** | Fokus auf Sub-Task; Blick nicht ans rechten Rand reißen; nach Speichern sofort zurück zum Canvas |

Mobile immer: **Bottom Sheet**.

### Primary-Definition (0.1)

| Zählt als Primary | Zählt **nicht** als Primary |
|-------------------|----------------------------|
| Text-Button in Primärfarbe (Vorgang-Header, Sheet-Compose „Senden“) | Icon-Actions: Canvas-✓, DocActionBar-Icons, Header-X |

| Surface | „Die eine“ Primary-Story |
|---------|--------------------------|
| **DocumentCanvas** | ✓ = Speichern Entwurf (Icon). **Senden** nur DocActionBar → Versand-Sheet |
| **Detail Vorgang** | Ein Text-Verb (Senden / Abnahme / …) |
| **EditorSheet Compose** | Text-Primary **Senden** (✓-Slot wird Text-Primary; Entwurf implizit) |
| **EditorSheet Edit** | ✓ Speichern (Icon ok) |

### EditorSheet Mobile — Pflicht-Randfälle (S7 / S8 / S9 / S10)

#### S7 · Keyboard Avoidance & Sticky ✓

Wenn ein Input fokussiert wird, schiebt die native Tastatur hoch. **✓ darf nicht aus dem Viewport oder hinter die Tastatur rutschen.**

| Regel | Soll |
|-------|------|
| Layout | Flex-Spalte: **Header sticky oben** · Body `flex:1; overflow:auto` · optional Footer |
| Höhe | An `visualViewport` / dynamic viewport koppeln (nicht nur `100vh`) |
| Scroll | Nur `GroupedFieldCard`-Bereich scrollt; Header mit X · Titel · ✓ bleibt sichtbar |
| Suche im Picker | Mobil Suche unten: ebenfalls über Keyboard heben (`visualViewport`), nicht vom ✓ verdecken lassen |

#### S8 · Unsaved Changes (Dirty State)

| Trigger | Verhalten |
|---------|-----------|
| Feld geändert (`dirty`) + **X** / Swipe-dismiss / Backdrop | **Nicht** sofort schließen |
| Stattdessen | Confirmation-**ActionSheet**: „Änderungen verwerfen?“ → **Verwerfen** (destruktiv/rot) · **Weiter bearbeiten** |
| Nicht dirty | Sofort schließen |
| Nach erfolgreichem ✓ Speichern | Schließen ohne Confirm |

Confirm ist **ActionSheet** (kurz), kein zweites EditorSheet / kein Modal-in-Modal. Stack bleibt: Base → EditorSheet → (optional) ActionSheet-Confirm = erlaubt als System-Confirm, nicht als Edit-Layer.

#### S9 · Canvas-Exit

| Aktion | Verhalten |
|--------|-----------|
| Canvas **X** | **Auto-Entwurf speichern**, schließen — **kein** Dirty-Confirm |
| DocBar **Verwerfen** | Einzige destruktive Exit → ActionSheet-Confirm |
| Canvas ✓ | Explizit Speichern (Entwurf) |

#### S10 · Back-Handling

| Kontext | Browser-/Android-Back |
|---------|----------------------|
| Overlay offen (EditorSheet / ActionSheet) | History-Entry: Back schließt Overlay; bei dirty → S8 |
| Mobile Drill-Down Screen 2 | Back = „Zurück“ zu Abschnittsliste |
| Nur Canvas / Detail | Normales Zurück / Schließen |

---

## 2. Drei Ebenen — ⋯ entflechten

| Ebene | Was | Primär | Sekundär | Verboten |
|-------|-----|--------|----------|----------|
| **1 Vorgang** | Angebot / Auftrag / Kunde … | **Primary-Text-Button** (siehe 0.1) | Ein globales ⋯ für Seltenes | Primary im Dropdown; mehrere Header-⋯ |
| **2 Abschnitt / Tab / Nav** | Leistungen, Zahlung, Vor Ort … | **Klick = navigieren**; Status ✓ / ! | Abschnitts-Aktionen im **Content-Header** | ⋯ an Nav-/Tab-Einträgen |
| **3 Inhalt / Zeile** | Position, Leistung, Feld | Tippen → EditorSheet / Inline | Zeilen-⋯ nur wenn >2 seltene Aktionen | ⋯ als **Dauer-Icon**; Modal-über-Modal |

**⋯-Koexistenz (0.2):** Global-⋯ und Zeilen-⋯ **dürfen** koexistieren. Zeilen-⋯ nie dauerhaft sichtbar: Desktop nur Hover/Fokus; Mobile Long-Press oder nur im geöffneten Zeilen-Detail.

**Kurz:** Primary sichtbar · Nav navigiert · Edit in Context · ⋯ selten und **ebenenklar**.

### Inline-Grenze (0.9)

| Felder | Surface |
|--------|---------|
| ≤ **6** Felder, keine optionalen Blöcke | **Inline** (`InlineEditSection`) |
| Mehr / optionale Blöcke / Listen | Overview → **EditorSheet** |

---

## 3. Desktop: Master-Detail (Detailseiten)

```
+-- Vorgang-Header: Titel · Status · [Primary] · [⋯ global] ---------+
| NAV (Abschnitte)     | CONTENT: gewählter Abschnitt               |
| ✓ Stammdaten         | Überschrift = Nav-Label                    |
| ● Leistungen   <--   | Formular / Liste INLINE                    |
| ○ Zahlung            | Abschnitts-Aktionen im Content-Header      |
| ○ Vor Ort            |                                            |
+----------------------+--------------------------------------------+
         └─ Edit Entity → EditorSheet Slide-over (rechts)
```

- Wizard/Canvas für **Dokumente** kann Fullscreen bleiben (nicht zwingend im Detail-Content).  
- Detail-Tabs: **In-Page**, kein Modal nur für 3 Felder.  
- Optional später: Wizard *im* Content mit Progress — nicht Pflicht für AG/RE-Canvas.

---

## 4. Mobile: Drill-Down (View-Swap)

```
Screen 1: Vorgangsübersicht + Abschnittsliste (+ Fortschritt)
    ↓ Tippen Abschnitt
Screen 2: Fullscreen Inhalt (< Zurück)
    ↓ Sub-Task
Bottom Sheet: ActionSheet (kurz) oder EditorSheet (hoch)
```

- Keine Sidebar-Quetschung.  
- Keine verschachtelten Modals.  
- Bottom Sheet = Daumenreichweite.

---

## 5. Overlay-Stack (beschlossen)

| Fluss | Base | Top Layer |
|-------|------|-----------|
| **A Canvas** | DocumentCanvas | EditorSheet als **Center-Modal** (Desktop) / Bottom Sheet (Mobile) |
| **B Detail** | Detailseite | EditorSheet als **Slide-over** (Desktop) / Bottom Sheet (Mobile) |

**Regel:** Kein Modal-in-Modal. Stack = Base + **eine** Overlay-Familie.

**Nested „wählen → neu“:** Inhalt *innerhalb* derselben EditorSheet-Host-Instanz pushen/ersetzen (Sheet-Stack / Screen-Swap im Sheet), **nicht** zweites zentriertes Modal darüber.

---

## 6. Create-Routen (`/neu`)

| Entity | Soll |
|--------|------|
| Anfrage / Angebot / Rechnung | Einstieg → **DocumentCanvas** / Wizard (Route oder Overlay ok) |
| **Kunde / Partner** (Formular ohne tiefe Verzweigung) | **EditorSheet** über Liste oder aus Canvas — **keine** parallele Fullpage-Form als zweite Wahrheit |
| Create-Host `/neu` mit `art=kunde` oder `art=handwerker` | Entweder Host öffnet Sheet, oder Route entfällt — **eine** Surface |

`KundeModal` / ungenutzte SidePanels: entfernen oder auf EditorSheet verdrahten.

---

## 7. Ist heute (Chaos — Kurz)

| Primitive | Realität | Soll |
|-----------|----------|------|
| `Modal` / `MockModal` | Default ~40+ Edits | → EditorSheet |
| `FormSheet` / `SidePanel` | **Naming-Lüge:** zentriertes Modal | → echtes EditorSheet (Slide-over) oder sterben |
| `MobileEditSheet` | echtes Bottom Sheet, lückenhaft | Basis für EditorSheet mobil |
| ⋯ überall | Context Overload | Ebenen-Regel §2 |
| `/neu` + Modal parallel | zwei Wahrheiten | §6 |

---

## 8. Inventar → Soll (Kern)

### A · DocumentCanvas

Angebot · Rechnung · Abnahme · Verträge · Anfrage-Funnel · Visualisierung/Abschluss-Fullscreen wo sinnvoll.

### B · EditorSheet

Position/Leistung · Katalog-Picker · Kunde/Partner anlegen · Objekt · Zuweisung · Termin · Mail-Compose · Preislisten · Abschlagsplan · Bautagebuch-Eintrag · …

### C · ActionSheet

Detail-⋯ · Listen-⋯ (W4-01) · Overflow Doc-Toolbar.

### D · Inline

Stammdaten auf Detail · kurze Entity-Karten.

### Nicht EditorSheet

Confirm Löschen · PDF-Preview · Filter-Sheet · FAB „Neu …“-Menü.

---

## 9. Kit & Rollout

```
EditorSheet({ context: 'detail' | 'canvas', dirty?, onDismissAttempt })
  mobile  → Bottom Sheet (flex + visualViewport; Header sticky ✓)
  detail  → Slide-over
  canvas  → Center Modal
  dirty + X/Swipe → ActionSheet „Änderungen verwerfen?“
```

| Phase | Was |
|-------|-----|
| 0 | Docs + Designer-Freigabe ✅ |
| 1 | `EditorSheet` API + Slide-over + **S7 Keyboard** + **S8 Dirty-Confirm** |
| 2 | Naming: FormSheet/SidePanel ersetzen |
| 3 | Positionen v3 + PosBoard |
| 4 | Kunde/Partner Create → Sheet; `/neu` bereinigen |
| 5 | ⋯-Audit: Primary raus aus Dropdown; Nav ohne Zeilen-⋯ |
| 6 | AG/RE → DocumentCanvas (W11) |

---

## 10. Erfolg

- [x] Matrix + Checkliste F Designer-Review bestanden (Freigabe)  
- [ ] 4 Surfaces bekannt; keine 8 Container-Namen für denselben Job  
- [ ] EditorSheet Desktop: Detail=Slide-over, Canvas=Center-Modal  
- [ ] EditorSheet Mobile: sticky ✓ + visualViewport (S7); Dirty-Confirm (S8)  
- [ ] ⋯ nur Ebene 1 (global) und ggf. Ebene 3 (selten); Nav ohne ⋯  
- [ ] Primary immer sichtbar im Vorgang-Header  
- [ ] Kein Modal-in-Modal; Nested nur im Sheet-Host  
- [ ] Kunde/Partner Create = eine Surface (EditorSheet)  

---

## 11. Designer-Review (2026-07-27) — Kurzprotokoll

| # | Prüfpunkt | Status |
|---|-----------|--------|
| 1–8 | Overload-Checkliste F ([KOMPONENTEN-INHALTE](./SURFACE-KOMPONENTEN-INHALTE.md)) | **Bestanden** |
| S7 | Keyboard / sticky ✓ | **Ergänzt** (Pflicht vor Ship) |
| S8 | Unsaved / Dirty | **Ergänzt** (Pflicht vor Ship) |

**Freigabe:** SoT produktionsreif für Implementierung & Refactoring.