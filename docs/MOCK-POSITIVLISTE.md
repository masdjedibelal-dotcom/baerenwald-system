# Mock-Positivliste

**Quelle:** `~/Downloads/Baerenwald CRM (standalone) (7).html` (Gzip-eingebettetes JSX; ersetzt v4/v6 ab 2026-07-16).  
**Regel:** Nur was im Mock gerendert wird, existiert. CSS-Klassen ohne Screen-Markup zählen nicht.  
**Geltung:** Einzige Existenzberechtigung für CRM-UI ab Erstellung dieses Dokuments.

Pro Screen: **(1) Element** · **(2) Exakter Text** · **(3) Verhalten**.

---

## Bewusst entfernt (Produktentscheidung)

Gilt auch, wenn der Mock sie noch rendert bzw. State dafür hat:

| Was | Mock-Stand | CRM-Regel |
|-----|------------|-----------|
| **Kontext-Badges** in Vorgangsliste (Notfall / Wartet auf Freigabe / Kanal) | `CTX_MAP` / `ContextBadges` existieren; in `VorgaengeList`-Zeilen **nicht** gerendert (`CTX_KANAL` leer) | Nicht einführen |
| **Spalte „Aktion“** / NeedsAction-Badge in Vorgangszeilen | Gerendert: `SortHead col="aktion"`, `vg-aktion`, `act-badge` („Wartet auf Freigabe (HV)“) | **Entfernen** — Spalte und Badge nicht im CRM |
| **Chip „Aktion nötig“** in der Vorgangs-Listbar | Gerendert (`bell` + Count, filtert `needsAction`) | **Entfernen** |
| **Gruppentrenner** „Aktion nötig“ / „Weitere“ | Im aktuellen Mock-JSX **nicht** gerendert (nur `actionCount`-State) | Nicht einführen |

Abhängig davon: Keine Gruppierung der Vorgangsliste nach Aktionsbedarf.

---

## App-Shell

### Sidebar

**(1) Element**
- Brand: Logo-Mark „B“, Label, Toggle rechts (`layout-sidebar-left-collapse` / `layout-sidebar-left-expand`)
- Sektionen + Einträge mit Icon:
  - **Arbeit:** Dashboard (`layout-dashboard`), Vorgänge (`folders`)
  - **Stammdaten:** Kunden (`users`), Handwerker (`tool`), Partner (`building`)
  - **Planung:** Kalender (`calendar`)
- Footer: Einstellungen (`settings`); Nutzerzeile Avatar „BB“ + Name (kein Icon-Name)

**(2) Exakter Text**
- Sektionen: `Arbeit`, `Stammdaten`, `Planung`
- Einträge: `Dashboard`, `Vorgänge`, `Kunden`, `Handwerker`, `Partner`, `Kalender`, `Einstellungen`, `Beran Bärenwald`
- Toggle-`title`: `Sidebar ausklappen` / `Sidebar einklappen`

**(3) Verhalten**
- Eintrag → `navigate(id)` (Liste, kein Detail)
- Toggle → Sidebar ein-/ausklappen
- Einstellungen → `navigate("einstellungen")`
- Nutzerzeile: kein `onClick` im Mock

### Bottom-Nav (Mobil)

**(1) Element**
- Tabs aus `MOBILE_PRIMARY`: Dashboard, Vorgänge, Kalender
- Reihenfolge: 2 Tabs → Mittel-FAB (`plus`, 52px-CTA) → restliche Tabs → `Mehr` (`dots`)

**(2) Exakter Text**
- Labels der Tabs = Nav-Labels; FAB `aria-label`: `Neu erstellen`; letzter Tab: `Mehr`

**(3) Verhalten**
- Tab → `navigate(id)`
- FAB → Neu-Popover öffnen
- Mehr → `navigate("mehr")`

### Topbar

**(1) Element**
- Listentitel **oder** Breadcrumb „… Details“
- Such-Trigger (`search`) nur ohne Detail-Selektion
- Glocke (`bell`); auf Einstellungen ggf. Speichern (`device-floppy`)
- Detail: Zurück-Link

**(2) Exakter Text**
- Such-Trigger: `Suchen…`
- Glocke: `Benachrichtigungen`
- Zurück: `Zurück zu den Vorgängen` bzw. `Zurück zu {Liste}`
- Speichern (Einstellungen): `Speichern`

**(3) Verhalten**
- Such-Trigger / ⌘K → Command Palette
- Zurück → Navigation zur Liste

### Neu-Popover (FAB / Bottom-CTA)

**(1) Element**
- Overlay + Popover; Liste mit Separator; jedes Item Icon + Label
- Desktop-FAB (`plus`) gleiche Aktion (ausgeblendet bei Wizard/Einstellungen/Neu)

**(2) Exakter Text**
- Kopf: `Neuen Vorgang erstellen`
- Einträge: `Anfrage` (`inbox`), `Angebot` (`file-invoice`), `Auftrag` (`briefcase`), `Rechnung` (`receipt`), Trenner, `Kunde` (`users`), `Handwerker` (`tool`), `Partner` (`building`)

**(3) Verhalten**
- Overlay schließt
- Angebot → Angebots-Wizard; sonst → Screen `neu` mit Typ bzw. Form

### ⌘K Command Palette

**(1) Element**
- Overlay, Suchfeld, `ESC`-Hinweis
- Trefferliste **oder** Gruppe „Letzte Suchen“
- Leerzustände

**(2) Exakter Text**
- Placeholder: `Suche nach Kundenname, Titel, Nummer, Ort…`
- Gruppe: `Letzte Suchen`
- Leer: `Tippe, um zu suchen` · `Keine Treffer für „{q}"`
- Treffer-`sub` (Beispiele): `Anfrage · …`, `Auftrag · …`, `Angebot · …`, `Kunde · …`, `Handwerker · …`, `Partner · …`

**(3) Verhalten**
- ⌘K / Ctrl+K togglet
- Suche über Anfragen, Aufträge, Angebote, Kunden, Handwerker, Partner (max. 12)
- Enter/Klick → Recent speichern, schließen, Navigation zum Treffer
- Demo-Recents: `Koch`, `Badsanierung`, `Weidner`

### Löschen-Modal

**(1) Element**
- Modal Icon `trash`; Footer Abbrechen + Löschen

**(2) Exakter Text**
- Titel: `Wirklich löschen?`
- Body: `{label} wird dauerhaft entfernt. Dieser Vorgang kann nicht rückgängig gemacht werden.`
- Buttons: `Abbrechen`, `Löschen`

**(3) Verhalten**
- Löschen führt `onConfirm` aus

---

## Dashboard

**(1) Element**
- Datumszeile + Begrüßung
- 4 KPI-Karten (`kpi-grid`): Icon + Wert + Label
- 4 Phasen-Cards: Titel-Icon, Pfeil-Button (`arrow-right`), bis 4 Zeilen mit Badge; Leerzeile

**(2) Exakter Text**
- Begrüßung: `Guten Morgen` / `Guten Tag` / `Guten Abend` + `, Beran`
- KPIs: `Neue Anfragen` (`inbox`), `Offene Angebote` (`file-invoice`), `Aktive Aufträge` (`tool`), `Offene Rechnungen` (`receipt`)
- Phasen: `Anfragen`, `Angebote`, `Aufträge`, `Rechnungen`
- Leer: `Nichts offen`

**(3) Verhalten**
- KPI → Navigation zur jeweiligen Phase/Liste
- Phasen-Pfeil → gleiche Navigation
- Zeile → Detail der Entity

---

## Vorgänge (Listen-Screen)

### Listbar

**(1) Element**
- Phasen-Chips mit Count + Icon (außer „Alle“)
- Vertikaler Trenner
- Chip „Aktion nötig“ (`bell` + Count) — **siehe Bewusst entfernt**
- Actions: Filter & Suchen (`filter`), Auswählen (`checks`), Export (`download`)

**(2) Exakter Text**
- Chips: `Alle`, `Anfrage`, `Angebot`, `Auftrag`, `Rechnung`
- Chip: `Aktion nötig`
- Buttons: `Filter & Suchen` / `Filter & Suchen ({n})`, `Auswählen` / `Auswahl ({n})`, `Export`

**(3) Verhalten**
- Phasen-Chip setzt Phase-Filter (`alle` | `anfrage` | `angebot` | `auftrag` | `rechnung`)
- Count-Logik: `alle` = Gesamtzahl Vorgänge; sonst Anzahl mit `v.phase === p` (über Basisdaten, nicht über Statusfilter)
- „Aktion nötig“ filtert `needsAction` — **CRM: weglassen**
- Auswählen togglet Multi-Select (Checkbox-Spalte +36px), Selection leeren
- Export → Toast `Export gestartet`

### Filter-Modal

**(1) Element**
- Suche-Input; Felder Kunde/Vorgang; Phase-Chips; Status-Chips; Wert von/bis; Datum von/bis
- Footer: Zurücksetzen, Anwenden

**(2) Exakter Text**
- Titel: `Filter & Suchen` · Sub: `Vorgänge eingrenzen`
- Sektionen: `Suche`, `Phase`, `Status`
- Suche-Placeholder: `Kunde, Vorgang, Ort, Nummer…`
- Labels: `Kunde` / Placeholder `Name enthält…`, `Vorgang` / `Titel enthält…`, `Wert von (€)`, `Wert bis (€)`, `Datum von`, `Datum bis`
- Buttons: `Zurücksetzen`, `Anwenden ({n})`

**(3) Verhalten**
- Suche filtert über `titel + kunde + id + ort` (case-insensitive)
- Phase/Status/Wert/Datum wie Felder
- Zurücksetzen leert alle Filter inkl. Phase=`alle`
- Filter wirken live; Anwenden schließt nur

### Tabelle

**(1) Element**
- Header sortierbar: Kunde · Vorgang · Aktion · Phase · Wert · Datum · Status · (leer für ⋯)
- Im Auswahlmodus: Checkbox-Spalte vorne (Header = alle wählen)
- Zeile: Kunde | Titel | Aktions-Badge | Phase (Icon+Label) | Wert | Datum[+Zeit] | Status-Dot+Label | Dots (`dots`)
- EmptyState; Pager

**(2) Exakter Text**
- Spaltenköpfe: `Kunde`, `Vorgang`, `Aktion`, `Phase`, `Wert`, `Datum`, `Status`
- Empty: Titel `Keine Vorgänge` · Hint `Filter zurücksetzen oder neuen Vorgang anlegen`
- Pager-Unit: `Vorgänge` · Info-Muster `{from}–{to} von {total} Vorgänge`
- Aktions-Badge (Mock): `Wartet auf Freigabe (HV)` — **CRM: Spalte entfernen**
- Phasen-Labels/Icons: Anfrage/`inbox`, Angebot/`file-invoice`, Auftrag/`briefcase`, Rechnung/`receipt`

**(3) Verhalten**
- Sortierbar: `kunde`, `titel`, `aktion`, `phase`, `wert`, `datum`, `status` (Klick togglet Richtung; Icon `arrows-sort` / `arrow-up` / `arrow-down`)
- Zeilenklick → `navigate(v.screen, v.id)` (Detail der Phase); im Auswahlmodus → Checkbox togglen
- Pagination: 12 pro Seite
- Dots-Menü → `entityMenu` je Phase (siehe unten)
- Multi-Select: Zeilen markieren; **keine** gerenderte Bulk-Aktionsleiste im Mock-JSX (nur ungenutzter State)

### Zeilen-Menü (entityMenu, Vorgänge)

Gemeinsame Basis je nach Handler: `Bearbeiten` (`pencil`), `Kopieren` (`copy`), Kontakt `Anrufen` (`phone`) / `Mail schreiben` (`mail`), `Löschen` (`trash`, danger).

Zusätzlich phasenabhängig (Mock):

| Phase | Weitere Einträge |
|-------|------------------|
| Anfrage | `Angebot erstellen` (`file-invoice`) |
| Angebot | `Angebot annehmen` (`check`, wenn Status `gesendet_kunde`); `Angebot PDF herunterladen` (`download`); `Angebot versenden` / `Angebot nochmal versenden` (`send`) |
| Auftrag | `Auftrag abschließen` (`checks`, wenn aktiv) |
| Rechnung | `Als bezahlt markieren` (`check`); PDF/Versand; `Zum Auftrag` (`briefcase`) |

---

## Anfrage-Detail

**(1) Element**
- Header: Titel, Status-Badge, Meta, Primär-CTA, Dots-Menü
- `DetailShell`-Tabs mit Icons: Stammdaten (`clipboard-list`), Details (`list-details`), Verlauf (`history`), Dokumente (`files`), Notizen (`messages`)
- Cards je Tab (u. a. Stammdaten-Props, Projekt, Leistungen)

**(2) Exakter Text**
- Tabs: `Stammdaten`, `Details`, `Verlauf`, `Dokumente`, `Notizen`
- CTAs (statusabhängig): `Angebot erstellen` / `Angebot annehmen`
- Card-Titel u. a.: `Stammdaten`, `Projekt-Übersicht`, `Leistungen`
- Props u. a.: `Name`, `Telefon`, `E-Mail`, `Region`, `Quelle`, `Eingegangen`, `Projekt`, `Beschreibung`, `Preisrahmen`

**(3) Verhalten**
- Tab wechselt Shell-Inhalt
- Angebot erstellen → Angebots-Wizard
- Dots → `entityMenu("anfrage")` inkl. Status: `Termin vereinbart`, `Rückfrage`, `Nicht erreichbar`, `Als verloren markieren` → Status-Modal

---

## Angebot-Detail

**(1) Element**
- Header mit statusabhängigem Primär-Button; DetailShell-Tabs wie Anfrage (+ Verlauf-Stages)
- Details: PosBoard „Leistungen“

**(2) Exakter Text**
- Tabs: `Stammdaten`, `Details`, `Verlauf`, `Dokumente`, `Notizen`
- CTAs u. a.: `Angebot annehmen`, `Angebot versenden`, `An Kunde senden`, `Zum Auftrag`
- Card `Stammdaten`; Link `Kundenakte öffnen`

**(3) Verhalten**
- Primär-CTA → Toast oder Navigation zum Auftrag
- Dots → `entityMenu("angebot")` (Bearbeiten öffnet Wizard, PDF, Versenden, Annehmen, …)

---

## Auftrag-Detail

**(1) Element**
- Header-CTAs; Tabs: Stammdaten, Details, Zahlplan, Bautagebuch, Verlauf, Dokumente, Notizen

**(2) Exakter Text**
- Tabs: `Stammdaten`, `Details`, `Zahlplan`, `Bautagebuch`, `Verlauf`, `Dokumente`, `Notizen`
- CTAs: `Auftrag abschließen`, `Rechnung erstellen`
- Card `Auftragsdaten` Props u. a.: `Auftrag`, `Kunde`, `Region`, `Beginn`, `Ende geplant`, `Projektleitung`, `Auftragswert`

**(3) Verhalten**
- Abschließen → Abschluss-Modal / Toast
- Rechnung → Rechnungs-Wizard
- Dots → `entityMenu("auftrag")` (u. a. `Angebot korrigieren`, `Rechnung erstellen`)

---

## Rechnung-Detail

**(1) Element**
- Header-CTAs; Tabs: Stammdaten, Details, Verlauf, Dokumente, Notizen
- Cards: Rechnungsdaten, Kunde, Zahlungsstatus, Leistungen

**(2) Exakter Text**
- Tabs: `Stammdaten`, `Details`, `Verlauf`, `Dokumente`, `Notizen`
- CTAs: `Versenden`, `Bezahlt`
- Cards: `Rechnungsdaten`, `Kunde`, `Zahlungsstatus`, `Leistungen`
- Status-Texte u. a.: `Vollständig bezahlt`, `{n} Tage überfällig`, `Zahlung ausstehend`

**(3) Verhalten**
- Versenden/Bezahlt → Toast
- Dots → `entityMenu("rechnung")` (Korrigieren, PDF, Versenden, Zum Auftrag, …)

---

## Kunden-Liste

**(1) Element**
- Chips: Alle, Privat, Hausverwaltung, Gewerbe
- Filter-Modal, Auswählen, Export
- Tabelle: Kunde, Typ, Telefon, Email, ⋯
- Pager (10), Unit `Kunden`

**(2) Exakter Text**
- Chips: `Alle`, `Privat`, `Hausverwaltung`, `Gewerbe`
- Filter-Sub: `Kunden eingrenzen`; Suche-Placeholder: `Name, Telefon, E-Mail…`
- Spalten: `Kunde`, `Typ`, `Telefon`, `Email`

**(3) Verhalten**
- Chip filtert Kundentyp
- Zeilenklick → Kundendetail; Auswahlmodus → Toggle
- Sort: Name, Typ, Telefon, Mail
- Dots → Öffnen/Bearbeiten

---

## Kunden-Detail

**(1) Element**
- Header Badges/Meta/Dots
- Tabs: Übersicht, Objekte (bei HV), Stammdaten, Vorgänge, Dokumente, Notizen

**(2) Exakter Text**
- Badges u. a.: `Portal aktiv` / `Portal inaktiv`, Typ-Label, `Kunde seit {since}`
- Stats u. a.: `Anfragen`, `Angebote`, `Aufträge`, `Umsatz`, `Ø Auftrag`, `Offen`
- Tab `Objekte`; Button `Objekt`; Leer `Noch keine Objekte`
- Card `Kontakt`

**(3) Verhalten**
- Vorgänge-Tab → eingebettete `VorgaengeList` mit `restrictKunde`
- Objekt → Objekt-Wizard / Navigation Objekte
- Dots → Portal, Bearbeiten, Kopieren

---

## Handwerker-Liste

**(1) Element**
- Chips: Alle Gewerke, Sanitär, Elektrik, Fliesen, Maler, Boden, Compliance
- Filter, Auswählen, Export
- Tabelle: Name, Gewerk, Telefon, Email, Bewertung, Status, ⋯
- Pager Unit `Handwerker` (10)

**(2) Exakter Text**
- `Alle Gewerke`, Gewerk-Namen, `Compliance`
- Filter-Sub: `Handwerker eingrenzen`; Chip/Option `Nur zu prüfen`
- Status-Badges: `Aktiv`, `Verfügbar`
- Spalten: `Name`, `Gewerk`, `Telefon`, `Email`, `Bewertung`, `Status`

**(3) Verhalten**
- Compliance-Chip → nur nicht-OK
- Zeilenklick → Detail; Sort inkl. Rating/Status

---

## Handwerker-Detail

**(1) Element**
- Header: Compliance-Badge, Portal, Rating
- Tabs: Übersicht, Stammdaten, Vorgänge, Dokumente, Notizen

**(2) Exakter Text**
- Compliance: `Compliance OK`, `läuft ab`, `Nachweis fehlt`
- Card `Bewertungen von Kunden`; Card `Compliance` mit u. a. `Betriebshaftpflicht`, `Gewerbeanmeldung`, `Unbedenklichkeitsbescheinigung`

**(3) Verhalten**
- Vorgänge → `restrictHandwerker`
- Dots → Bearbeiten, Portal, Kopieren

---

## Partner-Liste

**(1) Element**
- Chips: Alle, Versicherung, Finanzierung, Makler, Planung, Logistik
- Tabelle: Name, Kategorie, Ansprechpartner, Telefon, Email, Status, ⋯
- Pager Unit `Partner` (10)

**(2) Exakter Text**
- Chips: `Alle`, `Versicherung`, `Finanzierung`, `Makler`, `Planung`, `Logistik`
- Filter-Sub: `Partner eingrenzen`
- Status: `Aktiv`
- Spalten: `Name`, `Kategorie`, `Ansprechpartner`, `Telefon`, `Email`, `Status`

**(3) Verhalten**
- Chip filtert Kategorie; Zeilenklick → Detail

---

## Partner-Detail

**(1) Element**
- Header: Aktiv, Portal, Kategorie, Vermittlungs-Meta
- Tabs: Übersicht, Stammdaten, Vorgänge, Dokumente, Notizen

**(2) Exakter Text**
- Stats u. a.: `Vermittelt`, `Angebote`, `Aufträge`, `Umsatz`, `Ø Vorgang`, `Offen`
- Card `Kontakt`: `Firma`, `Kategorie`, `Ansprechpartner`, `Telefon`, `E-Mail`

**(3) Verhalten**
- Vorgänge → `restrictPartner`
- Dots → Bearbeiten, Portal, Kopieren, Löschen

---

## Objekte (Liste + Detail)

### Liste

**(1) Element**
- Suche, Button `Objekt`
- Tabelle: Objekt, Adresse, Einheiten, Vermietet, Miete/Monat, ⋯
- Pager Unit `Objekte`

**(2) Exakter Text**
- Placeholder: `Objekte suchen…`
- Spalten: `Objekt`, `Adresse`, `Einheiten`, `Vermietet`, `Miete/Monat`
- Button: `Objekt`

**(3) Verhalten**
- Zeilenklick → Detail; Button → Objekt-Wizard

### Detail

**(1) Element**
- Header Badges/Links/Buttons; Tabs Übersicht, Wohneinheiten, Freigabe, Vorgänge (Mock-Struktur)

**(2) Exakter Text**
- Stats u. a.: `Wohneinheiten`, `Vermietet`, `Miete/Monat`, `Fläche gesamt`
- Card `Objektdaten`: `Adresse`, `Baujahr`, `Gesamtfläche`, `Verwaltung`
- Badges: `Vermietet`, `Frei`
- Modals u. a.: `Freigabe-Regeln`, `Neue Einheit`, `Mieter hinzufügen`

**(3) Verhalten**
- Einheiten/Freigabe per Modal; Verwaltung → Kunden-Detail

---

## Kalender

**(1) Element**
- Toolbar: Prev/Next, Titel, `Heute`, `Neuer Termin`, Segment Tag/Woche/Monat
- Monatsgrid oder Tagesraster; Termin-Modals

**(2) Exakter Text**
- Views: `Tag`, `Woche`, `Monat`; Buttons `Heute`, `Neuer Termin`
- Create-Modal Titel: `Neuer Termin`
- Kategorien: `Vor-Ort / Arbeit`, `Kontakt / Kickoff`, `Abnahme`
- Felder: `Titel`, `Kategorie`, `Datum`, `Von`, `Bis`, `Ort`
- Buttons: `Abbrechen`, `Termin anlegen`, `Bearbeiten`, `Schließen`

**(3) Verhalten**
- Zelle → Create-Modal; Event → Detail-Modal; Speichern → Toast

---

## Einstellungen

**(1) Element**
- DetailShell mit 7 Nav-Gruppen; Topbar Speichern

**(2) Exakter Text**
- Nav: `Firma`, `Team` (Count 3), `Preislisten`, `Formulare`, `Benachrichtigungen`, `Integrationen`, `Sicherheit & DSGVO`
- Firma u. a.: `Stammdaten`, `Brand & Rechnung`; Felder `Firma`, `Inhaber`, `Adresse`, `USt-IdNr.`, `Telefon`, `E-Mail`, `Bankverbindung`
- Brand u. a.: `Logo`, `Primärfarbe`, `Rechnungsnummern`, `Zahlungsziel` / `14 Tage`
- Team: `Teammitglieder`, `Einladen`
- Benachrichtigungen: `Neue Anfragen`, `Anstehende Abnahmen`, `Überfällige Rechnungen`, `System-Updates`
- Integrationen: DATEV, GMX, Webformular, Telekom, Google Calendar, WhatsApp
- Sicherheit: `Datenschutz & DSGVO`, `Rollen & Rechte`, `Revisionssicherheit`, `DATEV-Schnittstelle`

**(3) Verhalten**
- Nav wechselt Gruppe; Switches/Demo-Aktionen mit Toasts; Preislisten mit Gewerk-Chips + Positionstabelle

---

## Mehr

**(1) Element**
- Profil-Card (Avatar BB, Profil-Button); Tile-Grid

**(2) Exakter Text**
- `Beran Bärenwald`, `Inhaber · Bärenwald München`, `Profil`
- Tiles: `Kunden` / `Kundenstamm`, `Handwerker` / `Partnerbetriebe`, `Partner` / `Netzwerk`, `Einstellungen` / `Firma & Team`

**(3) Verhalten**
- Tile → `navigate(id)`; Profil → Einstellungen

---

## Neu erstellen (Screen)

**(1) Element**
- Wizard-Top Abbrechen (`x`); Schritt Art-Tiles; Vorgangstyp-Chips; Formular

**(2) Exakter Text**
- `Was möchtest du erstellen?`, `Vorgangstyp`
- Art: `Vorgang`, `Kunde`, `Handwerker`, `Partner` (+ Beschreibungen im Mock)
- Chips: `Anfrage`, `Angebot`, `Auftrag`, `Rechnung`
- Hinweise: `Angebote werden im mehrstufigen Angebots-Wizard erstellt.` · `Rechnungen werden aus einem Auftrag erstellt.`
- Buttons u. a.: `Angebots-Wizard öffnen`, `Rechnungs-Wizard öffnen`, `Anfrage anlegen`, `Auftrag anlegen`

**(3) Verhalten**
- Preset aus Neu-Popover überspringt Schritte
- Angebot/Rechnung → jeweiliger Wizard; Speichern → Toast + Navigation

---

## Referenz

**Kanonische Mock-Referenz:** `Baerenwald CRM (standalone) (7).html` (ab 2026-07-16). Ersetzt v4/v6.

### Bewusste Funktions-Deltas (kein Gate gegen Mock)

| Delta | Entscheidung | Gate |
|-------|--------------|------|
| E-Mail-Versanddialog | Bleibt unverändert im bestehenden CRM (kein Redesign, kein Purge) | **nicht** gegen Mock prüfen |
| Angebots-PDF (Layout/Renderer) | Bleibt unverändert im bestehenden System | **nicht** gegen Mock prüfen |

---

## Angebots-Wizard

**(1) Element**
- Vollbild-`WizardShell`, **5 Steps**
- Doctype-Radios; Projekt-Titel/Beschreibung; Fotodokumentation-Grid; PosBoard; Formular Finalisieren; Angebots-Vorschau (`mail-preview`); Versenden-Übersicht

**(2) Exakter Text — Schritte**
1. `Typ & Projekt`
   - Kopf: `Welche Art von Angebot?` · Sub `Bestimmt Aufbau und Inhalt des Dokuments`
   - Overview-Kacheln: `Kunde`, `Projekt`, `Region`, `Budget-Rahmen`
   - Radios: `Einfaches Angebot` / Hint `Positionen & Preise — direkt zur Kalkulation`; `Komplexes Angebot` / Hint `Projekttitel, Beschreibung, Fotos & Gewerke`
   - Abschnitt: `Projekt-Beschreibung` · Sub `Titel, Beschreibung und Fotodokumentation für das Angebot`
   - Felder: `Projekt-Titel` (required, Placeholder `z.B. Badmodernisierung & Projektkoordination`); `Beschreibung` (Hint `Erscheint als einleitende Projekt-Beschreibung im Angebot`, Placeholder `Beschreibe Umfang, Ausführung, Koordination...`)
   - `Fotodokumentation` · Hint `Erscheint im Angebot zwischen Beschreibung und Leistungen` · Upload-Zone
2. `Positionen` — Kopf `Positionen · {Projekt/Titel}` · PosBoard mit USt
3. `Finalisieren`
   - `Angebotstitel`, `Gültig bis`
   - `Zahlfrist` (Hint `Zahlungsziel nach Rechnungsstellung`) · Segmente `7 Tage` / `14 Tage` / `30 Tage` / `Datum` (+ Datumsfeld wenn `Datum`)
   - `Einleitung`, `Schlusstext`, PosTotals
4. `Vorschau` — Kopf `Angebots-Vorschau` · Sub `So erhält {Kunde} das Angebot` · `AngebotMailPreview` (Mock-Vorschau; **nicht** der CRM-E-Mail-Versanddialog)
5. `Versenden` — Kopf `Versenden` · Sub `Empfänger prüfen und Angebot versenden` · Overview `Empfänger`, `E-Mail`, `Betreff` (`Ihr Angebot — {Titel}`), `Gültig bis`, `Zahlfrist` (Text `zahlbar innerhalb von {n} Tagen…` / `zahlbar bis {Datum}`), `Gesamt` · Hinweis `Mit „Angebot versenden" wird das Angebot als PDF per E-Mail zugestellt.`
- Finish: `Angebot versenden` (`send`)

**(3) Verhalten**
- Doctype steuert Komplexität (einfach vs. komplex); Projektfelder/Fotos immer in Step 1 editierbar
- Zahlfrist: Segmente setzen Zahlungsziel-Text; bei `Datum` freies Datum
- Vorschau-Schritt zeigt Angebotsinhalt inkl. Zahlfrist-Text
- Finish → Speichern/Versand-Toast (E-Mail-Dialog = Delta, siehe oben)

---

## Rechnungs-Wizard

**(1) Element**
- Vollbild-WizardShell, **3 Steps**
- PosBoard; Zahlungsweise-Segmente + Abschlags-Tabelle; Paket/Anlagen/Versandweg; Steuer-Checkboxen; Mail-Preview

**(2) Exakter Text — Schritte**
1. `Positionen` — `Leistungen · Gesamtumfang` · Auftrag/Kunde in Sub
2. `Zahlplan`
   - `Zahlungsweise` · Segmente `Einzelrechnung` / `Zahlplan (Abschläge)` · Gesamt brutto
   - Bei Plan: Vorlagen `30 / 40 / 30`, `50 / 50`, `Anzahlung 30% + Rest`; Spalten `Bezeichnung`, `Anteil`, `Betrag brutto`, `Fällig`; `Abschlag hinzufügen`; `Summe {n}% · muss 100% sein`
   - Bei Einzel: Hinweistext Gesamtbetrag als eine Rechnung; Feld `Zahlungsziel / Zahlfrist` (Hint `Frist nach Rechnungsstellung`) · Segmente `7 Tage` / `14 Tage` / `30 Tage` / `Datum`
3. `Paket & Versand`
   - Bei Plan: `Welche Rechnung jetzt erstellen?` (Raten-Auswahl)
   - `Dokumentpaket` · Anlagen: `Rechnung (PDF)` (immer dabei), `Leistungsnachweis`, `Bautagebuch-Export`, `Abnahmeprotokoll`, `Fotodokumentation`
   - `Versandweg`: `Kundenportal`, `E-Mail`, `Post`
   - `Steuerliche Hinweise` · Checkboxen:
     - `§35a EStG-Hinweis ausweisen` · Sub `Lohnkostenanteil für haushaltsnahe Handwerkerleistungen`
     - `Reverse-Charge (§13b UStG)` · Sub `Steuerschuldnerschaft des Leistungsempfängers`
   - Felder: `Rechnungstitel`, `Empfänger`, `Fällig am`, `Einleitung`
   - Preview mit Hinweisblöcken wenn Checkboxen aktiv
- Finish: `Rechnung erstellen & senden` / `…drucken` (Post)

**(3) Verhalten**
- Zahlplan: Summe 100 % nötig für Finish
- Zahlfrist (Einzel): setzt Fälligkeit relativ zur Rechnungsstellung / freies Datum
- §35a / Reverse-Charge: steuern Sichtbarkeit der Hinweisblöcke in Preview **und** in der echten Rechnungs-Ausgabe (PDF/HTML)
- Finish → Toast mit Rechnungs-ID

---

## Status-Modal (Anfrage)

**(1) Element**
- Modal je `kind` mit Formularfeldern

**(2) Exakter Text**

| kind | Titel | Save-Button |
|------|-------|-------------|
| termin | `Termin vereinbart` | `Termin speichern` |
| rueckfrage | `Rückfrage` | `Rückfrage speichern` |
| nicht_erreichbar | `Nicht erreichbar` | `Wiedervorlage anlegen` |
| verloren | `Als verloren markieren` | `Markieren` |

- Felder u. a.: `Datum`, `Uhrzeit`, `Notiz zum Termin`, `Was ist unklar?`, `Wiedervorlage am`, `Grund`, `Anmerkung (optional)`

**(3) Verhalten**
- Save → Toast je Art; ausgelöst aus Anfrage-entityMenu

---

## Portal / Login / Onboarding (Vorschau-Screens)

### Kundenportal

**(1)** Brand-Header, 5-Phasen-Timeline, Stand-Box, Updates, Kontakt-Buttons  
**(2)** `Bärenwald München`, `Ihr Bad-Projekt`; Phasen `Anfrage`, `Angebot`, `Auftrag`, `Abnahme`, `Fertig`; `Aktueller Stand:`; `Updates von der Baustelle`; `Anrufen`, `WhatsApp`; Footer `Keine Preise · keine internen Daten sichtbar`  
**(3)** Anrufen/WhatsApp → externe Links

### Login

**(1)** Logo, Card E-Mail/Passwort, Anmelden, Demo-Link  
**(2)** `Bärenwald CRM`, `München`, `E-Mail`, `Passwort`, `Anmelden`, `Direkt zur Demo →`, `🇩🇪 Server in Deutschland · DSGVO-konform · verschlüsselt`  
**(3)** Anmelden → Onboarding; Demo → Dashboard

### Onboarding

**(1)** 4 Schritt-Karten + Fortschritt  
**(2)** `Willkommen bei Bärenwald CRM`; `In 4 Schritten startklar · Schritt {n} von 4`; Schritte `Firma`, `Logo & Branding`, `Gewerke`, `Daten`; Schritt 4 `Demo-Daten laden` / `Leer starten`; final `Fertig — los geht's`  
**(3)** Weiter/Zurück; Schritt 4 → Dashboard

---

## Quelltreue-Hinweise

- Listen **Anfragen / Angebote / Aufträge / Rechnungen** als eigene Sidebar-Einträge: **nicht** im Mock-`NAV` — Zugang über Dashboard-KPIs/Phasen bzw. `navigate(phase)` aus Vorgängen.
- Rechnungs- und Auftrags-„Listen“-Routing im Mock läuft über `VorgaengeList` (Phase-Filter), nicht über separate Listen-Komponenten in der Sidebar.
- Diese Datei ergänzt keine CRM-Features über den Mock hinaus; **Bewusst entfernt** hat Vorrang vor Mock-Resten.
