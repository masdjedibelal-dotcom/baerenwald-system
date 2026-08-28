# Designer-Prompt — CRM + Portale durchziehen (Mocks festzurren)

**Für:** Claude Designer (oder vergleichbar)  
**Ziel:** Bestehende Mocks **anpassen und vereinheitlichen**, nicht die Produktlogik neu erfinden. Viele Screens wirken „von einem Computer designed“ — uneinheitliche Patterns, zu viele Boxen/Chips/Pillen, schwache Hierarchie. Ein menschlicher Product-Designer würde das straffen.

**Anhänge — fertiges Pack (ohne Login):**

Ordner: `docs/designer-pack/`

| Was | Pfad | Login? |
|-----|------|--------|
| CRM-Mock (neueste Standalone) | `mocks/Baerenwald-CRM-standalone.html` | nein — im Browser öffnen |
| Portal-Mock | `mocks/Baerenwald-Portale.html` | nein |
| Ist-Screenshots (kuratiert) | `screenshots-ist/*.png` | schon eingefangen |

**Was Claude Designer braucht:** HTML-Mocks + die PNGs aus `screenshots-ist/` anhängen (nicht den ganzen Downloads-Ordner).  
Cursor kann Dateien **nicht** in Claude Designer hochladen — du ziehst den Pack-Inhalt selbst rein.

**Live-Staging (optional, braucht Login):** Seed-Accounts in `docs/STAGING.md` (CRM-Admin / HV / Partner / Mieter). Es gibt **keinen** Auth-Bypass. Fürs Festzurren reichen Mock-HTML + Ist-PNGs.

Kopiere den Block **PROMPT** 1:1.

---

## PROMPT

```
Du bist Senior Product/UI Designer für „Bärenwald“ — Handwerk / Hausverwaltung / Bauprojekte in München.

# Auftrag
Arbeite auf EXISTIERENDEN Mocks (CRM-Standalone HTML + Portal-Mocks/Screenshots).
NICHT die App neu erfinden. NICHT Features hinzufügen.
Ziel: Design festzurren — eine klare visuelle Sprache, gleiche Jobs = gleiche Surfaces, menschliche Hierarchie statt AI-Dashboard-Look.

# Produkt in einem Satz
Bärenwald verbindet CRM (Büro) mit Portalen (Partner/Handwerker, Hausverwaltung, Mieter/Eigentümer) und öffentlichen Melde-Flows. Ein Vorgang (Anfrage → Angebot → Auftrag → Rechnung) muss auf allen Oberflächen denselben Zustand und denselbe Sprache haben.

# Nordstern
1) Desktop CRM = Büro-Werkzeug (Sidebar, Listen, Detail mit Tabs, eine Primary).
2) Mobile CRM = App (Bottom Nav, Sheets, Sticky Primary, große Taps).
3) Portale = ruhiger, gebrandeter Kunden-/Partner-Workspace (PortalShell) — nicht wie das CRM aussehen, aber dieselben Jobs-Regeln.
4) Document-Flows (Angebot, Rechnung, Abnahme, Vertrag) = DocumentCanvas / Lexware-ähnlich: Dokument im Fokus, Meta seitlich/Sheets, nicht 7 Wizard-Steps ohne Not.

# Anti-AI-Design (hart — das ist der Hauptgrund für diesen Auftrag)
Vermeide und korrigiere überall, wo der Ist-Zustand so wirkt:
- Lila/Indigo-Verläufe, Glow, Glassmorphism, „AI SaaS“-Look
- Zu viele Pill-Chips, Stat-Strips, Icon-Rows, Badge-Spam in Listen
- Cards-in-Cards, graue Kästen um jede Meta-Zeile, doppelte Schatten
- Mehrere Primary-Buttons auf einem Screen
- Flat cream + Terracotta + Serif-Display (AI-Klischee)
- Newspaper-Dense / Hairline-Chaos ohne klare Fokus-Fläche
- Hero mit floating Badges/Sticker (Landing — gilt für Marketing; CRM/Portal: keine Deko-Badges auf Content)
- Jeder Screen sieht aus wie ein Mini-Dashboard — falsch. Eine Composition, ein Job.

Stattdessen:
- Bärenwald-Grün als Accent (bestehende Tokens beibehalten)
- 0.5px Borders, ruhige Flächen, klare Typo-Hierarchie (Titel / Text / Meta)
- Weniger Boxen: Label–Wert als Klartext-Rows, wo kein Interaction-Container nötig
- Eine Primary pro Viewport; Rest Ghost / Secondary / ⋯
- Status: EIN Badge-System (Tone), nicht 4 verschiedene Pill-Styles
- Empty States: eine Pattern (Icon optional + 1 Satz + optional CTA)
- Mobile: Bottom Sheets statt Desktop-Popover; Sticky Footer für den entscheidenden CTA

# Design-System (nicht neu erfinden)
CRM-Primitives (Namen beibehalten / angleichen):
- Shell: Sidebar + TopBar (Desktop); BottomNav (Mobile)
- .btn.primary / .ghost / .danger / .sm
- .card / .chip / .badge — Card-Header-CTA: MockBtn sm secondary (nicht ghost auf weiß); Details docs/DESIGN-CSS.md
- DetailShell (Tabs Desktop links / Mobile Drill-down)
- DetailActionsBar (1 Primary + Secondary + ⋯)
- EditorSheet (Desktop Slide-over oder Center bei Canvas; Mobile Bottom Sheet)
- DocumentCanvas (Fullscreen Dokument-Flow)
- PosBoard / Positionen-Board (Leistungen AG/RE)
- MockModal / ActionSheet / PickerSheet
- StatusBadge

Portal-Primitives:
- PortalShell + Bottom/Top Nav je Rolle
- PortalDetailCard, PortalListCard, PortalEmptyState
- portal-action-btn (Sticky Primary), btn-pill-* (sekundär inline)
- PortalConfirmDialog (kein window.confirm)
- EinstellungenSectionHeader / Klartext-Rows (keine grauen Meta-Kästen)

# Was du liefern sollst
1) Aktualisierte Mock-Datei(en) — CRM Standalone + ggf. Portal-HTML/Figma-Frames.
2) Changelog: ANGEGLICHEN / ENTFERNT (Inkonsistenz) / UNVERÄNDERT (bewusst).
3) Screen-Map unten abarbeiten — pro Screen kurz annotieren:
   - Job (1 Satz)
   - Primäraktion
   - Surfaces (welche Komponenten)
   - Desktop vs Mobile Delta
   - Was du vereinheitlicht hast
4) Komponenten-Galerie (1 Seite): Buttons, Badges, Cards, List-Row, Sheet, Empty, Banner Info/Warn — EIN Look.

# Screen-für-Screen — CRM

Arbeite jeden Screen ab. Wo der Mock schon gut ist: nur Härten. Wo AI-Müll/Uneinheitlichkeit: straffen.

## C0 — App-Shell
- Job: Navigation Arbeit / Stammdaten / Planung
- Desktop Sidebar: Dashboard, Vorgänge, Kunden, Handwerker/Partner, Kalender, Einstellungen
- Mobile BottomNav: Dashboard · Vorgänge · FAB Neu · Kalender · Kunden · Mehr
- Keine doppelte Sticky-Leiste auf Entity-Detail (BottomNav hide auf Detail)

## C1 — Dashboard / My Work
- Job: Was braucht heute Aufmerksamkeit?
- Erste Viewport = Arbeitsliste (nicht Chart-Spam): stille Angebote, Freigaben, RE überfällig, WV
- Charts/Stats sekundär unterhalb oder einklappbar
- Eine klare Primary nur wenn es einen globalen „Weiter“-Job gibt — sonst Zeilen-CTAs

## C2 — Vorgänge-Liste
- Job: Alle Vorgänge finden, filtern, öffnen
- List-Row: Titel, Kunde, Status-Badge, Betrag/Datum — KEIN Kontext-Badge-Spam, KEINE Aktion-Spalte
- Filter: Desktop Chips/Popover; Mobile Filter-Sheet
- Bulk-Auswahl: eine Bulkbar, destruktiv mit Confirm-Modal
- Empty: eine Pattern

## C3 — Vorgang-/Anfrage-Detail
- Job: Status verstehen + nächste Aktion
- DetailShell Tabs (Übersicht · … · Akte)
- DetailActionsBar: statusabhängige Primary (Senden / Annehmen / …), Secondary, ⋯
- Meta als Klartext-Rows, nicht graue Key-Value-Kästen
- Timeline/Verlauf ruhig, keine Card-Kaskade

## C4 — Angebot-Detail + Angebot-Wizard (DocumentCanvas)
- Job: Angebot erstellen/korrigieren und versenden
- Canvas: Dokument links/zentral (Positionen PosBoard), Meta Crow (Kunde, Dokument, Zahlung, Versand)
- Einfach vs Komplex (Gewerke) — gleiche Shell
- Mobile: Sticky Weiter/Senden; Sheets für Meta
- Kein 5-Step-Zwang wenn Canvas schon Dokument-Logik hat

## C5 — Auftrag-Detail
- Job: Leistung, Zahlung, Vor Ort, Abschluss
- Tabs Kern: Übersicht · Leistungen · Zahlung · (Vor Ort / Akte je Spec) · Mehr
- Primary statusabhängig (nicht immer „Rechnung“)
- Erledigt ≠ bezahlt; Badge „Zahlung offen“ wenn RE offen
- Leistungen: PosBoard / Zuweisung; Zahlung: Abschlagsplan + Raten-Drawer

## C6 — Rechnung-Detail + Rechnung-Wizard
- Job: Rechnung stellen, korrigieren, bezahlt markieren
- Analog Angebot-Canvas; Korrektur bei Gesendet = klarer CTA „Korrigieren“ (nicht totes „Bearbeiten“)
- Zahlung-Tab: Plan + Belege; gestellte Raten eingefroren sichtbar machen

## C7 — Kunden / Handwerker / Partner Listen + Detail
- Job: Stammdaten pflegen
- Master-Detail Desktop wo sinnvoll; Mobile immer Route-Detail
- Gleiche List-Row / DetailShell Sprache wie Vorgänge

## C8 — Kalender
- Job: Termine sehen und öffnen
- Ruhiger Kalender; Event-Tap → Sheet/Detail — kein Widget-Overload

## C9 — Einstellungen / Vorlagen / Katalog
- Job: Firma, Vorlagen, Preisliste
- Section Headers + Klartext; Forms in Sheets; keine Settings-Dashboard-Collage

## C10 — Create-Flows (FAB Neu)
- Anfrage / Angebot / Rechnung / Abnahme → gleicher Einstieg in DocumentCanvas oder EditorSheet
- Kunde wählen: PickerSheet; Nested „Kunde anlegen“ ok

# Screen-für-Screen — Portale

Portale teilen Shell-Feeling, unterscheiden sich in Rolle und Branding (WL möglich).

## P0 — Portal Auth
- Login / Registrieren / OTP / Einladung
- Brand-Panel + Form; Staging-Hinweis dezent
- Kein Marketing-Hero-Overkill auf Auth

## P1 — Partner-Portal (Handwerker)
- Job: Aufträge sehen, annehmen, vor Ort dokumentieren, abschließen, Rechnung/Dokumente
- Screens: Login, Dashboard/Liste Aufträge, Auftrag-Detail (Tabs Leistungen/Termine/Dokumente/Abschluss), Compliance/Stamm, Firmendaten, Kalkulation wo vorhanden
- Sticky Primary für die eine Entscheidung (Annehmen, Abschließen, Senden)
- Listen mobil Cards; Desktop ruhige Rows/Tabelle nur wo Daten dicht sind

## P2 — HV-Portal (Hausverwaltung / Organisation)
- Job: Eingang/Meldungen, Freigabe, Objekte, Vorgänge, Einstellungen/Branding
- Screens: Dashboard/Eingang, Vorgang-Detail (Freigabe/Angebot), Objekte-Liste, Objekt-Detail (Einheiten, Kontakte, Prüfpflichten, Finanz), Einstellungen, Melde-Material
- Freigabe-CTA sticky mobil; Objekt-Detail mit PortalDetailCard, nicht CRM-Admin-Tabellen-Look auf Mobile

## P3 — Mieter- / Eigentümer-Portal
- Job: Vorgänge verfolgen, Dokumente, Einstellungen, ggf. Melden
- Weniger Admin, mehr Status-Klarheit; Timeline statt dichter Tabellen
- Gleiche Empty/Pill/Confirm-Patterns wie andere Portale

## P4 — Öffentlich Melden (+ Status-Token)
- Job: Schaden/Anliegen melden; Status ohne Login nachverfolgen
- Melde-Flow: klare Schritte, Foto-Upload, Bestätigung
- Status-Seite: ruhig, datensparsam, Legal-Links; kein CRM-Chrome

# Inkonsistenzen — aktiv jagen und fixen
Gehe die Mocks durch und markiere/fix:
1) Mehrere Button-Systeme auf einem Screen
2) Status-Pills in unterschiedlichen Farben/Radien für denselben Status
3) Meta in grauen Boxen vs. Klartext-Rows gemischt
4) Desktop-Popover-Muster auf Mobile-Layouts
5) Doppelte Primaries (Header + Sticky + Inline)
6) Cards ohne Interaktionsgrund
7) Unterschiedliche Empty States
8) Destruktive Aktionen ohne Confirm / mit window.confirm-Look
9) Listen mit Badge-Spam / Icon-Leisten ohne Nutzen
10) Wizard-Chrome unterschiedlich zwischen AG und RE

# Erfolgskriterium
- Ein Entwickler kann den Mock als Positivliste lesen und umsetzen.
- CRM und Portale fühlen sich wie eine Produktfamilie, nicht wie drei Themes.
- Kein Screen braucht die Frage „welches Button-/Badge-System gilt hier?“
- Es sieht aus, als hätte ein Mensch mit Handwerks-/Büro-Verständnis designed — nicht ein generisches AI-Dashboard.
```

---

## Kurz: so nutzt du den Prompt

1. Claude Designer öffnen, PROMPT einfügen.  
2. Aus `docs/designer-pack/` anhängen:
   - beide HTML aus `mocks/`
   - **alle** PNGs aus `screenshots-ist/` (oder mindestens: Dashboard, Vorgänge, Angebote, Aufträge×2, Rechnungen, Partner×2, HV, Mieter, Melden)
3. Explizit sagen: „Vergleiche Mock-HTML mit screenshots-ist — jage Inkonsistenzen, passe den Mock an, erfinde nichts Neues.“
4. Bitte um: zuerst Komponenten-Galerie, dann Screen-Pass CRM, dann Portale + Changelog.

## Pack neu befüllen

Falls Downloads neuer sind:

```bash
# manuell: neueste Standalone + Portale nach docs/designer-pack/mocks/ kopieren
# Screenshots aus ~/Downloads (*Bärenwald CRM*.png, Partner*.png) kuratieren
```

Live-Screens ohne Seed-Login gehen nicht — öffentliche Surfaces (`/melden/…`, Login-Seiten) schon.

## Verwandte Docs (intern)

| Doc | Nutzen |
|-----|--------|
| `docs/DESIGNER-PROMPT-MOCK-ERGAENZUNG.md` | Älterer CRM-only Prompt (Lexware/Canvas) |
| `docs/DESIGN-KURZSPEC-DESKTOP-MOBILE.md` | Job → Surface Desktop/Mobile |
| `docs/DESIGN-CSS.md` | Token/CSS-Quelle CRM |
| `docs/MOCK-POSITIVLISTE.md` | Was bewusst nicht existiert |
| `baerenwald/docs/portal-design-vereinheitlichung.md` | Portal-Pattern-Checkliste |
