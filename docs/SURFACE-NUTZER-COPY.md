# Nutzer-Copy — was man liest & tippt (Overload-Entschlackung)

**Zweck:** Alle **sichtbaren Texte** und **Aktionen** pro Surface — nicht Komponenten-Architektur.  
Zum Kürzen: Was steht **gleichzeitig** im ersten Viewport? Budget unten.  
**Stand:** Juli 2026 · SoT Surfaces: [SURFACE-KONSOLIDIERUNG.md](./SURFACE-KONSOLIDIERUNG.md)

---

## 0. Copy-Budget (gleichzeitig sichtbar)

| Zone | Max. Textblöcke | Max. Wörter gesamt (Richtwert) | Erlaubt |
|------|-----------------|--------------------------------|---------|
| **Header** | 1 Titel + 0 Hint | ≤ 4 Wörter Titel | X · Titel · ✓ (ohne Wort „Speichern“ wenn Icon klar) |
| **Pro Sektion** | 1 Label + Inhalt | Label ≤ 2 Wörter | Kein zweiter Erklärsatz unter dem Label |
| **DashedAdd / Empty** | 1 Zeile | ≤ 4 Wörter | Optional 1 Secondary ≤ 3 Wörter |
| **Hint unter Feld** | 0 default | 0; Ausnahme ≤ 6 Wörter | Nur wenn Label allein missverständlich |
| **Sheet-Header** | 1 Titel | ≤ 4 Wörter | Kein Untertitel |
| **Dirty-Confirm** | 1 Frage + 2 Actions | Frage ≤ 3 Wörter | „Änderungen verwerfen?“ |
| **Toast** | 1 Zeile | ≤ 8 Wörter | Fehler konkret, Erfolg kurz |

**Gleichzeitigkeits-Regel:** Im ersten Viewport zählen wir alles außer Section-Labels und Feld-Labels.  
**Ziel Canvas „Angebot erstellen“ (leer):** ≤ **12 Wörter** Lesetext (ohne Icons).

**Streich-Hierarchie:** erst Hints → dann Card-Titel die Section wiederholen → dann lange Button-Labels → dann doppelte Status-Texte.

---

## 1. DocumentCanvas — Angebot erstellen

### 1.1 Erster Viewport (leer) — Soll-Copy

| Slot | Nutzer liest / tippt | Token | Soll (kurz) | Streichen / nicht gleichzeitig |
|------|----------------------|-------|-------------|--------------------------------|
| Header-Titel | — | Display | **Angebot erstellen** | „Neues Angebot anlegen“, Step-Hints |
| Header X | abbricht | a11y | *(Icon)* · S9 Auto-Entwurf | Confirm bei X |
| Header ✓ | speichert Entwurf | a11y | *(Icon)* | „Speichern & schließen“, „Weiter“ |
| Section | — | Section | **KUNDE** | „KUNDENANGABEN“, „Kundeninformation“ |
| CTA | tippt | Body accent | **Kunde wählen** | „Bitte Kunden auswählen oder neu anlegen“ |
| Section | — | Section | **KOPF** | „KOPFBEREICH“, „Angebotsdetails“ |
| Feld | liest/tippt | Label\|Wert | **Nr.** · *(automatisch)* | „Angebotsnummer (wird automatisch vergeben)“ |
| Feld | tippt | Label\|Wert | **Datum** | — |
| Feld | tippt | Label\|Wert | **Gültig bis** | „Gültigkeitsdatum“ |
| Feld | tippt | Label\|Wert | **Tage** · Stepper | „Gültigkeitsdauer in Tagen“ |
| Segment | tippt | Body | **Netto** \| **Brutto** | Extra-Label „Preisformat“ wenn Segment klar |
| Section | — | Section | **POSITIONEN** | — |
| CTA | tippt | Body accent | **Position hinzufügen** | Scan-Essay; kein FAB + DocBar |
| Summe | liest | Body | **Zwischensumme** · 0,00 € | — |
| Summe | liest | Body semibold | **Gesamt** · 0,00 € | „Gesamtbetrag brutto…“ |
| Link | tippt | Hint accent | **Rabatt** | „Gesamtrabatt hinzufügen“ |
| Section | — | Section | **FUSS** | „FUSSBEREICH“ |
| Zeile | tippt | Body | **Zahlungsbedingungen** › | langer Default erst im Sheet |
| Zeile | tippt | Body | **Schlussbemerkung** › | — |
| DocBar | tippt | Icons | Vorschau · Senden · … · Verwerfen | Text an Icons |

**Wort-Budget erstes Viewport (Soll):** **≤ 12 Wörter** Lesetext.

### 1.2 Ist → Soll (heute zu lang)

| Ist (CRM/Wizard-Nähe) | Soll | Warum |
|----------------------|------|-------|
| Positionen & Preise — direkt zur Kalkulation | *(weg)* | Hint unter Step = Overload |
| Projekttitel, Beschreibung, Fotos & Gewerke | *(weg)* | Canvas-Sektionen reichen |
| Erscheint als einleitende Projekt-Beschreibung im Angebot | *(weg)* oder Sheet-Hint | Nicht auf Canvas |
| Neue Position hinzufügen oder… / Strichcode scannen | **Position hinzufügen** | Scan später, nicht Empty-State |
| Für weitere Optionen die + Taste lang drücken… | *(weg)* | Onboarding ≠ Alltags-UI |
| Keine Tags gesetzt | *(weg)* bis Tags existieren | Dead UI |
| Angebot versenden / Erstellen und versenden | DocBar **Senden** + Sheet | Primary = ✓ Speichern |

### 1.3 Positionskarte (wenn gefüllt) — gleichzeitig sichtbar

| Slot | Soll | Nicht |
|------|------|-------|
| Titel | Leistungsname | „Position 1:“ Prefix |
| Meta | `1 × 200,00 €` · `19 %` | „Menge“, „Einzelpreis“, „USt.-Satz“ als Extra-Zeilen Labels |
| Betrag | **200,00 €** | „Positionsbetrag brutto“ |
| Aktion | Tippen = edit · optional Swipe | ⋯ + „Bearbeiten“ + „Löschen“ alle drei sichtbar |

---

## 2. DocumentCanvas — Rechnung erstellen

Analog Angebot; abweichende Labels:

| Slot | Soll |
|------|------|
| Header | **Rechnung erstellen** |
| Section Kunde/Bezug | **AUFTRAG** oder **KUNDE** (ein Bezug, nicht beides) |
| Nr. | **Nr.** · *(automatisch)* |
| Datum | **Datum** |
| Fällig | **Fällig** |
| Art | Segment **Abschlag** \| **Schluss** \| **Einzel** (nur nötige) |
| Positionen / Summen / Fuß | wie Angebot |
| DocBar Senden | **Senden** |

**Streichen:** „Rechnung zum Versand“, „Pflichtdokument“, doppelte Paket-Labels („Individualisieren“ / „Paket“).

---

## 3. PickerSheet — Kunde

| Slot | Soll | Streichen |
|------|------|-----------|
| Titel | **Kunde** | „Kunde auswählen“, „Kunden suchen und zuweisen“ |
| + | *(Icon, aria: Neu)* | „Neuen Kunden anlegen“ |
| Empty | **Keine Kunden** | „Es wurden noch keine Kunden gefunden. Legen Sie…“ |
| Suche Placeholder | **Name** | „Kundenname oder Nummer eingeben“ |
| Zeile | Name · Nr. | Unterzeile mit Adresse+Mail+Tel gleichzeitig |

**Gleichzeitig:** Titel + optional Empty **oder** 1+ Zeilen + Suche. Kein Hint unter dem Titel.

---

## 4. EditorSheet — Kunde anlegen

| Slot | Soll | Streichen |
|------|------|-----------|
| Titel | **Kunde anlegen** | „Neuen Kunden erfassen“ |
| Segment | **Firma** \| **Person** | Extra-Label „Kundentyp“ |
| Feld | **Firma** / **Name** | — |
| Feld | **Notiz** | „Interne Notiz (nicht auf Dokumenten)“ → max. Caption im Sheet wenn nötig |
| Feld | **Nr.** · *(automatisch)* | Section „Kundeninformation“ + langer Placeholder |
| Add-Zeilen | **Adresse** · **Kontakt** · **Telefon** · **E-Mail** · **Web** · **Bank** · **Steuer** | „hinzufügen“ als große Überschrift + Erklärung |
| ✓ | Speichern | „Kunde speichern und übernehmen“ |
| Dirty X | → „Änderungen verwerfen?“ | — |

**Gleichzeitig start:** Titel + Segment + ≤3 Felder + Add-Liste-Labels.  
**Nicht** alle Adressfelder sofort offen.

---

## 5. PickerSheet — Position / Artikel

| Slot | Soll | Streichen |
|------|------|-----------|
| Titel | **Position** | „Artikel / Leistung auswählen“ |
| + Header | *(einziges Neu)* | Chip „Neu“ zusätzlich |
| Chips | **Manuell** · **Katalog** | „Freitext“ als drittes Neu |
| Empty | **Keine Treffer** | „Keine Positionen vorhanden“ |
| Suche | **Suche** | „Bezeichnung, Nr. oder GTIN“ |

---

## 6. EditorSheet — Leistung / Position anlegen·bearbeiten

| Slot | Soll | Streichen |
|------|------|-----------|
| Titel | **Position** / **Leistung** | „Position bearbeiten – Details“ |
| Segment | **Produkt** \| **Service** | nur wenn fachlich nötig |
| Felder | **Bezeichnung** · **Nr.** · **Menge** · **Einheit** · **Preis** · **Steuer** | Doppel: VK netto + brutto + Hinweiszeilen |
| Optional Add | **Beschreibung** · **Notiz** | Sofort zwei Textareas |
| ✓ | Speichern | „Übernehmen und schließen“ |

**≤8 Felder sichtbar.** Beschreibung hinter Add-Zeile.

---

## 7. Detail — VorgangHeader (Angebot / Auftrag / RE)

| Slot | Soll gleichzeitig | Streichen |
|------|-------------------|-----------|
| Titel | Kurzname / Nr. | Langer Projekt-Essay im Header |
| Status | **1 Chip** | Chip + Banner + gleicher Status in Tabs |
| Primary | **1 Verb:** Senden / Abnehmen / Rechnung … | Primary + gleicher Eintrag im ⋯ |
| ⋯ | Seltenes: Löschen, Storno, Historie | Bearbeiten, Senden, Drucken alle im ⋯ |

### Primary-Verben (Soll-Wortlaut) — entschieden (0.13)

| Kontext | Primary (Text) | Nicht |
|---------|----------------|-------|
| Angebot **Entwurf** | **Bearbeiten** | „Fortsetzen und versenden“; kein zweites Senden |
| Angebot bereit / gesendet-fähig | **Senden** | Langer Button-Text; Senden nicht nochmal im ⋯ |
| Auftrag Phase Abnahme | **Abnahme** | „Abnahmeprotokoll erstellen“ |
| Auftrag Zahlung offen | Badge **Zahlung offen**; Primary bleibt Phasen-Job | Primary „Rechnung“ während Abnahme-Job |
| RE Entwurf | **Senden** | Essay-Button |
| Abnahme Canvas Ende | **Fertig** | Zwei Primaries PDF + Fertig |
| RE Bezug Section | aus Auftrag → **AUFTRAG**; ohne Auftrag → **KUNDE** | Beide Sections |

---

## 8. Detail — Abschnitte (Nav / Tabs)

| Slot | Soll | Streichen |
|------|------|-----------|
| Nav-Label | **Übersicht** · **Leistungen** · **Zahlung** · **Vor Ort** · **Aktivität** | Lange Tab-Namen + ⋯ |
| Status in Nav | ✓ / ! Icon | Text „3 von 5 Feldern ausgefüllt“ in jedem Tab |
| Content-Titel | = Nav-Label | Nochmal „Leistungen im Auftrag“ + Hint-Absatz |
| Empty Leistungen | **Keine Positionen** + CTA **Hinzufügen** | Marketing-Empty |

---

## 8b · Zahlung / Zahlplan-Tab (0.15)

| Slot | Soll | Streichen |
|------|------|-----------|
| Lese-Ansicht | Tabelle Raten · Fortschritt | Sofort voller Editor |
| CTA | **Plan bearbeiten** | „Abschlagsplan konfigurieren und speichern“ |
| CTA | **Nächste Rechnung** | „Nächste Abschlagsrechnung jetzt erstellen“ |
| Mahnstufe | Caption **Mahnung 1** / **2** / **3** | Lange Rechts-Hinweise in der Zeile |

Editor = EditorSheet / Modal hinter Lese-Ansicht (Pilot Bereich 4).

---

## 9. ActionSheet — global ⋯ / Dirty / Listen

| Sheet | Zeilen (Soll) | Max. |
|-------|---------------|------|
| Dirty | **Änderungen verwerfen?** · **Verwerfen** · **Weiter bearbeiten** | 1+2 |
| Angebot ⋯ | Löschen · Duplizieren · Historie … | ≤ 5; Primary nicht hier |
| Listen-Zeile ⋯ | Öffnen · … | ≤ 4 |

**Wortlaut Confirm:** immer **Änderungen verwerfen?** — nicht „Möchten Sie die ungespeicherten Änderungen wirklich verwerfen?“

---

## 10. DocActionBar & Versand-Sheet

| Ort | Soll | Streichen |
|-----|------|-----------|
| DocBar | Icons only | „Vorschau PDF“, „E-Mail senden“, „Drucken“, „Teilen“, „Löschen“ als Textzeile |
| Versand-Sheet Titel | **Angebot senden** / **Rechnung senden** | „Angebot per E-Mail…“ |
| An | **An** | „Empfänger-E-Mail-Adresse“ |
| Betreff | **Betreff** | — |
| Primary | **Senden** | „Angebot jetzt senden“ |
| Secondary | **Ohne Versand** | „Ohne Mail speichern“ / lange Varianten |

---

## 11. Abnahme — Canvas (kurz)

| Slot | Soll |
|------|------|
| Header | **Abnahme** |
| Section | **CHECKLISTE** |
| CTA | **Position hinzufügen** · **Gewerk** |
| Status je Zeile | **OK** · **Mangel** · **Offen** (kurz) |
| Section | **ERGEBNIS** |
| Primary Ende | **Fertig** | „PDF“ als zweite Primary; langen Wizard-Finish |

**Streichen:** 7 Step-Titel + lange Meta-Hints gleichzeitig; „Zusätzlicher Punkt“ / erzwungene „Sonstiges“-Labels.

---

## 12. Toasts & Fehler (sichtbar kurz)

| Fall | Soll |
|------|------|
| Gespeichert | **Gespeichert** |
| Gesendet | **Gesendet** |
| Fehler generisch | **Speichern fehlgeschlagen** |
| Keine Mail | **Keine E-Mail** — Versand im Sheet klären, nicht Essay-Toast |

---

## 13. Gleichzeitigkeits-Maps (zum Abhaken)

### Map A — Angebot Canvas leer (Mobile erste Screenhöhe)

```
Angebot erstellen          ✓
KUNDE
  Kunde wählen
KOPF
  Nr.  Datum  Gültig
  Netto | Brutto
POSITIONEN
  Position hinzufügen
Zwischensumme / Gesamt
```
☐ ≤1 Primary (✓)  
☐ Kein Hint-Absatz  
☐ Kein zweiter Titel  

### Map B — EditorSheet Position

```
Position                   ✓
Bezeichnung
Menge  Einheit  Preis
Steuer
+ Beschreibung
```
☐ ≤8 Felder  
☐ Kein Canvas-Titel darunter  

### Map C — Detail Auftrag Header

```
Auftrag Müller · AG-12     [Abnahme]  ⋯
[ Übersicht | Leistungen | … ]
```
☐ Primary ≠ Eintrag in ⋯  
☐ Ein Status-Chip  

---

## 14. Verbotene Doppel-Texte (Hard Ban)

| Wenn sichtbar … | Dann nicht gleichzeitig … |
|-----------------|---------------------------|
| Section **POSITIONEN** | Card-Titel „Positionen“ / Hint „Positionen erfassen“ |
| Header **Angebot erstellen** | Step-Label „Positionen“ + „Weiter“ als zweite Primary-Story |
| Button **Senden** | Banner „Jetzt an Kunden senden“ |
| Chip Status | Gleicher Status als Fließtext darunter |
| Dashed **Kunde wählen** | Placeholder „Noch kein Kunde…“ + Button „Kunde“ |
| ✓ Icon | Sticky Footer „Speichern“ mit gleichem Job |

---

## 15. Nächster Schritt für dich (Review)

1. Maps A–C gegen Mock/CRM legen.  
2. Jeden **Hint** > 6 Wörter streichen oder ins Sheet verschieben.  
3. Jeden Button > **2 Wörter** kürzen (Ausnahme Sheet-Primary ok bis 3).  
4. Liste „Ist“-Strings in Code später gegen diese Soll-Tabelle ersetzen (Welle Copy/W11).

*Living doc — bei neuen Surfaces Zeile hier ergänzen, nicht nur in der Komponenten-Übersicht.*
