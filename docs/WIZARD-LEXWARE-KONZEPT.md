# Wizard-Konzept — Lexware-Pattern für Bärenwald CRM

**Stand:** Juli 2026  
**Referenz:** Lexware Mobile (Angebot/Rechnung erstellen) — Screenshots 2026-07-27  
**Ziel:** Unsere Wizards (Angebot, Rechnung, Abnahme, Vertrag, Create Kunde) so umbauen, dass **eine Dokument-Seite** der Arbeitsplatz ist und **Kunde / Positionen / Teilaufgaben** über **Bottom Sheets** (mobil) bzw. **Modal / Side Panel** (Desktop) gelöst werden.

Verwandt: [WIZARD-UI-MUSTER.md](./WIZARD-UI-MUSTER.md) · [DESIGN_KONZEPT §9](./DESIGN_KONZEPT_CRM_UI_UX.md) · Welle **W11** in [AUDIT-TODOS.md](./AUDIT-TODOS.md)

---

## 1. Was Lexware macht (Ist-Referenz)

Lexware baut **keinen klassischen 5-Step-Stepper** für den Kern des Dokuments. Stattdessen:

| Muster | Lexware | Wirkung |
|--------|---------|---------|
| **Dokument-Canvas** | Eine Scroll-Seite „Angebot erstellen“ | Alles Wichtige auf einen Blick |
| **Sektionen** | `KUNDENANGABEN` · `KOPFBEREICH` · `POSITIONEN` · `FUSSBEREICH` | Klare Hierarchie |
| **Empty-CTA mit Strich** | „Kunde wählen“ / „Neue Position hinzufügen“ (gestrichelt) | Offener Job ist sichtbar |
| **Bottom Sheet** | Kunde wählen, Artikel, Produkt anlegen | Kontext bleibt erhalten |
| **Sheet-Header** | `X` · Titel · `✓` (grün) | Apple: Abbrechen / Bestätigen |
| **Sheet-Aktionen** | `+ Neu` · `Manuell` · `Freitext` | Sofort erstellen oder wählen |
| **Suche im Sheet** | Unten „Name“ (Daumenreichweite) | Mobil-first |
| **Hinzufügen-Liste** | Bei Kunde: Adresse, Mail, … als `+`-Zeilen | Progressive Disclosure |
| **Summen** | Zwischensumme → Gesamtbetrag-Band | Immer sichtbar nach Positionen |
| **Dokument-Toolbar** | Vorschau · Mail · Druck · Teilen · Löschen | Aktionen am Dokument, nicht am Step |

**Kernidee:** Die Seite *ist* das Dokument. Sheets sind *Werkzeuge*, keine Wizard-Schritte.

---

## 2. Soll für Bärenwald — ein Satz

> **Eine Dokument-Seite + Sheets für Teilaufgaben.** Mobil Bottom Sheet, Desktop dasselbe als Modal/Side-Panel. Brand bleibt Bärenwald (Hell/Grün) — Lexware liefert UX-Struktur, nicht Dark-Mode-Kopie.

**Gesamt-Regel Create/Edit:** [SURFACE-KONSOLIDIERUNG.md](./SURFACE-KONSOLIDIERUNG.md) (beschlossen).

| Surface | Mobile | Desktop |
|---------|--------|---------|
| DocumentCanvas | Fullscreen | Fullscreen |
| EditorSheet | Bottom Sheet | **Detail → Slide-over** · **Canvas → Center-Modal** |
| ActionSheet | kurz Bottom | Dropdown |
| Inline | Inline | Inline |

Overlay: Base + eine Layer-Familie; kein Modal-in-Modal.

---

## 3. Architektur: Canvas vs. Sheet

```
┌─ Dokument-Canvas (Fullscreen) ─────────────────────────┐
│  Header: [X]  Angebot erstellen              [✓ Speichern]│
│                                                         │
│  KUNDE          → tippen → Sheet „Kunde“                │
│  KOPF / META    → Felder inline oder Sheet              │
│  POSITIONEN     → + / gestrichelte CTA → Sheet „Artikel“│
│  SUMMEN         → immer auf Canvas                      │
│  FUSS / RECHT   → tippen → Sheet oder Inline            │
│                                                         │
│  [ Vorschau | Senden | … ]   ← Dokument-Toolbar         │
└─────────────────────────────────────────────────────────┘

        Sheet „Kunde“              Sheet „Position“
   ┌──────────────────┐       ┌──────────────────┐
   │ X  Kunde      +  │       │ X  Artikel       │
   │ [Liste/Suche]    │       │ +Neu Manuell Frei│
   │ … oder Neu       │       │ Liste / Empty    │
   │ ○○○ Name suchen  │       │                  │
   └──────────────────┘       └──────────────────┘
```

---

## 4. Mobile vs. Desktop (gleiche Jobs)

| Job | Mobile | Desktop (≥768) |
|-----|--------|----------------|
| Dokument öffnen | Fullscreen Canvas | Fullscreen oder zentrierter Max-Width (~720–880px) über Dim |
| Teilaufgabe (Kunde, Position, Produkt neu) | **Bottom Sheet** (große Top-Radius, Grabber optional) | **Centered Modal** *oder* **Right Slide-over** (gleiche Header: X · Titel · ✓) |
| Speichern / Fertig Dokument | Grüner ✓ oben links/rechts (Lexware-Style) **oder** Sticky Primary unten — **eine** Primary-Regel wählen (Empfehlung unten) |
| Übersicht Meta | Gruppierte Cards / Outline-Inputs | Identische Struktur, mehr Luft, 2-Spalten nur wo sinnvoll (Datum \| Gültig bis) |
| Positionsliste | Cards + FAB `+` | Gleiche Liste, DnD mit Griff, `+` als Button-Zeile |
| Dokument-Aktionen | Icon-Bar unten | Icon-Bar unten **oder** Toolbar unter Header — gleiche Icons/Reihenfolge |
| Tastatur | Sheet-Footer über Keyboard (`visualViewport`) | — |

### Empfehlung Primary (Bärenwald)

Lexware nutzt ✓ im Header. Wir haben heute Sticky „Weiter“.  
**Soll:**

| Aktion | Wo |
|--------|-----|
| **Dokument speichern / Entwurf** | Header ✓ (wie Lexware) |
| **Senden an Kunden** | Dokument-Toolbar (Brief) → öffnet Versand-Sheet |
| Kein Stepper-„Weiter“ mehr für Angebot/RE-Kern | Stepper nur noch für seltene Multi-Phase-Flows (optional Abnahme) |

Damit fühlt sich Angebot/RE wie Lexware an; Abnahme kann bei Bedarf Canvas *oder* 3-Step behalten.

---

## 5. Mapping: Lexware → unsere Wizards

### 5.1 Angebot erstellen / bearbeiten

| Lexware-Sektion | Bärenwald-Inhalt | Sheet? |
|-----------------|------------------|--------|
| Kunde wählen (gestrichelt) | Kunde / Projekt wählen | **Ja** — Sheet „Kunde“ (Suche + `+` Neu) |
| Nr / Datum / Gültig | Angebotsnr (auto), Datum, Gültig bis, Dauer-Stepper | Inline auf Canvas |
| Brutto/Netto | Preisformat / MwSt-Logik | Segmented auf Canvas |
| Kopfbereich Titel / Einleitung | Angebots-Titel, Einleitungstext (+ Vorlage-Chevron) | Inline; Vorlagen → Sheet |
| Positionen | Gewerke / Leistungen (wie heute PosBoard-Logik) | **Ja** — Sheet „Position“: Katalog / Manuell / Freitext / Gewerk |
| Summen + Gesamtrabatt | Netto/MwSt/Brutto, Nachlass | Canvas |
| Fuß Zahlungsbedingungen / Nachbemerkung | Zahlungsbedingungen, Hinweise, §13b/35a | Tippen → Sheet oder Inline-Card |
| Toolbar | Vorschau PDF, Mail senden, … | Dokument-Toolbar |

**Position hinzufügen (Sheet) — Lexware „Artikel“:**

```
Header:  X · Artikel · (optional ✓)
Chips:   + Neu  |  Manuell  |  Freitext  |  (Bärenwald: Aus Katalog)
Body:    Liste oder „Keine Positionen“
```

Nested: `+ Neu` öffnet Sheet „Leistung/Produkt anlegen“ (wie Lexware „Produkt anlegen“: Segmented, gruppierte Felder, ✓ speichern).

### 5.2 Rechnung erstellen

Gleiches Canvas-Muster wie Angebot:

| Sektion | Inhalt | Sheet |
|---------|--------|-------|
| Kunde / Auftrag | Bezug Auftrag wählen | Sheet |
| Positionen | Abzurechnende Leistungen | Sheet (Auswahl aus Auftrag + manuell) |
| Zahlung / Fälligkeit | Zahlungsbedingungen, Abschlagstyp | Inline / Sheet |
| Steuer-Hinweise | §13b, §35a | Canvas Toggles |
| Toolbar | Vorschau, Senden | wie Angebot |

### 5.3 Abnahmeprotokoll

Lexware-Dokument-Logik, fachlich anders:

| Canvas-Sektion | Sheet |
|----------------|-------|
| Auftrag/Kunde (read-only + Kontext) | — |
| Leistungen / Checkliste | Sheet „Position/Gewerk hinzufügen“; Status OK/Mangel inline |
| Ergebnis | Segmented / Radios auf Canvas |
| Fotos | Sheet oder Inline-Upload |
| Prüfen | Summen analog = Kurzüberblick + PDF |

Optional: Abnahme bleibt 3 Steps *oder* ein Canvas — Empfehlung **ein Canvas**, damit alle Dokument-Wizards gleich lernen.

### 5.4 Kunde anlegen (aus Sheet „+“)

Wie Lexware „Kunde anlegen“:

- Header: X · Titel · ✓  
- Segmented Firma | Person  
- Gruppierte Felder  
- Block **hinzufügen:** Adresse, Ansprechperson, Tel, Mail, … als `+`-Zeilen (öffnen Nested Sheets)

### 5.5 Was wir *nicht* 1:1 kopieren

| Lexware | Bärenwald |
|---------|-----------|
| Dark Mode | **Hell** + Brand-Grün (Mock-Tokens) |
| Strichcode scannen | Optional später; Platzhalter ok im Mock, nicht Pflicht MVP |
| Print/Share in Toolbar | Print optional; Share = Portal-Link/Mail |
| Tags | Nur wenn Fachbedarf |

---

## 6. Komponenten-Spec (für Mock + Code)

### 6.1 `DocumentCanvas` (ersetzt Step-Body für AG/RE)

- Fullscreen  
- Header: Close · Titel · Confirm (✓)  
- Scroll-Body mit Section-Labels (uppercase, muted)  
- Sticky Dokument-Toolbar unten  

### 6.2 `PickerSheet` / `EditorSheet`

| Element | Spec |
|---------|------|
| Container | Mobil: bottom sheet, top radius ~24–32px; Desktop: modal 480–560px oder slide-over 420px |
| Header | Circle X · Title · Circle ✓ (Primary) |
| Quick actions | Pill-Chips (Neu / Manuell / Freitext) |
| Liste | Cards, Icon + Label + Meta rechts |
| Search | Mobil unten im Sheet (Lexware); Desktop oben unter Header |

### 6.3 `DashedAddCard`

- Gestrichelter Border, Accent-Grün  
- Icon + Text („Kunde wählen“ / „Neue Position hinzufügen“)  
- Tippen öffnet Sheet  

### 6.4 `GroupedFieldCard`

- iOS-Settings-Gruppe: Zeilen Label links / Wert rechts  
- Divider zwischen Zeilen  
- Chevron = öffnet Sheet/Picker  

### 6.5 `AddRowList` („hinzufügen“)

- Zeilen mit grünem `+` Circle + Label  
- Tippen → Nested Sheet  

### 6.6 `DocActionBar`

- 4–5 Icons: Vorschau · Senden · (Druck) · (Mehr) · Verwerfen  
- Mobil sticky; Desktop sticky oder unter Header  

---

## 7. Wireflow (Angebot — Happy Path)

```
[FAB Neu Angebot]
       ↓
[DocumentCanvas leer]
       ↓ tippen „Kunde wählen“
[Sheet Kunde] → wählen ODER [+] → [Sheet Kunde anlegen] → ✓
       ↓
Canvas zeigt Kunde
       ↓ tippen „Position hinzufügen“
[Sheet Artikel] → Katalog / Manuell / Freitext
       ↓ ggf. [Sheet Produkt anlegen]
Canvas zeigt Positionen + Summen
       ↓ Zahlungsbedingungen tippen
[Sheet oder Inline]
       ↓
Toolbar „Vorschau“ → PDF-Sheet/Preview
Toolbar „Senden“ → Versand-Sheet
Header ✓ → Entwurf speichern & schließen
```

---

## 8. Migration vom heutigen CRM-Wizard

| Heute | Morgen (Lexware-Soll) |
|-------|------------------------|
| 5 Steps Angebot mit „Weiter“ | **1 DocumentCanvas**; Inhalte = Sektionen |
| Positionen im Step 2 full page | Positionen auf Canvas + **Sheet** zum Add/Edit |
| Kunde oft vorausgewählt / Step 1 Typ | Kunde als erste Dashed-CTA wenn leer |
| `MobileEditableBlock` pro Card | Bleibt verwandt; wird zu **GroupedField + Sheet** |
| `WizardShell` + Stepper | Shell bleibt; Stepper für AG/RE **optional aus** oder nur Desktop-Fortschritts-Dots „Füllgrad“ |
| Abnahme 7 Steps | Angleichen auf Canvas-Modell (W9 + W11) |

**Schrittweise Einführung**

1. **Mock v8:** Angebot Canvas + Kunde-Sheet + Position-Sheet + Kunde-anlegen-Sheet (Lexware-Parität)  
2. **Code MVP:** Angebot neu/bearbeiten auf DocumentCanvas  
3. Rechnung parallel  
4. Abnahme / Vertrag  
5. Stepper-Wizards nur noch wo wirklich Phasen nötig  

---

## 9. Desktop-Layoutskizze

```
┌────────────────────── max 840px ──────────────────────┐
│ [X]  Angebot erstellen                    [✓ Speichern]│
│────────────────────────────────────────────────────────│
│  KUNDE                                                 │
│  ┌─ Dashed / gewählter Kunde-Card ─────────────────┐  │
│  └─────────────────────────────────────────────────┘  │
│  KOPF          [ Titel ………… ] [ Gültig ………… ]         │
│  POSITIONEN    Liste + [+ Position]                    │
│  SUMMEN        sticky rechts optional bei breit        │
│  FUSS          Zahlungsbedingungen ›                   │
│────────────────────────────────────────────────────────│
│  📄  ✉️  🖨  ⋯  🗑                                      │
└────────────────────────────────────────────────────────┘

Sheet Desktop = Modal zentriert:
┌──────────────┐
│ X  Kunde  +  │
│ Suche        │
│ Liste …      │
└──────────────┘
```

Bei sehr breiten Screens: Canvas zentriert, links Dim — **kein** zweites Sidebar-CRM im Wizard.

---

## 10. Abgrenzung Brand

| | Lexware (Referenz) | Bärenwald |
|--|-------------------|-----------|
| Theme | Dark | **Light** (`--card`, `--bg`, Grün) |
| Accent | Mint/Teal | **bw-primary / Mock-Grün** |
| Radii | Sehr rund | Mock 12–16px Cards, Sheet top 20–28px |
| Typo | SF-like | Bestehende Mock-Stack |

---

## 11. Erfolgskriterien

- [ ] Angebot erstellen mobil: **eine** Scroll-Seite, Kunde & Position nur über Sheets  
- [ ] „+ Neu“ im Sheet kann Nested Sheet „anlegen“ öffnen  
- [ ] Desktop: gleiche Struktur, Sheets = Modal/Slide-over  
- [ ] Kein Pflicht-5-Step-Weiter mehr für AG/RE-Kern  
- [ ] Dokument-Toolbar: Vorschau + Senden erreichbar ohne Step-Ende  
- [ ] Designer-Mock und CRM sprechen dieselbe Sprache (DashedAdd, PickerSheet, DocActionBar)  

---

## 12. Nächste Schritte

| Wer | Was |
|-----|-----|
| **Designer / Claude Mock** | Standalone um **Angebot-Canvas + 3 Sheets** (Kunde, Artikel, Kunde/Produkt anlegen) ergänzen — siehe Prompt unten |
| **Dev** | `DocumentCanvas` + `PickerSheet` Bausteine; Angebot-Wizard umbauen (W11) |
| **PO** | Primary-Regel final: Header-✓ vs. Sticky (Empfehlung: ✓ = Speichern, Senden = Toolbar) |

### Kurzer Designer-Nachzieher (an Prompt anhängen)

```
Referenz-UX: Lexware Mobile Angebot/Rechnung (angehängte Screenshots).
Baue im bestehenden Bärenwald-Mock (Hell/Grün) einen Document-Canvas
„Angebot erstellen“ mit:
- Dashed „Kunde wählen“ → Bottom Sheet Kunde (Suche unten, + Neu)
- Nested Sheet „Kunde anlegen“ (Firma|Person, + Adresse/Mail/…)
- Dashed/FAB „Position hinzufügen“ → Sheet Artikel (+ Neu | Manuell | Freitext)
- Nested „Leistung anlegen“
- Summenband + Doc-Toolbar (Vorschau, Senden, …)
- Desktop-Variante: gleicher Canvas, Sheets als zentrierte Modals
Kein Dark-Mode-Klon — nur Interaktionsmuster.
```
