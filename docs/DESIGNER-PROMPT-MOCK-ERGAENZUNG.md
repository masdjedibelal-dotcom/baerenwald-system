# Designer-Prompt — Mock ergänzen (nicht neu erfinden)

**Für:** Claude Designer / Mock-HTML  
**Kanonische Basis:** `Baerenwald CRM (standalone) (7).html` (oder neueste Standalone, falls neuer)  
**Regel:** Vieles ist schon im Mock. **Ergänzen, vereinheitlichen, Lücken schließen** — keine Parallelwelt, kein Redesign der gesamten App.

Kopiere den Block „PROMPT“ unten 1:1 an Claude.

---

## PROMPT

```
Du bist Product/UI Designer für das Bärenwald CRM (Handwerk / Bauprojekte).

# Auftrag
Erweitere den bestehenden CRM-Mock (Standalone HTML). NICHT von Null neu bauen.
Ziel: State-of-the-Art Mobile-App-Feeling + klares Desktop-CRM — gleiche Jobs, andere Darstellung.

# Quelle / Basis (Pflicht)
- Arbeite auf dem vorhandenen Mock: „Baerenwald CRM (standalone) (7).html“ (oder die neueste Standalone-Datei, die ich dir gebe).
- Behalte bestehende Screens, Tokens, Typo, Grün-Brand, Mock-Klassen (card, list-row, btn, wizard, sheet, …).
- Entferne nichts, was schon produktiv gemeint ist — außer es widerspricht den Produktentscheidungen unten.
- Wo etwas schon existiert (Angebot-Wizard, RE-Wizard, Vorgänge, Auftrag-Detail): nur Lücken und Inkonsistenzen füllen.

# Nordstern
- Desktop = Büro-CRM (Stepper, Cards inline, eine Primary).
- Mobile = App (Bottom Sheets, Sticky Weiter, Übersicht tippen → Sheet bearbeiten → Fertig).
- Job-Parität, keine Pixel-Kopie Desktop→Mobile.

# Produktentscheidungen (verbindlich)
1) Auftrag mobil — genau 5 Kern-Tabs + „Mehr“:
   Übersicht · Leistungen · Zahlung · Vor Ort · Aktivität
   Rest (Dokumente, Stammdaten, …) unter „Mehr“.
   „Vor Ort“ darf NICHT unter Mehr verschwinden.

2) Auftrag „fertig/erledigt“ = abgeschlossen (Arbeit nach Abnahme/Abschluss),
   NICHT „bezahlt“. Zahlung lebt auf der Rechnung.
   Sichtbar: Badge „Zahlung offen“ am erledigten Auftrag.
   My Work / Dashboard: Zeile „RE überfällig“ für den Geld-Job.

# Was du im Mock ergänzen / vereinheitlichen sollst

## A — Flow-Kit (wiederverwendbare Bausteine)
Definiere und zeige einmal klar (Komponenten-Galerie oder Annotierung):
- WizardShell: Mobile Toolbar (X · Dots · optional Zurück) + Sticky Footer „Weiter“
- Desktop: Titel · Stepper · Zurück/Weiter im Header
- Card + Overview-Zeilen (Label/Wert) + Button „Bearbeiten“
- Bottom Sheet: Titel · Formular · Primary „Fertig“
- Action Sheet für ⋯ (Versenden, Ablehnen, Status, Partner)
- FlowStepIntro: Titel 17px + Hint 13px muted

## B — Wizards (Lexware DocumentCanvas — Priorität)
**Soll Angebot/Rechnung:** eine Dokument-Seite (kein Pflicht-5-Step-Weiter), Sektionen Kunde · Kopf · Positionen · Summen · Fuß.
Bereits da: ältere Angebot-/RE-Stepper — wo vorhanden, auf Canvas-Muster umbauen bzw. parallel zeigen.
Ergänze:
1) **Angebot erstellen** (Lexware-Parität, Hell/Grün):
   - Dashed „Kunde wählen“ → Bottom Sheet (Suche + Liste + `+` Neu)
   - Nested Sheet „Kunde anlegen“ (Firma|Person, + Adresse/Mail/…)
   - Dashed/FAB Position → Sheet Artikel (`+ Neu` | Manuell | Freitext | Katalog)
   - Nested „Leistung anlegen“
   - Summenband + Doc-Toolbar (Vorschau, Senden)
   - Desktop: gleicher Canvas, Sheets = zentrierte Modals
2) Abnahmeprotokoll: gleiches Canvas-Modell oder max. 3 Steps; Checkliste + Add-Sheet
3) Vertrag / Staff: gleiche Shell/Canvas-Sprache
4) Details: [WIZARD-LEXWARE-KONZEPT.md](./WIZARD-LEXWARE-KONZEPT.md)

## C — Create & Aktionen
- FAB / „Neu“: Anfrage, Angebot, Rechnung, Abnahme → gleicher Einstieg in WizardShell
- Detail-Aktionen mobil: Versenden, Ablehnen, Stornieren, Partner anfragen → Bottom Sheet / Action Sheet (kein Desktop-Popover auf dem Phone)
- Desktop: gleiche Schritte als Modal oder Inline-Panel

## D — Auftrag-Detail (Tabs)
- Zeige Auftrag-Detail mobil mit exakt den 5 Kern-Tabs + Mehr
- Tab „Vor Ort“: Segmented Control Abnahme | Tagebuch | Abschluss (nicht alles übereinander scrollen)
- Abnahme-Einstieg: ein klarer Primary „Abnahme starten/bearbeiten“ + Protokoll-Liste (kein Doppel-Inline+FillFlow+Wizard)
- Erledigter Auftrag: Status abgeschlossen + Badge „Zahlung offen“ wenn RE offen
- Primary statusabhängig (nicht immer „Rechnung erstellen“ bei Abnahme)

## E — My Work / Dashboard
- Erste Viewport: Arbeitsliste (WV, stille Angebote, RE überfällig) — Charts sekundär
- Zeile „RE überfällig“ sichtbar

## F — Nicht neu erfinden
Nicht anfassen / nicht ersetzen, außer Inkonsistenz:
- Vorgänge-Liste Kern, Sidebar-Nav Positivliste, PosBoard/Leistungen-Grundmuster
- Angebot 5-Step-Logik, RE-Steuer-Checkboxen falls schon im Mock
- Bewusst entfernt laut Produkt: Aktion-Spalte, Kontext-Badge-Spam in Listen (siehe MOCK-POSITIVLISTE)

# Lieferformat
1) Aktualisierte Standalone-HTML (eine Datei), versioniert z.B. „(8)“ oder Changelog oben im File.
2) Kurzes Changelog: was NEU / was ANGEGLICHEN / was unverändert.
3) Annotierte Screenshots oder Screen-Liste:
   - Mobile: Wizard Abnahme (Overview→Sheet), Auftrag 5 Tabs, Vor-Ort Segment, Action Sheet Versenden, My Work
   - Desktop: gleicher Wizard mit Stepper+Cards, Auftrag-Detail mit Primary
4) Komponenten-Notiz: welche neuen Klassen/States (sheet, overview, segmented, badge zahlung-offen)

# Design-Qualität
- Bärenwald Grün, Mock-Tokens, 0.5px Borders, keine lila/AI-Generic-Look
- Mobile: große Tap-Targets, Sticky Primary über Soft-Keyboard denkbar
- Keine doppelten Primaries auf einem Screen
- Deutsch, klare Verben (Senden, Weiter, Fertig, Abnahme starten)

# Erfolgskriterium
Ein Entwickler kann den Mock 1:1 als Positivliste lesen und im CRM umsetzen, ohne neue Produktfragen zu #3 Tabs, #5 fertig≠bezahlt, oder Sheet-vs-Inline.
```

---

## Optional: Anhänge an Claude mitgeben

| Datei | Warum |
|-------|--------|
| `Baerenwald CRM (standalone) (7).html` | Basis-Mock |
| **Lexware-Screenshots** (Angebot/Kunde/Artikel/Produkt) | UX-Referenz DocumentCanvas |
| `docs/WIZARD-LEXWARE-KONZEPT.md` | Soll-Konzept Canvas + Sheets |
| `docs/WIZARD-UI-MUSTER.md` | Sheet/Desktop-Regel |
| `docs/AUDIT-TODOS.md` (Welle 9 + 11) | Scope |
| `docs/ENTSCHEIDUNGSLOG.md` (Abschnitt 2026-07-27) | #3 / #5 |
| `docs/MOCK-POSITIVLISTE.md` | Was bewusst nicht existiert |

## Was der Designer bewusst *nicht* machen soll

- Komplettes CRM-Redesign / neues Farbschema  
- Desktop-Bottom-Sheets nachbauen  
- Vor Ort unter „Mehr“ verstecken  
- Auftrag-Status „bezahlt“ als Erledigt-Zustand  
- Zweite, parallele Mock-Welt neben v7  
