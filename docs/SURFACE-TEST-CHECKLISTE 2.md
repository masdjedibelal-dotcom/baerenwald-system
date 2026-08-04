# Surface — Test-Checkliste (Endzustand)

**Zielbild zum Abnehmen:** Canvas + Bottom Sheets mobil · Slide-over Desktop (Detail) · Center-Modal aus Canvas · kurze Copy.  
**SoT:** [UMSETZUNGSPLAN-SURFACE.md](./UMSETZUNGSPLAN-SURFACE.md)

Wenn alles grün ist, ist die Surface-Optimierung „eingestellt“.

---

## A · Layout & Surfaces (sichtbar ohne Code-Kenntnis)

| # | Was du tust | Erwartung Mobile | Erwartung Desktop | OK? |
|---|-------------|------------------|-------------------|-----|
| A1 | Angebot / Rechnung **neu** öffnen | **Eine** Fullscreen-Seite (Canvas), kein 5-Step-„Weiter“-Zwang | Gleiche Canvas-Seite | ☐ |
| A2 | „Kunde wählen“ tippen | **Bottom Sheet** von unten | **Center-Modal** (über Canvas) | ☐ |
| A3 | Im Sheet **+** / Neu Kunde | Sheet wechselt Inhalt (Nested), **kein** zweites Modal darüber | Gleich | ☐ |
| A4 | „Position hinzufügen“ | Bottom Sheet | Center-Modal | ☐ |
| A5 | Am **Auftrag**-Detail Leistung bearbeiten | Bottom Sheet | **Slide-over von rechts** (Detail sichtbar links) | ☐ |
| A6 | Kunde anlegen vom FAB/Liste | EditorSheet, **keine** parallele Fullpage-Form als zweite Wahrheit | Slide-over oder Sheet-Host | ☐ |
| A7 | Canvas unten | Icon-Leiste (Vorschau · Senden · … · Verwerfen), **kein** FAB + Bar gleichzeitig | Gleich | ☐ |

---

## B · Verhalten (S7–S10)

| # | Was du tust | Erwartung | OK? |
|---|-------------|-----------|-----|
| B1 | Im EditorSheet letztes Feld fokussieren (Tastatur) | Header mit **✓ bleibt sichtbar** | ☐ |
| B2 | Tippen, dann **X** / Swipe / Backdrop | „**Änderungen verwerfen?**“ → Verwerfen (rot) / Weiter bearbeiten | ☐ |
| B3 | Speichern mit ✓ | Sheet zu, **kein** Confirm | ☐ |
| B4 | Canvas **X** (ohne Verwerfen) | Schließt, Entwurf auto — **kein** Dirty-Confirm | ☐ |
| B5 | DocBar **Verwerfen** | Confirm ActionSheet (einzige destruktive Exit) | ☐ |
| B6 | Browser-/Android-**Back** bei offenem Sheet | Schließt Sheet (mit Dirty-Logik), nicht die ganze App/Seite | ☐ |
| B7 | Mobile Detail: Abschnitt tippen | Drill-Down Screen 2; Back = Zurück zur Abschnittsliste | ☐ |

---

## C · Hierarchie & Overload

| # | Was du siehst | Erwartung | OK? |
|---|----------------|-----------|-----|
| C1 | Vorgang-Header | **1** Primary-**Text**-Button (Verb) + **1** globales ⋯ | ☐ |
| C2 | Primary-Job | **Nicht** nochmal im ⋯ | ☐ |
| C3 | Tabs / Nav | **Kein** ⋯ an Tab-Einträgen; optional ✓/! | ☐ |
| C4 | Listen-Zeile | ⋯ nicht dauerhaft; Hover/Fokus Desktop oder Long-Press/Detail Mobile | ☐ |
| C5 | Canvas leer (Angebot) | ≤ **12 Wörter** Lesetext; **kein** Hint-Absatz; Map A | ☐ |
| C6 | Buttons | ≤ 2 Wörter (Sheet-Primary ≤ 3); Secondary Versand: **Ohne Versand** | ☐ |
| C7 | Versand-Sheet Titel | **Angebot senden** (bzw. Rechnung senden) | ☐ |

---

## D · Copy-Stichproben (Soll-Wörter)

| Ort | Soll lesen | Nicht mehr | OK? |
|-----|------------|------------|-----|
| Canvas Section | KUNDE · KOPF · POSITIONEN · FUSS | KUNDENANGABEN, lange Hints | ☐ |
| Empty Kunde | **Kunde wählen** | „Bitte Kunden auswählen oder…“ | ☐ |
| Empty Position | **Position hinzufügen** | „Neue Position hinzufügen oder…“ + Scan-Essay | ☐ |
| Dirty | **Änderungen verwerfen?** | Langer Möchten-Sie-Satz | ☐ |
| Toast | **Gespeichert** / **Gesendet** | Essays | ☐ |
| Angebot Entwurf Primary | ein Verb (lt. Status-Matrix) | Doppel Senden+Bearbeiten sichtbar | ☐ |
| Abnahme Ende | **Fertig** | PDF/Fertig als zwei Primaries | ☐ |
| RE Bezug | aus Auftrag → Section **AUFTRAG**; frei → **KUNDE** | beides | ☐ |

---

## E · Smoke Happy Paths

1. ☐ Angebot: Kunde wählen → Position → ✓ Speichern → DocBar Senden → Mail-Sheet  
2. ☐ Rechnung: Bezug wählen → Positionen → Senden  
3. ☐ Auftrag: Leistung edit (Slide-over/Sheet) → speichern → Liste aktualisiert  
4. ☐ Abnahme: Checkliste Status setzen → Fertig  

**Funktions-Delta (bewusst):** PDF/Mail-Backend kann vorerst Altsystem bleiben — UI-Surface zählt für diese Abnahme.

---

## Schnell: „Ist es schon da?“

| Signal | Noch alt | Schon neu |
|--------|----------|-----------|
| Angebot neu | Stepper + „Weiter“ | Eine Canvas-Seite |
| Kunde tippen | Zentriertes Modal / Route `/neu` | Bottom Sheet (mobil) |
| Leistung am Auftrag (Desktop) | Center Modal | **Rechts** Slide-over |
| Lange Hints unter Steps | Sichtbar | Weg / nur im Sheet |
| FAB + Icon-Bar auf Canvas | Beides | Nur DocActionBar + DashedAdd |
