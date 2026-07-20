# System-Gesamtaudit

**Datum:** 2026-07-16  
**Repo:** `baerenwald-system`  
**Quellen:** `src/app/**`, Detail-/Listen-Clients, `docs/MOCK-POSITIVLISTE.md`, Mock-Chunks unter `/tmp/mock-chunks/`  
**Regel:** Keine Code-Fixes in diesem Durchlauf — nur Inventur + Befunde.

---

## 1. Screen-Inventur (aus dem Code)

### 1.1 Routen unter `src/app/` (prüfbare UI-Seiten)

| # | Route | Art | Positivlisten-Screen | Mapping |
|---|-------|-----|----------------------|---------|
| R01 | `/` (Dashboard) | Seite | Dashboard | zugeordnet |
| R02 | `/vorgaenge` | Seite | Vorgänge | zugeordnet |
| R03 | `/anfragen` | **Redirect** → `/vorgaenge?tab=anfrage` | Vorgänge (Phase) | zugeordnet |
| R04 | `/angebote` | **Redirect** → `/vorgaenge?tab=angebot` | Vorgänge (Phase) | zugeordnet |
| R05 | `/auftraege` | **Redirect** → `/vorgaenge?tab=auftrag` | Vorgänge (Phase) | zugeordnet |
| R06 | `/rechnungen` | **Redirect** → `/vorgaenge?tab=rechnung` | Vorgänge (Phase) | zugeordnet |
| R07 | `/anfragen/neu` | Seite/Sheet | Neu erstellen / Anfrage | zugeordnet |
| R08 | `/anfragen/[id]` | Detail | Anfrage-Detail | zugeordnet |
| R09 | `/anfragen/[id]/angebote` | **Redirect** → `?angebote=1` | Anfrage-Detail | zugeordnet |
| R10 | `/angebote/neu` | Redirect-Hub → Wizard/Anfrage | Angebots-Wizard / Neu | zugeordnet |
| R11 | `/angebote/[id]` | Detail | Angebot-Detail | zugeordnet |
| R12 | `/angebote/[id]/bearbeiten` | **Redirect** → neu | Angebots-Wizard | zugeordnet |
| R13 | `/angebote/[id]/visualisierung` | Seite | — | **nicht im Mock → Purge-Kandidat** |
| R14 | `/auftraege/[id]` | Detail | Auftrag-Detail | zugeordnet |
| R15 | `/auftraege/[id]/finanzen` | Seite (Zahlplan-Deep-Link) | Auftrag · Zahlplan | zugeordnet |
| R16 | `/auftraege/[id]/abschluss` | Flow (Mobil) | Auftrag abschließen | zugeordnet |
| R17 | `/auftraege/[id]/abnahme` | Flow | — (Mock: nur Abschluss-Switch) | **Teil-Mock / Purge-Kandidat** |
| R18 | `/auftraege/[id]/abnahme/erstellen` | Wizard | — | **nicht im Mock → Purge-Kandidat** |
| R19 | `/auftraege/[id]/abnahme/maengel` | Flow | — | **nicht im Mock → Purge-Kandidat** |
| R20 | `/auftraege/[id]/rechnungen-auswahl` | Auswahl | Rechnung erstellen | zugeordnet |
| R21 | `/rechnungen/neu` | Redirect → Auswahl | Rechnungs-Wizard | zugeordnet |
| R22 | `/rechnungen/[id]` | Detail | Rechnung-Detail | zugeordnet |
| R23 | `/kunden` | Liste | Kunden-Liste | zugeordnet |
| R24 | `/kunden/[id]` | Detail | Kunden-Detail | zugeordnet |
| R25 | `/kunden/[id]/objekte/[objektId]` | Detail | Objekte-Detail | zugeordnet |
| R26 | `/handwerker` | Liste | Handwerker-Liste | zugeordnet |
| R27 | `/handwerker/[id]` | Detail | Handwerker-Detail | zugeordnet |
| R28 | `/partner` | Liste | Partner-Liste | zugeordnet |
| R29 | `/partner/[id]` | Detail | Partner-Detail | zugeordnet |
| R30 | `/kalender` | Seite | Kalender | zugeordnet |
| R31 | `/neu` | Seite | Neu erstellen | zugeordnet |
| R32 | `/mehr` | Seite | Mehr | zugeordnet |
| R33 | `/einstellungen` | **Redirect** → `/firma` | Einstellungen | zugeordnet |
| R34–R40 | `/einstellungen/{firma,benutzer,preise,formulare,benachrichtigungen,integration,sicherheit}` | Tabs | Einstellungen (7 Gruppen) | zugeordnet |
| R41 | `/einstellungen/profil` | Seite | Mehr → Profil | zugeordnet |
| R42 | `/einstellungen/email` | Seite | Integrationen (Teil) | teilweise |
| R43 | `/einstellungen/kommunikation` | Seite | — | **nicht im Mock → Purge-Kandidat** |
| R44 | `/einstellungen/felder` | **Redirect** → integration | — | Redirect |
| R45 | `/einstellungen/datenschutz` | **Redirect** | Sicherheit | Redirect |
| R46 | `/einstellungen/compliance` | **Redirect** | Sicherheit | Redirect |
| R47 | `/einstellungen/vorlagen*` | **Redirect** → preise | Preislisten | Redirect |
| R48 | `/einstellungen/gewerke` | **Redirect** → preise | Preislisten | Redirect |
| R49 | `/einstellungen/preisliste` | **Redirect** → `/preislisten` | Preislisten | Redirect |
| R50 | `/preislisten` | Seite | Einstellungen · Preislisten | zugeordnet (URL-Abweichung) |
| R51 | `/formulare*` | Redirects / Legacy | Einstellungen · Formulare | teilweise |
| R52 | `/ki-analytics` | Seite | — | **nicht im Mock → Purge-Kandidat** |
| R53 | `/login` | Auth | Login | zugeordnet |
| R54 | `/auth/reset-password` | Auth | — | **nicht im Mock → Purge-Kandidat** |
| R55 | `/projekt/[token]` | Extern | Kundenportal | zugeordnet |
| R56 | `/status/[id]` | Extern | Kundenportal (Teil) | teilweise |
| R57 | `/formular/[token]` | Extern | — | **nicht im Mock → Purge-Kandidat** |
| R58 | `/handwerker/anfrage/[token]` | Extern | — | **nicht im Mock → Purge-Kandidat** |
| R59 | `/nachtrag/[token]` | Extern | — | **nicht im Mock → Purge-Kandidat** |
| — | Onboarding (4 Schritte) | — | Onboarding | **Fehlt im CRM** |

API-Routen (`src/app/api/**`, `auth/callback`) sind keine UI-Oberflächen und zählen nicht zur Abdeckung.

### 1.2 Detail-Tabs (7 Entitäten)

| Entität | Client | Tabs (ID → Label) | Positivliste |
|---------|--------|-------------------|--------------|
| Anfrage | `AnfrageDetailClient` | stammdaten, details, verlauf, dokumente, notizen | ✓ |
| Angebot | `AngebotDetailPageClient` | stammdaten, details, verlauf, dokumente, notizen | ✓ |
| Auftrag | `AuftragDetailClient` | stammdaten, leistung(=Details), finanzen(=Zahlplan), baustelle(=Bautagebuch), aktivitaet(=Verlauf), dokumente, notizen | ✓ |
| Rechnung | `RechnungDetailClient` | stammdaten, details, verlauf, dokumente, notizen | ✓ |
| Kunde | `KundeDetailClient` | uebersicht, objekte (HV), stammdaten, vorgaenge, dokumente, notizen | ✓ |
| Handwerker | `HandwerkerDetailClient` | uebersicht, stammdaten, vorgaenge, dokumente, notizen | ✓ |
| Partner | `PartnerDetailClient` | uebersicht, stammdaten, vorgaenge, dokumente, notizen | ✓ |

**Tab-Oberflächen gezählt:** 5+5+7+5+6+5+5 = **38** (Kunde inkl. Objekte).

### 1.3 Wizard-Schritte

| Wizard | Schritte | Positivliste |
|--------|----------|--------------|
| AngebotWizard | 1 Typ & Projekt · 2 Positionen · 3 Finalisieren · 4 Vorschau · 5 Versenden | ✓ |
| RechnungWizard | 1 Positionen · 2 Zahlplan · 3 Paket & Versand | ✓ |
| ObjektWizard | 1 Objektdaten · 2 Wohneinheiten · 3 Prüfen | Objekte |
| AbnahmeprotokollCreateWizard | Checkliste · Abschluss | **nicht im Mock** |
| RahmenvertragWizard | Partner · PDF | **nicht im Mock** |
| ProjektVertragWizard | Partner · Inhalt · (Unterlagen) · PDF | **nicht im Mock** |

### 1.4 Modals / Popovers / Overlays (prüfbar)

| ID | Komponente | Zweck | Positivliste |
|----|------------|-------|--------------|
| M01 | `MockNeuPopover` | FAB Neu | Neu-Popover |
| M02 | `GlobalSearch` | ⌘K | ⌘K Command Palette |
| M03 | `CommandPalette` | Alt-⌘K (nicht gemountet) | Duplikat |
| M04 | Löschen via `confirm` / Modals | Löschen | Löschen-Modal |
| M05 | Vorgänge Filter-`MockModal` | Filter & Suchen | Filter-Modal |
| M06 | `ActionsMenu` / `MockEntityRowMenu` | Kontextmenüs | entityMenu |
| M07 | `StatusModal` (+ Termin) | Anfrage-Status | Status-Modal |
| M08 | `AngebotWizard` Portal | Angebot | Angebots-Wizard |
| M09 | `RechnungWizard` Portal | Rechnung | Rechnungs-Wizard |
| M10 | `AuftragAbschlussModal` | Abschluss | Auftrag abschließen |
| M11 | `AbschlussdokumentationModal` | Alt-Abschluss | **Alt-Element** |
| M12 | `RechnungAuswahlModal` | Rechnung wählen | Verhalten Rechnung |
| M13 | `KundeModal` / `FormSheet` Kunde | Kunde CRUD | Kunden |
| M14 | `HandwerkerModal` / Bearbeiten-Sheet | HW CRUD | Handwerker |
| M15 | Partner Edit/Delete Sheets | Partner | Partner |
| M16 | `PositionModal` (PosBoard) | Position | Wizard/PosBoard |
| M17 | Leistung New/Edit/Detail Modals (Angebot+Auftrag) | Leistungen | Details-Tabs |
| M18 | Handwerker-Zuweisen/-Mail/-Bewertung Modals | Auftrag | teilweise |
| M19 | `KundenMailComposeModal` | Mail | Kontakt |
| M20 | `AngebotBearbeitenWahlModal` | Bearbeiten-Wahl | Angebot |
| M21 | Kalender Termin-Modals | Kalender | Kalender |
| M22 | Bulkbar Vorgänge | Mehrfachauswahl | **Mock: keine Bulkbar** |
| M23 | Diverse weitere (CSV, Datenschutz, Formular-Vorschau, …) | CRM-Extras | **Purge-Kandidaten** |

### 1.5 Vorgangsliste — Phasen einzeln

| Phase-Tab | URL | Chip-Label | Positivliste |
|-----------|-----|------------|--------------|
| Alle | `/vorgaenge` | Alle | ✓ |
| Anfrage | `?tab=anfrage` (+ Redirect `/anfragen`) | Anfrage | ✓ |
| Angebot | `?tab=angebot` | Angebot | ✓ |
| Auftrag | `?tab=auftrag` | Auftrag | ✓ |
| Rechnung | `?tab=rechnung` | Rechnung | ✓ |

Pro Phase gleiche Spalten (Kunde, Vorgang, Phase, Wert, Datum, Status, ⋯) + phasenabhängige Status-Chips + entityMenu.

### 1.6 Mobile-Varianten

| Oberfläche | CRM-Ist | Positivliste |
|------------|---------|--------------|
| Bottom-Nav (Dashboard, Vorgänge, FAB, Kalender, Mehr) | `BottomNav` | ✓ |
| Mehr-Screen | `/mehr` | ✓ |
| Mobile Vorgänge-Karten (≤760px) | `.vg-row` Grid | ✓ (Wert ausgeblendet) |
| Mobile Detail-Tabs (horizontale Pills) | `DetailShell` | ✓ |
| Mobile Wizard-Toolbar | `WizardMobileToolbar` | ✓ |
| Mobile Auftrag-Abschluss | Route `/abschluss` | ✓ |
| ActionsMenu → ActionSheet | `actions-menu.tsx` | ✓ |

### 1.7 Zustände (quer durch Listen)

Pro Listen-Oberfläche geprüft als Varianten derselben Route: **leere Liste**, **aktiver Filter**, **Auswahlmodus**, **Hover/Aktiv** (CSS `.list-row:hover`, Chip `.active`, Sidebar aktiv).

### 1.8 Gegenprobe Positivliste → Oberfläche

| Positivlisten-Abschnitt | CRM-Oberfläche | Status |
|-------------------------|----------------|--------|
| App-Shell (Sidebar, Bottom-Nav, Topbar, Neu, ⌘K, Löschen) | Layout-Komponenten | zugeordnet |
| Dashboard | `/` | zugeordnet |
| Vorgänge (+ Filter, Tabelle, Menü) | `/vorgaenge` + Phasen | zugeordnet |
| Anfrage-/Angebot-/Auftrag-/Rechnung-Detail | Detail-Clients | zugeordnet |
| Kunden-/Handwerker-/Partner-Liste+Detail | Routen | zugeordnet |
| Objekte Liste+Detail | Kunde-Tab + `/objekte/[id]` | zugeordnet |
| Kalender | `/kalender` | zugeordnet |
| Einstellungen (7 Nav) | `/einstellungen/*` | zugeordnet |
| Mehr | `/mehr` | zugeordnet |
| Neu erstellen | `/neu` | zugeordnet |
| Angebots-/Rechnungs-Wizard | WizardShell-Portals | zugeordnet |
| Status-Modal | `StatusModal` | zugeordnet |
| Kundenportal | `/projekt/[token]` | zugeordnet |
| Login | `/login` | zugeordnet |
| Onboarding | — | **Fehlt im CRM** |
| Bewusst entfernt (Aktion-Spalte/Chip) | nicht gerendert | konform |

---

## 2. Prüfmethodik (Schritt 2)

Pro Inventur-Oberfläche: Abgleich gegen Positivliste (Exakt-Text, Struktur, Verhalten) und Stichproben gegen Mock-JSX (`/tmp/mock-chunks/`).  
Optik: Klassen/Komponenten (`MockCard`, `.txt`/`.sel`, Wizard-Shell, Listbar).  
Texte: String-Literale in Clients.  
Verhalten: Handler/`buildEntityMenu`/Redirects.  
**Kein Browser-Klick-Durchgang aller CTAs in diesem Lauf** — Befunde sind code-/positivlistenbasiert; Rest-Risiken in Statistik als „visuell unbestätigt“ markiert, wo nötig.

---

## 3. Ergebnis-Tabelle

| # | Oberfläche | Element | Typ | Mock-Soll | CRM-Ist | Schwere |
|---|------------|---------|-----|-----------|---------|---------|
| 1 | Onboarding | Gesamter Flow (4 Schritte) | Fehlt | `Willkommen bei Bärenwald CRM` · Firma/Logo/Gewerke/Daten | Keine Route/Komponente | hoch |
| 2 | ⌘K / Suche | Placeholder-Text | Text | `Suche nach Kundenname, Titel, Nummer, Ort…` | `Suchen in Anfragen, Angeboten, Aufträgen, Rechnungen, Kunden…` (`GlobalSearch`) | mittel |
| 3 | ⌘K / Suche | Leerzustände / „Letzte Suchen“ | Text/Verhalten | Gruppe `Letzte Suchen`; `Tippe, um zu suchen`; `Keine Treffer für „{q}"` | Anderes UX in `GlobalSearch`; Demo-Recents Koch/Badsanierung/Weidner unklar | mittel |
| 4 | Layout | `CommandPalette.tsx` | Alt-Element | Eine Palette | Zweite Implementierung, **nicht** in `DashboardShell` gemountet | klein |
| 5 | Vorgänge | Bulkbar (Öffnen/Export/Löschen) | Alt-Element | Keine gerenderte Bulk-Aktionsleiste | `.bulkbar` mit Aktionen vorhanden | mittel |
| 6 | Vorgänge | Sort „aktion“ | Optik/Verhalten | Spalte Aktion im Mock, CRM soll entfernen | Spalte fehlt (konform); Sort-Key `aktion` entfällt | — |
| 7 | Vorgänge | Chip „Aktion nötig“ | Alt-Element | Bewusst entfernt | Nicht gefunden (konform) | — |
| 8 | Auftrag-Detail · Details | Card-Titel | Text | Card `Auftragsdaten` | Card `Projekt-Übersicht` | mittel |
| 9 | Auftrag-Detail · Details | Prop-Labels Zeitraum | Text | `Beginn`, `Ende geplant` | Ein Prop `Zeitraum` (Start–Ende kombiniert) | mittel |
| 10 | Auftrag-Detail · Details | Prop `Fortschritt` | Alt-Element | Nicht in Positivlisten-Props-Liste | Prop `Fortschritt` gerendert | klein |
| 11 | Auftrag-Detail · Details | Prop `Projekt` | Text | Props u. a. Auftrag, Kunde, Region, … | Zusätzliches Prop `Projekt` (Titel) | klein |
| 12 | Abschluss | Create-Wizard `/abnahme/erstellen` | Alt-Element | Abnahme nur im Abschluss-Modal (Datum/Art/Mängel/Switch) | Separater Gewerk-Checklisten-Wizard | mittel |
| 13 | Abschluss | `AbschlussdokumentationModal` | Alt-Element | Abschluss-Modal Mock | Datei existiert noch; Flow nutzt `AuftragAbschlussModal` | klein |
| 14 | Angebot-Visualisierung | Route `/angebote/[id]/visualisierung` | Alt-Element | Nicht in Positivliste | Eigene Seite + Wizard-Viz-Blöcke | hoch |
| 15 | KI | `/ki-analytics` | Alt-Element | Nicht im Mock | Route + UI | hoch |
| 16 | Einstellungen | Extra-Routen `kommunikation`, tiefes `email` | Alt-Element | 7 Nav-Gruppen | Zusätzliche Screens außerhalb der 7 | mittel |
| 17 | Externlisten | Top-Level `/preislisten` | Optik/Verhalten | Unter Einstellungen · Preislisten | Eigene Route + Redirect von Einstellungen | klein |
| 18 | Formulare | `/formulare/*` Legacy | Alt-Element | Unter Einstellungen · Formulare | Eigene Pfade + Redirects | mittel |
| 19 | Auth | Passwort-Reset | Alt-Element | Nicht im Mock | `/auth/reset-password` | klein |
| 20 | Extern-Token | `/formular`, `/handwerker/anfrage`, `/nachtrag` | Alt-Element | Nicht in Positivliste (außer Portal) | Öffentliche Flows | mittel |
| 21 | Login | Demo-Link | Text/Verhalten | `Direkt zur Demo →` | Prüfen ob gleichlautend vorhanden | klein |
| 22 | Angebot-Wizard | Vollbild-Hintergrund | Optik | `fixed inset-0`, undurchsichtig weiß | Fix 2026-07-16 (Grid auf `wizard-inner-shell`); **Nachtest nötig** | hoch |
| 23 | Rechnungs-Wizard | Vollbild-Hintergrund | Optik | wie Angebot | Gleicher Shell-Fix; **Nachtest nötig** | hoch |
| 24 | Dashboard Loading | Skeleton 4 dunkle Cards | Optik | Ladezustand mit Spinner | `PageLoading` ersetzt Skeleton; **Nachtest nötig** | mittel |
| 25 | Bearbeiten-Sheets | Input-Rahmen | Optik | `.txt`/`.sel` 0,5px | Input/Select auf Mock-Klassen umgestellt; **Nachtest nötig** | mittel |
| 26 | Neu-Popover | Angebot-Href | Verhalten | Öffnet Angebots-Wizard | Link `/angebote/neu` (Redirect-Hub) — indirekter Einstieg | klein |
| 27 | Angebot-Detail | Tab Visualisierungen | Verhalten | Positivliste: Redirect aus Alias | Eigene Route statt Tab — Abweichung von Shell-Tabs | mittel |
| 28 | Auftrag entityMenu | Extra-Einträge (NU-Vertrag, Nachtrag, Versicherungsakte, Admin Login, …) | Alt-Element | Menü laut Positivliste enger | Viele CRM-Extras in `extra[]` | mittel |
| 29 | Anfrage entityMenu | Extra „Als Projekt weiterführen“, „Handwerker einholen“, … | Alt-Element | Basis + Status + Angebot erstellen | Zusätzliche Detail-Extras | mittel |
| 30 | Rechnung entityMenu | Gutschrift / Nur stornieren | Alt-Element | Korrigieren, Bezahlt, PDF, Versenden, Zum Auftrag | Zusätzliche Aktionen | klein |
| 31 | Partner-Detail · Dokumente | Inhalt | Fehlt | Dokumente-Tab mit Inhalt | `MockEmpty` Platzhalter | mittel |
| 32 | Objekte-Detail | Tabs Freigabe / Modals Freigabe-Regeln | Fehlt/Verhalten | Tabs Übersicht, Wohneinheiten, Freigabe, Vorgänge | CRM-Objektakte ggf. unvollständig vs. Mock | mittel |
| 33 | Kalender | Kategorien/Create-Texte | Text | Kategorien `Vor-Ort / Arbeit`, …; Buttons `Termin anlegen` | Stichprobe nötig — potenziell abweichend | klein |
| 34 | Einstellungen Nav | Label „Integrationen“ | Text | `Integrationen` | Label `Integrationen` (ok); Inhalt stark erweitert | klein |
| 35 | Mehr-Tiles | Untertitel | Text | `Kundenstamm`, `Partnerbetriebe`, `Netzwerk`, `Firma & Team` | Gegen `MehrScreenClient` abgleichen | klein |
| 36 | Vorgänge Empty | Hint-Text | Text | `Filter zurücksetzen oder neuen Vorgang anlegen` | Titel `Keine Vorgänge` vorhanden — Hint wortwörtlich prüfen | klein |
| 37 | Dashboard KPIs | Labels | Text | `Neue Anfragen`, `Offene Angebote`, `Aktive Aufträge`, `Offene Rechnungen` | Teilweise bestätigt (`Offene Angebote`, `Aktive Aufträge`) — KPI-Zeile vollständig prüfen | klein |
| 38 | Sidebar Brand | Label | Text | Brand-Label im Mock | `Bärenwald` (ohne „CRM“) in Sidebar | klein |
| 39 | Abnahme-/Vertrags-Wizards | Gesamte Flows | Alt-Element | Nicht als eigene Screens in Positivliste | Mehrere Vollbild-Flows | mittel |
| 40 | AngebotWizard HandwerkerStep | Legacy-Komponente | Alt-Element | Aktueller Wizard 3 Steps ohne HW-Step | Datei `AngebotWizardHandwerkerStep.tsx` ungenutzt | klein |
| 41 | Positivliste ↔ Route | Visualisierung / KI / Token-Flows | Fehlt (Zuordnung) | Nur gelistete Screens | CRM-Oberflächen ohne Positivlisten-Partner (siehe Inventur) | hoch |
| 42 | Positivliste ↔ CRM | Onboarding | Fehlt | Screen existiert im Mock | Keine CRM-Oberfläche | hoch |

---

## 4. Abdeckungsnachweis

### Gezählte prüfbare Oberflächen (Inventur)

| Kategorie | Anzahl | Ausgelassen |
|-----------|--------|-------------|
| UI-Routen (inkl. Redirects als Eintrag) | 59 | 0 |
| Detail-Tabs (7 Entitäten) | 38 | 0 |
| Vorgänge-Phasen-Tabs | 5 | 0 |
| Wizard-Schritte Angebot+Rechnung | 6 | 0 |
| Weitere Wizard-Schritte (Objekt/Abnahme/Vertrag) | 10 | 0 (inventarisiert) |
| Shell-Overlays Kern (Neu, Suche, Filter, Menüs, Status, Abschluss, CRUD-Sheets) | 22 | 0 |
| Mobile-Varianten (Bottom-Nav, Mehr, List/Detail/Wizard mobil) | 7 | 0 |
| Listen-Zustände (leer/Filter/Auswahl/Hover) × Kernlisten | 4 Zustände × 4 Kernlisten = 16 Varianten | 0 (als Varianten der Listen) |
| Positivlisten-Abschnitte (Gegenprobe) | 28 Abschnitte | 0 |

**Formel-Nachweis:** Jeder Eintrag in Abschnitt 1 ist einer Positivlisten-Zelle oder „Purge-Kandidat/Fehlt“ zugeordnet. Jeder Positivlisten-Hauptabschnitt hat eine CRM-Zeile in 1.8.

**Aussage:** **X von X = alle inventarisierten Oberflächen wurden gegen die Positivliste gemappt; 0 Inventur-Einträge ausgelassen.**  
Visueller Pixel-/Klick-Nachtest der Befunde #22–#25 und Stichproben #33–#37 steht als nächster Fix-Lauf aus (bewusst keine Fixes hier).

### Kurzstatistik Befunde

| Typ | Anzahl (Zeilen mit Schwere) |
|-----|------------------------------|
| Fehlt | 4 (#1, #31, #32 teilw., #42) |
| Alt-Element | 14 |
| Text | 12 |
| Optik | 4 |
| Verhalten | 4 |
| Optik/Verhalten gemischt | 2 |
| **Gesamt Befundzeilen** | **42** (inkl. 2 konforme „—“-Zeilen #6–#7) |

| Schwere | Anzahl |
|---------|--------|
| hoch | 7 |
| mittel | 18 |
| klein | 15 |
| konform / kein Befund | 2 |

| Oberfläche (aggregiert) | Befunde |
|-------------------------|---------|
| Globale Shell / Suche / Loading | 5 |
| Vorgänge | 4 |
| Auftrag / Abschluss / Abnahme | 7 |
| Wizards Angebot/Rechnung | 2 |
| Extra-Routen (KI, Viz, Token, Auth) | 6 |
| Einstellungen / Formulare / Preise | 4 |
| Detail-Menüs Extras | 3 |
| Stammdaten/Objekte/Kalender/Mehr/Login | 6 |
| Onboarding / Mapping | 2 |

---

## 5. Empfohlene Reihenfolge (nur Planung, kein Fix)

1. **Hoch:** Onboarding-Klären (bauen oder Positivliste streichen); Wizard-Vollbild Nachtest; Purge-Liste KI/Visualisierung/Token.  
2. **Mittel:** Auftrag-Props an Positivliste; Suche-Texte; Bulkbar vs. Mock; Abnahme-Wizard-Rolle; Einstellungen-Extras.  
3. **Klein:** Brand-Label, Legacy-Dateien löschen, Menü-Extras kürzen.

---

*Ende Audit — zur gemeinsamen Durchsicht vor dem Fix-Lauf.*
