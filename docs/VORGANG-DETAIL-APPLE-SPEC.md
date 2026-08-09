# Vorgang-Detail & Canvas — visuelle Bau-Spec (ohne Screenshot lesbar)

**Stand:** 2026-07-27 · **Rev:** Apple Design Review (Freigabe mit Auflagen)  
**Ziel:** Jemand liest dieses Dokument und weiß **exakt**, wie Detail + Aktionen + Canvas aussehen und wo welche Aktion sitzt.  
**Bezug:** [SURFACE-KONSOLIDIERUNG.md](./SURFACE-KONSOLIDIERUNG.md) · [SURFACE-KOMPONENTEN-INHALTE.md](./SURFACE-KOMPONENTEN-INHALTE.md) · [DESIGN-KURZSPEC-DESKTOP-MOBILE.md](./DESIGN-KURZSPEC-DESKTOP-MOBILE.md) · [WIZARD-LEXWARE-KONZEPT.md](./WIZARD-LEXWARE-KONZEPT.md)

**Kernversprechen**

> Ein Design für alle Vorgänge. Die Akte füllt sich mit der Phase.  
> Schreiben nur in Canvas (Dokument) oder Sheet (Punkt) — **kleine Edits zuerst inline**.  
> Kein Multistep-Formular mehr.  
> **Alltag ≠ Happy Path:** Springen, Nachziehen, die richtige RE wiederfinden — siehe §14.  
> **Feel:** Quiet UI · semantische Tokens · Fluid Size Classes · kein „Mehr“-Tab.

**Apple-Review (Kurzurteil):** Fundament freigegeben (Canvas, Verben-Disziplin, PhaseStrip, flache Hierarchie).  
Auflagen → §0 (Material/Typo/Fluid), §2 (Tabs ohne Mehr), §10 (Paper-Canvas), §16 (Motion/Haptics). Abgleich → §17.

---

## 0 · Visuelle Sprache (so sieht es aus)

### 0.1 Material & Farbe (nicht nur flache Tokens)

Statische Hex-Zuordnung allein reicht nicht. **Semantische Rollen + Materialien** (Web-Übersetzung von Vibrancy):

| Semantik | Hell (Default) | Dunkel (`prefers-color-scheme`) | Verwendung |
|----------|----------------|-----------------------------------|------------|
| `bg.canvas` | neutrales Off-White mit **sehr leichtem** Warm/Cool-Tint (atmen) | tiefes Graphit | Seiten-/App-Hintergrund |
| `bg.paper` | nahezu weiß, weicher Ambient-Rand | elevated Graphit | DocumentCanvas-Papier, Detail-Inhalt |
| `bg.sidebar` | `ultraThin`-Äquivalent: `backdrop-filter` + leichte Sättigung | gleiche Idee, dunkler | App-Sidebar, Detail-Tab-Nav Regular |
| `bg.sheet` | material über Dim | material über Dim | EditorSheet / Bottom Sheet |
| `bg.bar` | Glass: blur + semi-transparent | Glass dunkel | Floating DocActionBar |
| `label.primary` | near-black | near-white | Titel, Werte |
| `label.secondary` | mid | mid-light | Meta |
| `label.tertiary` | muted | muted-light | Captions, Section-Labels |
| `separator` | Hairline 0.5–1px | Hairline inverted | Trenner — **kein** Card-Schatten-Salat |
| `accent` | Bärenwald-Grün | gleiches Grün, etwas heller für Kontrast | Primary, aktive Chips, Links |
| `status.*` | Grün / Amber / Rot | angepasste Kontraste | Badges only |

**Regeln**

- Markengrün = **Accent**, nicht flächiger Hintergrund.  
- Tiefe = Material + Hairline + **ein** weicher Ambient Shadow am Paper — nicht gestapelte Drop-Shadows.  
- `color-scheme` / `light-dark()` pflegen; kein zweites „Dark-Theme-Fork“ im Code.  
- Web-Mapping: CSS-Variablen `--bw-material-sidebar`, `--bw-paper-shadow`, `backdrop-filter: saturate(1.2) blur(20px)`.

**Atmosphäre:** Quiet UI, eine Spalte Inhalt, kein Marketing-Card-Salat, keine lila Gradienten, keine Floating-Badges auf Medien.

### 0.2 Typografie — semantisch (Dynamic Type), nicht starre px

**SoT sind Style-Namen.** px/rem in der Implementierung = Default bei 100 % Systemgröße; UI muss mit Root-/Browser-Zoom und (wo möglich) größerer Systemschrift skalieren.

| Semantik (Apple-Analog) | Default ≈ | Gewicht | CSS-Rolle | Verwendung |
|-------------------------|-----------|---------|-----------|------------|
| **Title 2** | ~22 / 20 | semibold | `.text-title2` | Vorgang-Titel, Canvas-Header |
| **Headline** | ~17 | semibold | `.text-headline` | Sektions-Titel |
| **Body** | ~17 / 15 | regular | `.text-body` | Zeilen, Werte |
| **Callout** | ~16 / 14 | regular/semibold | `.text-callout` | Button-Label, Betrag |
| **Subheadline** | ~15 / 13 | regular | `.text-subhead` | Meta-Zeile im Head |
| **Footnote** | ~13 | regular | `.text-footnote` | Hints, Status-Nebeninfo |
| **Caption 1** | ~12 | regular | `.text-caption` | IDs, Zeitstempel, Section-Label UPPER |

**Titel-Regel:** ≤ 2 Titel-Ebenen pro Job. Kein langer Erklärtext (max. 1 Zeile Footnote, oft weglassen).  
**Verboten in Spec/Code-Kommentaren als einzige Wahrheit:** „immer 13px“ ohne Semantik-Name.

### 0.3 Abstände & Form

| Maß | Wert |
|-----|------|
| Seitenrand Regular | 24–32 |
| Seitenrand Compact | 16 |
| Abstand Sektion → Sektion | **24** |
| Listen-Zeile | min ~44–56 Touch |
| Radius Sheet / Paper | System-nah (~12–16), kein Pill-Overkill |
| Trenner | `separator` Hairline |
| Paper Ambient Shadow | ein weicher, großer Blur, geringe Opacity |

### 0.4 Fluid Size Classes (kein Hart-Cut-Denken)

Breakpoint **767/768** bleibt technische Default-Schwelle in CSS — **Produkt-Denken = Compact vs Regular**:

| Size Class | Wann | Chrome |
|------------|------|--------|
| **Regular** | breites Fenster / Desktop / iPad Landscape | Split: Sidebar/Tab-Tree **links** · Inhalt **rechts**; Canvas = Paper zentriert |
| **Compact** | schmales Fenster, Stage Manager schmal, Phone | Ein-Spalte; Tab-Bar/Chips max. **4**; Drill wo nötig |

**Pflicht-Test:** Mac-Fenster schmal ziehen / Stage Manager — UI muss **nahtlos** in Compact gleiten (gleiche Komponenten, anderes Layout), nicht „andere App“.

```
REGULAR                              COMPACT
┌──────────┬──────────────────┐      ┌────────────────────┐
│ material │ Back · PhaseStrip│      │ Back · Rückweg     │
│ sidebar  │ DetailHead       │      │ DetailHead         │
│ Tab-Tree │ Title2 · Primary │      │ Primary        ⋯   │
│          ├──────────────────┤      │ Tabs ≤4            │
│          │ Paper / Inhalt   │      │ Inhalt scroll      │
└──────────┴──────────────────┘      └────────────────────┘
App-BottomNav auf Entity-Detail: AUS
```

Sheet-Detents (Mobile): Bottom Sheet mit Drag Handle, ideal **medium / large** (Inhalt bestimmt Default).  
Desktop: Slide-over (von Detail) oder Center (von Canvas) — räumlich am Auslöser, nicht willkürlich.

---

## 1 · Komponenten-Katalog (Detail)

Jeder Baustein: Aussehen → Inhalt → Aktionen.

### 1.1 `DetailHead`

```
┌─────────────────────────────────────────────────────────┐
│  Garten Müller                          [In Arbeit]     │  ← Title 2 + Badge(s)
│  Müller · Berlin · AU-2026-041                          │  ← Subheadline tertiary
│                                                         │
│  [ Abnahme starten ]                           [ ⋯ ]    │  ← 1 Callout-Primary · ⋯
└─────────────────────────────────────────────────────────┘
```

| Slot | Inhalt | Aktion |
|------|--------|--------|
| Titel | Projektname | — |
| Badges | Status; optional „Zahlung offen“ | — |
| Meta | Kunde · Ort · Nr | — |
| Primary | **ein** Verb der Phase | startet Canvas/Sheet/Status |
| ⋯ | nur echte Verben (Storno, Duplizieren…) | ActionSheet / Menu |

**Nicht im Head:** „Zum Auftrag“, „Fotos“, „Dokumente“, Navigation.  
Stammdaten-selten: **Kontextmenü / Inline in Akte**, kein eigener Tab „Mehr“.

---

### 1.2 `PhaseStrip` (Projekt-Kette)

```
Anfrage  →  Angebot  →  ● Auftrag  →  Rechnung
 Footnote    link         Body semibold   link (oder tertiary wenn leer)
```

| Zustand | Darstellung | Klick |
|---------|-------------|-------|
| Existiert | Text-Link, Accent hover | Route zur Phase |
| Aktiv | semibold, keine Link-Farbe | — |
| Fehlt noch | tertiary, nicht klickbar | — |

---

### 1.3 `DetailSection` / `PhaseCard`

**Visuell eine flache Sektion**, kein dicker Card-Stack:

```
Leistungen                              8     [ + ]  [ Bearbeiten ]
─────────────────────────────────────────────────────────────────
Liefern und Verlegen Unkrautvlies …              Offen
Rasenkantensteine liefern und setzen …           Offen
…
Alle 8 anzeigen →
```

| Element | Typo | Aktion |
|---------|------|--------|
| Titel links | Headline | — |
| Count | Footnote tertiary | — |
| `[ + ]` | ghost sm / icon | **Hinzufügen** → Sheet oder Canvas |
| `[ Bearbeiten ]` | ghost sm | **Bearbeiten-Modus** → Sheet/Canvas |
| Zeile | Body · rechts Status Caption | Tippen → öffnen / Sheet |
| „Alle anzeigen“ | Footnote link | expand / Drill |

**PhaseCard** (fremde Phase in Übersicht):

```
┌─ Auftrag ──────────────────────────────────── Öffnen → ┐
│  AU-2026-041 · In Arbeit · Übergabe 12.08.             │  ← Body / Footnote
│  8 Leistungen · Zahlung 1/3                            │
└────────────────────────────────────────────────────────┘
```

Ganze Karte klickbar = Navigation. **Kein** Bearbeiten-Button auf fremder Phase.

**EmptyPhase:** eine Zeile Footnote tertiary — kein Fake-CTA.

---

### 1.4 `MetaGrid`

```
Übergabe          12.08.2026          ← Caption tertiary | Body
Ort               10115 Berlin
Vertreter         Max Berger
```

**First:** Tippen Wert → **Inline-Edit** auf der Fläche (wo sinnvoll: Menge, kurzer Text).  
**Second:** komplex / Validierung / Picker → `EditorSheet`.

---

### 1.5 `MediaStrip`

```
Fotos                                    [ + ]
[ ▢ ] [ ▢ ] [ ▢ ]     horizontal scroll, Thumb ~72–80, radius 8–12
```

`+` → Upload-Sheet. Tippen Thumb → Lightbox / groß.

---

### 1.6 `AktivitaetFeed`

```
Heute
  14:20  Rechnung gesendet an Müller
  09:10  Abnahmeprotokoll erstellt

Gestern
  …
Filter-Chips: Alles | Status | Mail | Phasen   (optional, eine Zeile)
```

Meist read-only. Seltene Antwort → Sheet.

---

### 1.7 `AktePanel` (Docs + Notizen + optional Geld-Kurz)

```
Akte                         [ Filter ▾ ]  [ + ]
────────────────────────────────────────────────
PDF  Abnahme 12.08.2026              Gesendet
PDF  Angebot AG-…                    …
Notiz  „Kunde wünscht …“             10.08.
```

`+` → ActionSheet: Dokument | Notiz → jeweiliges Sheet.

Unter **Tab Akte** (§2) zusätzlich Segment oder Abschnitte: **Zahlung** · **Dateien** · **Kunde** (Stammdaten) — ein Tab, interne Struktur, kein „Mehr“.

---

## 2 · Tab-Struktur (max. 4 — ohne „Mehr“)

Apple-Auflage: **„Mehr“ ist ein IA-Schuldschein.** Compact = höchstens vier sichtbare Tabs.

| Tab-ID | Label | Wann | Inhalt |
|--------|-------|------|--------|
| `uebersicht` | Übersicht | immer | Story, Zugehörig, Fotos, Diese Phase |
| `akte` | Akte | immer | Zahlung/Plan · Rechnungen · Docs · Notizen · Kunde & Objekt |
| `vorOrt` | Vor Ort | **nur Auftrag** | Abnahme · Tagebuch · Abschluss |
| `aktivitaet` | Aktivität | immer | Feed (Verlauf ∪ Historie) |

**Compact ohne Auftrag:** Übersicht · Akte · Aktivität (3 Tabs).  
**Compact Auftrag:** Übersicht · Akte · Vor Ort · Aktivität (4).  

**Regular:** dieselbe IA als Tree links (keine zusätzlichen Top-Level-Punkte). Stammdaten = Abschnitt in Akte oder Kontextmenü am Head — **kein** fünfter Tab.

| Alt (verworfen) | Neu |
|-----------------|-----|
| Geld als eigener Tab | Abschnitt in **Akte** |
| Dokumente + Notizen + Mehr | **Akte** |
| Stammdaten-Tab / Mehr | Akte-Abschnitt oder Head-Kontextmenü |

---

## 3 · Tab „Übersicht“ — Inhalt + Aktionen (pro Block)

Reihenfolge **immer gleich**. Fehlende Phasen = Empty oder ausblenden.

### 3.1 Block: Diese Phase

| Phase | Felder (MetaGrid / Preview) | Sektions-Aktionen | Tippen Zeile |
|-------|----------------------------|-------------------|--------------|
| **Anfrage** | Bedarf-Text, Gewerk, Terminwunsch | Bearbeiten → Inline/Sheet | — |
| **Angebot** | Nr, Datum, Gültig, Summe, Pos-Preview (≤5) | Bearbeiten → **Canvas** · + Pos → Sheet aus Canvas | Pos → Sheet; Menge bevorzugt **inline** |
| **Auftrag** | Nr, Status, Zeitraum, Pos-Preview | Bearbeiten Leistungen → Sheet/Canvas-Korrektur | Pos → Detail/Sheet |
| **Rechnung** | Nr, Datum, Fällig, Betrag, Pos-Preview | Bearbeiten → **Canvas** | Pos → Sheet |

### 3.2 Block: PhaseCards (Kette)

| Card | Aktion | Surface |
|------|--------|---------|
| Anfrage | Öffnen → | Navigation |
| Angebot | Öffnen → | Navigation |
| Auftrag | Öffnen → | Navigation |
| Rechnung(en) | Öffnen / Liste | Navigation; mehrere = Unterliste |

**Nicht** „Bearbeiten“ auf der Card — nur Sprung.

### 3.3 Block: Fotos

| Aktion | Surface |
|--------|---------|
| + Foto | EditorSheet Upload |
| Thumb | Lightbox |

### 3.4 Block: Kunde & Objekt (Kurz in Übersicht)

Kurzzeile reicht; **volle Stammdaten in Tab Akte**. Bearbeiten → Inline/Sheet.

### 3.5 Block: Zugehörig (Projekt-Dokumente)

**Pflicht in jeder Phasen-Übersicht** — löst „welche RE / welcher Auftrag gehört dazu?“ ohne Aktionsmenü.

```
Zugehörig
────────────────────────────────────────────────
Angebot   AG-012     Angenommen              →
Auftrag   AU-041     In Arbeit               →
Rechnung  RE-0141    Bezahlt                 →
Rechnung  RE-0142 ●  Offen            Hier
Abnahme   12.08.     PDF · Gesendet          →
```

| Element | Typo / Look | Verhalten |
|---------|-------------|-----------|
| Zeile | Body · Status Caption | Tippen = Navigation |
| `●` / „Hier“ | Caption semibold accent | aktuelles Dokument |
| Mehrere REs | neueste oben | Meta „Abschlag 2“ wenn Plan |
| Fehlt Phase | Zeile weglassen | — |

Komponente: `ZugehoerigListe`.  
**Regular Kurz-Hop:** Auftrag von RE → Slide-over; große Edits → Canvas → zurück zur gleichen RE (§14.3).

---

## 4 · Tab „Akte“ (Geld · Dateien · Kunde)

Ersetzt frühere Tabs Geld / Dokumente / Notizen / Stammdaten / Mehr.

```
Akte
  [ Zahlung | Dateien | Kunde ]     ← Segmented, Footnote/Callout
────────────────────────────────
(Zahlung aktiv:)
Zahlungsplan
  1. Anzahlung 30%     bezahlt      RE-…
  2. Abschlag 40%      offen        [ Rechnung ]
Rechnungen
  RE-0142   12.08.   3.720 €   Offen    →
```

| Segment | Inhalt | Primäre Sektions-Aktion |
|---------|--------|-------------------------|
| **Zahlung** | Plan + RE-Liste (wie früher Geld-Tab) | + Rechnung → Canvas |
| **Dateien** | Docs + Notizen (`AktePanel`) | + → ActionSheet |
| **Kunde** | Stammdaten MetaGrid | Bearbeiten → Sheet |

Angebot ohne Plan: Zahlung = Summen-Kurz + Link „im Angebot bearbeiten“ → Canvas.  
Anfrage: oft nur Dateien + Kunde (Segment Zahlung ausblenden).

| Aktion Zahlung | Surface |
|----------------|---------|
| Rechnung erstellen | **DocumentCanvas** |
| RE öffnen | Navigation |
| Mahnen / Bezahlt | RE-Detail Header |
| Plan anpassen | EditorSheet |

---

## 5 · Tab „Vor Ort“ (nur Auftrag)

**Segmented** (eine Zeile, volle Breite max ~md):

` Abnahme | Tagebuch | Abschluss `

### 5.1 Segment Abnahme

```
Abnahmeprotokolle                    [ Protokoll ]
────────────────────────────────────────────────
Abnahme 12.08.2026     PDF · Gesendet      ⋯
Abnahme 01.08.2026     PDF · Entwurf       ⋯
```

| Aktion | Surface |
|--------|---------|
| Protokoll (Primary der Sektion) | **DocumentCanvas** (eine Seite) |
| Zeile Tippen / Bearbeiten | Canvas mit `protokollId` |
| PDF öffnen | neues Tab / Viewer |
| Löschen | Zeilen-⋯ → Confirm |
| Mängel | Badge/Link wenn offen → Flow/Sheet |

**Verboten:** Ghost-Link „Abnahme-Wizard“ im Tagebuch-Header.

### 5.2 Segment Tagebuch

```
Bautagebuch                          [ + Eintrag ]  [ + Leistung ]
8 Leistungen · 0 Einträge
────────────────────────────────
Leistung …
  Offen · Offen
```

| Aktion | Surface |
|--------|---------|
| + Eintrag | EditorSheet |
| + Leistung | EditorSheet |
| Zeile | Sheet Tagebuch/Fotos |

### 5.3 Segment Abschluss

```
Abschlussbericht                     [ Erstellen ]
optionaler Bericht · Status Versand
```

| Aktion | Surface |
|--------|---------|
| Erstellen / Neu | Canvas oder bestehendes Abschluss-Modal → Ziel Canvas |
| Senden | Sheet Versand |

---


## 6 · Tab „Aktivität“

Ein Feed = früher Verlauf + Historie (Phasenwechsel als Events).

| Aktion | Surface |
|--------|---------|
| Filter | Inline Chips |
| Eintrag öffnen (Mail/Doc) | Navigation / Viewer |
| Kunden-Update (Auftrag) | Inline/Sheet wenn nötig |

---

## 7 · (entfernt) Mehr-Tab

Stammdaten · Docs · Notizen · Geld leben in **Akte** (§4). Kein fünfter Compact-Tab.

---

## 8 · Header-Primary & ⋯ je Phase (entschlackt)

Nur **Verben**. Keine Navigation.

| Phase | Primary | ⋯ erlaubt |
|-------|---------|-----------|
| Anfrage | Angebot erstellen → Canvas/Funnel | Absagen, Nicht erreichbar, Notfall, Löschen |
| Angebot | Senden / Nachfassen / Auftrag anlegen | Ablehnen, Duplizieren, PDF |
| Auftrag | kontext: HW zuweisen · Rechnung · **Abnahme** · Abschließen | Storno, Nachtrag |
| Rechnung | Mahnen / Als bezahlt / Senden | Storno, Gutschrift, Korrektur |

Alles „Öffnen X“ → Übersicht PhaseCard / Strip / Zugehörig.

---

## 9 · (Reserviert)

Surfaces folgen in §10–11.

---

## 10 · DocumentCanvas — Paper, eine Seite, Inline first

### 10.1 Rahmen (Apple Paper / Sheet Feeling)

```
        bg.canvas (atmet)
   ┌─────────────────────────────────────┐
   │  ✕     Angebot erstellen       ✓    │  ← Title 2 · ✓ Speichern
   │  [Kunde] [Kopf] [Positionen] [Fuß]  │  ← Anker-Chips, kein Stepper
   │                                     │
   │         ┌─ paper ─────────────┐     │  ← bg.paper + Ambient Shadow
   │         │ KUNDE (Caption)     │     │
   │         │ … Inhalt …          │     │
   │         │ POSITIONEN    [ + ] │     │
   │         │ …                   │     │
   │         └─────────────────────┘     │
   │                                     │
   │      ╭─ glass bar ──────────╮       │  ← Floating, blur
   │      │ 👁  ✉  …             │       │
   │      ╰──────────────────────╯       │
   └─────────────────────────────────────┘
```

| Element | Soll |
|---------|------|
| Paper | Regular: Dokument schwebt über `bg.canvas`; Compact: full-bleed ok |
| Shadow | Ein Ambient Shadow — keine Excel-Tabelle auf Grau |
| Anker-Chips | Scroll-Sprung, **kein** Multistep |
| Floating DocActionBar | Glass (`bg.bar`); Scroll → kompakt, Stop → expandiert |
| ✓ Header | Speichern Entwurf |
| Senden | Glass-Bar → Versand-Sheet |

### 10.2 Inline Edit vs Sheet

| Aktion | First | Second |
|--------|-------|--------|
| Menge, kurzer Text, Datum auf Canvas | **In-place** auf dem Paper | — |
| Neue Position, Kunde wählen, komplex | Sheet Center (Regular) / Bottom (Compact) | — |
| Senden / Vorschau | Glass-Bar | Sheet / Viewer |

Sheet ist **Erweiterung**, nicht Default für jedes Tippen.

### 10.3 Welches Dokument — Sektionen

| Dokument | Canvas-Sektionen (Anker) | Sheet-Jobs |
|----------|--------------------------|------------|
| **Angebot** | Art/Kunde · Kopf · Positionen · Summen · Fuß | Kunde, Position (neu), Vorlage, Versand |
| **Rechnung** | Kopf · Bezug Auftrag · Positionen · Summen · Fuß | Position, Versand, Zahlungszuordnung |
| **Abnahme** | Übergabe · Personen · Bau · Checkliste · Ergebnis · Fotos · Unterschriften · Recht | Foto-Upload; Vorschau/Fertig in Bar |
| **Vertrag / Funnel** | eine Seite | Teilaufgaben Sheet |

### 10.4 Sheet aus Canvas

| | Regular | Compact |
|--|---------|---------|
| Layout | **Center-Modal** (am Fokus) | **Bottom Sheet** (medium/large, Drag Handle) |
| Header | ✕ · Headline · ✓ | gleich · ✓ über Keyboard |

---

## 11 · Sheet von Detail (nicht Canvas)

| | Regular | Compact |
|--|---------|---------|
| Layout | **Slide-over** | **Bottom Sheet** (Detents) |
| Breite Regular | ~400–480 | — |

Beispiele: Tel, Notiz, Tagebuch, Foto, Stammdaten — **wenn** nicht inline lösbar.

---

## 12 · Aktions-Matrix (komplett, nach Trigger)

| Nutzer will | Startet wo | Surface |
|-------------|------------|---------|
| Vorgang „das eine Verb“ | Header Primary | Canvas / Sheet / Server-Action |
| Seltenes Verb | Header ⋯ | ActionSheet → Confirm/Sheet |
| Zur anderen Phase | PhaseStrip / PhaseCard / Zugehörig | **Navigation** (+ Rückweg) |
| Kleines Feld | MetaGrid / Canvas-Zeile | **Inline** zuerst |
| Komplexes Feld | Sektion | EditorSheet |
| Position im Dokument | Canvas + | EditorSheet (Center/Bottom) |
| Neues AG/RE/Abnahme | Primary oder Sektion + | **DocumentCanvas** |
| Protokollliste | Vor Ort · Abnahme | Canvas / ⋯ Zeile |
| Tagebuch | Vor Ort · Tagebuch | EditorSheet |
| Foto | Übersicht MediaStrip | EditorSheet Upload |
| Dokument/Notiz | Akte · Dateien | EditorSheet |
| RE aus Plan | Akte · Zahlung | DocumentCanvas |
| PDF ansehen | Zeile / DocBar | Viewer / Download |

---

## 13 · Leere Zustände (ein Muster)

```
        (Icon 26, tertiary)
     Noch kein Abnahmeprotokoll
  Checkliste aus Leistungen — Protokoll erstellen.
        [ Protokoll erstellen ]
```

Headline · Footnote · ein Button.

---

## 14 · Alltag: Hin und Her (nicht nur Happy Path)

Der Happy Path ist die Demo. **Produktion:** Springen, Nachziehen, richtige RE finden, löschen, stornieren.

### 14.1 Problem (SoT)

| Situation | Schmerz ohne Spec |
|-----------|-------------------|
| RE → Auftrag → zurück | Context weg; welche RE? |
| Mehrere REs | Welche zum Abschlag? |
| Angebot trotz AU/RE | Angst vor Bruch |
| Löschen / Storno | Kette inkonsistent |

### 14.2 Projekt-Anker

```
Müller · Garten · AU-041                ← Footnote tertiary
Anfrage → Angebot → ● Auftrag → Rechnung
```

### 14.3 Rückweg-Chip

```
← Zurück zu RE-0142
```

| Regel | Soll |
|-------|------|
| Ziel | Genau das Dokument (`from=rechnung:uuid`) |
| Nach Canvas | Close → Ausgangs-Dokument |
| Stack | Ein Chip; tiefer = PhaseStrip / Zugehörig |
| Regular Kurz-Hop | Slide-over für kleine Edits |
| Compact | Navigation + Chip |

### 14.4 Zugehörig vs Akte · Zahlung

**Zugehörig** = Orientierung. **Akte · Zahlung** = Plan↔RE Arbeitswahrheit.

### 14.5 Ändern trotz späterer Phase

| Du willst | Erlaubt? | Pfad |
|-----------|----------|------|
| AU-Leistungen, REs da | Ja | Banner + Edit |
| AG still überschreiben nach AU | **Nein** | — |
| AG nach AU | Ja als Korrektur/Nachtrag | Canvas |
| Neue RE | Ja | Akte · Zahlung |
| RE stornieren | Ja | Header-⋯ |
| RE-Entwurf löschen | Ja | Confirm |
| Gesendete RE löschen | Nein | Storno |
| Abnahme neu | Ja | Neue Zeile |

### 14.6 Szenarien

**A** RE → AU → Chip zurück zur **gleichen** RE.  
**B** Welche RE? Akte · Zahlung + Zugehörig.  
**C** AG nach AU = Korrektur/Nachtrag-Canvas.  
**D** Storno + neue RE in Zugehörig.

### 14.7 Verboten

Navigation nur über ⋯ · Hop auf Liste · REs ohne Nr · stilles AG-Overwrite · generisches „Zurück“.

### 14.8 Technik

`from` · `AkteRueckwegChip` · `ZugehoerigListe` · Banner bei REs > 0 · Nachtrag verdrahten.

---

## 15 · Was bewusst wegfällt (Apple-Ruhe)

- Multistep-Formulare  
- Tab „Mehr“ und Top-Level Geld/Docs/Notizen/Stammdaten/Fotos/Verlauf/Historie  
- Navigation im Aktionsmenü  
- Doppel-Einstieg Marketing + Wizard  
- Mehr als eine Text-Primary  
- Sheet-first für triviale Felder  
- px-only Spec ohne Semantic Type  
- Happy-Path-only ohne Zugehörig/Rückweg  

---

## 16 · Motion & Haptics (Freigabe-Auflage)

| Ereignis | Motion | Haptik (wenn Bridge) |
|----------|--------|----------------------|
| Speichern ✓ | Checkmark-Settle 120–180ms | light impact |
| Senden ok | Bar-Pulse / Check | success |
| Status-Badge | soft crossfade / scale | — |
| Sheet present | spring detent | — |
| Floating Bar scroll | collapse/expand | — |
| Fehler | subtil shake | error |

Ohne Taptic: Motion trotzdem; Haptics optional.

---

## 17 · Apple Design Review — Abgleich

| Kritik | Spec-Antwort |
|--------|--------------|
| A Materialien / Dark | §0.1 |
| B Mehr-Tab | §2 max. 4; Akte bündelt |
| C Hart-Cut 768 | §0.4 Compact/Regular |
| D px-Typo | §0.2 Title2 / Headline / … |
| Canvas Excel-Feel | §10 Paper + Glass Bar |
| Inline vs Sheet | §10.2 Inline first |
| Alltag springen | §14 |

**Freigabe:** Ja, mit Auflagen §0 · §2 · §10 · §16.

---

## 18 · Implementierungs-Reihenfolge (Bau)

1. Spec SoT.  
2. Semantic tokens: type + materials (Hell/Dunkel).  
3. Shared: PhaseCard, ZugehoerigListe, AkteRueckwegChip, Tab **Akte**.  
4. Compact ohne Mehr; Regular Split **schmal** testen.  
5. Auftrag Übersicht + Vor Ort Protokoll-Liste.  
6. `from`-Rückweg Szenario A.  
7. Canvas Paper + Glass Bar + Inline MVP.  
8. Abnahme → eine Canvas-Seite.  
9. Motion §16.  
10. Smoke: Happy Path + A–D · Regular + schmales Fenster + Compact.

---

## 19 · Abnahme-Check (ohne UI gesehen)

1. Vorgang-Titel? → **Title 2**  
2. RE → Auftrag? → Strip / Card / Zugehörig  
3. Abnahmeprotokoll? → Vor Ort → Canvas  
4. Menge auf AG? → **Inline first**; neue Pos → Sheet  
5. Multistep? → **Nein**  
6. Header-⋯? → nur Verben  
7. Geschwister-REs? → Zugehörig + Akte · Zahlung  
8. Zurück zur RE? → Rückweg-Chip  
9. AG still nach AU? → **Nein**  
10. Compact Tabs max.? → **4**, kein Mehr  
11. Canvas-Look? → Paper + Glass Bar  
12. Schmales Mac-Fenster? → gleitet nach Compact  

---

*Ende Spec. Abweichungen nur über ENTSCHEIDUNGSLOG. Apple-Auflagen = Bestandteil der SoT.*
