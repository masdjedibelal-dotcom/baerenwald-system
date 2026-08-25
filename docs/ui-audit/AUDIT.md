# UI-Konsistenz-Audit

**Stand:** 2026-08-25 · Analyse-only (Historie)  
**Nachzug:** Produktentscheidungen eingefroren in [`PATTERN-LEITFADEN.md`](./PATTERN-LEITFADEN.md) + `docs/claude-project/07-DESIGN.md`.  
**Repos:** `baerenwald` + `baerenwald-system`  
**Regeln:** `docs/DESIGN-CSS.md`, `docs/claude-project/07-DESIGN.md`, `docs/SURFACE-TEST-CHECKLISTE.md`, Leitfaden  
**Schweregrade:** **Bruch** (Regel verletzt / Nutzer sieht Widerspruch) · **Uneinheitlich** (zwei Muster parallel) · **Kosmetik** (gering, aber sichtbar)

Siehe auch: [INVENTAR.md](./INVENTAR.md) · [PATTERN-LEITFADEN.md](./PATTERN-LEITFADEN.md)

---

## Top 10 — größte Nutzer-Sichtbarkeit

| # | Fund | Schwere | Wo |
|---|------|---------|-----|
| 1 | **Status-Wortlaut dreifach** — „Gesendet HW“ / „An Partner gesendet“ / „Gesendet Handwerker“; Auftrag „Fertig“ vs „Abgeschlossen“; RE „Versendet“ vs „Gesendet“ | **Bruch** | `vorgang-labels.ts` · `status-display.ts` · `dashboard-mock-mapping.ts` · Vorgänge-Liste vs Dashboard |
| 2 | **Button-Primitive dual** — `MockBtn` vs `ui/Button` vs raw `className="btn primary"` (~67 / ~92 / ~30+ Dateien) | **Uneinheitlich** | CRM gesamt; Offenders: Formulare, AngebotWizard, AnfrageLeadTabsShared |
| 3 | **Mehrere Primary-CTAs** auf denselben Screens (Regel: max. 1) | **Bruch** | u. a. `AnfrageLeadTabsShared` (7), `AuftragFinanzenClient`, `AngebotVersandSection`, `AuftragNachtragBaustoppSection` |
| 4 | **Zwei Status-Badges** in Rechnungskorrektur-Zeilen | **Bruch** | `VorgaengeListeClient.tsx` (`dualBadges`) |
| 5 | **Whitelabel-Leak:** CTA „Zu Bärenwald registrieren“ auf org-branded Melde-Bestätigung | **Bruch** | `mieter-wl.ts` / Bestätigungsseite |
| 6 | **Portal-Fonts ≠ Marketing** — Portal/Partner System/SF/Roboto; Marketing Jakarta/Lora | **Uneinheitlich** | `portal2/tokens.ts`, `globals.css` vs Landing |
| 7 | **Du/Sie-Mix** — Portal Sie, Partner Du, Privat-Empty „deine Anfragen“, Datenschutz Du, Converter Sie | **Bruch** | Copy-Constants Website |
| 8 | **Doppelter Rechner** `/rechner` ≈ `/portal-tools/rechner` | **Uneinheitlich** | Website `src/app` |
| 9 | **HW-Tausch: alter Partner behält Portal-/BT-Zugriff** (`ersetzt` ohne Sperre) — Produkt/UX+Datenschutz | **Bruch** | Partner-Portal `get-partner-data` / RLS ohne Status-Filter |
| 10 | **Zwei öffentliche Status-Welten** `/projekt/[token]` vs Legacy `/status/[id]` + Mieter `/melden/status/[token]` | **Uneinheitlich** | CRM-Token + Website Melden |

---

## B1 — Design-System-Treue (CRM)

### B1.1 Buttons / Chips / Badges / Cards ohne Mock-Primitives

| Fund | Schwere | Route / Komponente | Befund |
|------|---------|-------------------|--------|
| `ui/Button` parallel zu `MockBtn` | Uneinheitlich | ~92 Dateien | Beide rendern `.btn`, aber zwei React-APIs (`variant` vs `kind`) |
| Raw `btn primary` / `btn ghost` | Uneinheitlich | u. a. `FormularBearbeitenPanel`, `AngebotWizard*`, `StaffFunnelWizard`, Auth reset | CSS-Klassen manuell, kein Primitive |
| Tailwind `emerald-*` / `green-*` Status | Bruch | `auftrag-handwerker-status.ts`, Angebot-Versand/Partner-Sections, Compliance, KI-Hub | Bypass `StatusBadge`/`MockBadge` |
| Hardcode-CTA `bg-[#1A3D2B]` | Uneinheitlich | `AngebotVisualisierungClient`, `AngebotVisualisierungenTab` | Token umgangen |
| Custom Border/Text `#2E7D52` | Kosmetik | `LeadGptStudioBlock` | Brand-Hex, aber nicht über Primitive |

**Positiv:** Hyphen-Altklassen `btn-primary` etc. sind weg (Build-Guard greift). Cards laufen über `MockCard`-Wrapper.

### B1.2 CSS außerhalb globals / mock-design-system

| Fund | Schwere | Datei | Befund |
|------|---------|-------|--------|
| Extra Komponenten-CSS | Uneinheitlich | `src/styles/staff-funnel.css` | Einzige Extra-Datei; Funnel-Scope |
| Keine `*.module.css` unter `src/` | — | — | Gut |
| Inline-Styles | Kosmetik | Visualisierung, GPT-Blöcke | Einzelfälle |

### B1.3 Hardcodierte Farben (nicht Token)

**Soll:** `#2e7d52` / `#1a3d2b` (+ Soft `#eaf3de` / `#e7f1e9`).

| Hex / Klasse | Schwere | Ort | Befund |
|--------------|---------|-----|--------|
| `#16a34a`, `#15803d`, `#166534`, `#14532d`, `#dcfce7` | Bruch | `mock-design-system.css` `.akt-card--angebot` | Tailwind-Green-Palette |
| `#0f766e`, `#0d9488`, `#ccfbf1` | Uneinheitlich | `.akt-card--status` | Teal-Nebenwelt |
| `#2a724b`, `#1a7a4c`, `#1a7f4e`, `#2f6b4f` | Kosmetik | mock-CSS / staff-funnel Hover/Fallback | Nahe Brand, aber nicht Token |
| `#153222` | Kosmetik | Visualisierung Hover | Dunkler als Brand |
| `emerald-*` / `green-*` Tailwind | Bruch | diverse Components | Status/Doc-Farben |

### B1.4 Primary-Button-Regel

| Fund | Schwere | Screen | Befund |
|------|---------|--------|--------|
| ≥3 Primary-Marker | Bruch | `AnfrageLeadTabsShared` | Mehrere `.btn.primary` / Primary-CTAs gleichzeitig möglich |
| ≥3 | Bruch | `AuftragFinanzenClient`, `AngebotVersandSection`, `AuftragNachtragBaustoppSection`, `AbnahmeMaengelBearbeitenFlow` | Überladung |
| ≥3 | Uneinheitlich | Listen `KundenListeClient` / `HandwerkerListeClient` | oft Toolbar + Empty + Row |
| Screens ohne klaren Primary | Uneinheitlich | Dashboard KPI-Wand; Einstellungen-Aliase | Spec will „Heute — deine Schritte“ — Ist = KPI |

### B1.5 Mehrere Status-Badges pro Zeile

| Fund | Schwere | Datei | Befund |
|------|---------|-------|--------|
| Dual-Badges Korrektur | Bruch | `VorgaengeListeClient.tsx` | `dualBadges.primary` + `.secondary` nebeneinander |
| Spec § | — | DESIGN / Surface | „Ein Status-Badge pro Zeile“ |

---

## B2 — Surface-Muster

### B2.1 Anlegen/Bearbeiten ohne EditorSheet

| Fund | Schwere | Ort | Befund |
|------|---------|-----|--------|
| `KundeModal` / `KundenObjektModal` | Uneinheitlich | Angebot-/Rechnung-Wizard Nested | Modal statt nur EditorSheet (teilweise Spec: Center über Canvas ok) |
| `AbschlagsplanEditorModal` | Uneinheitlich | RechnungWizard | Eigenes Modal |
| Formular-Template Fullpage | Uneinheitlich | `/formulare/.../bearbeiten` | Kein EditorSheet-Muster |
| Verträge-Wizards | Uneinheitlich | Auftrag | Eigene Fullscreen-Flows |
| Objektakte Sections | Uneinheitlich | Mix EditorSheet + MockModal (Löschen) | Lösch-Confirm = Modal ok; Edit meist Sheet |

### B2.2 DocumentCanvas

| Fund | Schwere | Befund |
|------|---------|--------|
| Alter Docs-Name „WizardShell“ | — | Obsolet; kanonisch nur `DocumentCanvas` + Sticky DocBar (Leitfaden eingefroren) |
| Angebot/RE | — | Dominant und relativ konsistent als Canvas |
| Staff-Funnel / Formulare | Uneinheitlich | Eigenes CSS + Stepper-Logik |
| Mängel-Flow | Uneinheitlich | Eigene Seite, kein Canvas |

### B2.3 Detail-Tabs

| Fund | Schwere | Entity | Befund |
|------|---------|--------|--------|
| Pipeline 4 Tabs | — | Anfrage/Angebot/Auftrag/RE | **Dominant & kanonisch** |
| Handwerker: Compliance statt Zahlung | Uneinheitlich | bewusste Abweichung | ok, aber dokumentieren |
| Kunden: Objekte statt Zahlung | Uneinheitlich | bewusste Abweichung | ok |
| Legacy-Query-Aliase | Kosmetik | `bautagebuch`→Leistungen etc. | funktioniert, aber Tab-ID-Mapping komplex |

### B2.4 Mobile

| Fund | Schwere | Befund |
|------|---------|--------|
| Bottom-Sheet via EditorSheet | — | Vorhanden auf vielen Flows |
| Tab-IDs Desktop/Mobile | Uneinheitlich | gleiche IDs angestrebt; Drill-down Mobile (Surface-Checkliste B7) — prüfen pro Screen |
| Horizontales Scrollen | Uneinheitlich | Listen/Tabellen (Vorgänge, Finanzen) — typisches Risiko; im Code viele overflow-x Klassen möglich |
| Mobile Bottom-Nav ausgeblendet auf Detail | — | Spec-konform |

---

## B3 — Sprache & Status

### B3.1 Status-Wörter nebeneinander (derselbe Zustand)

| Zustand (DB/Konzept) | Vorgang-Labels | status-display / Detail | Dashboard-Mock | Partner-Portal |
|----------------------|----------------|-------------------------|----------------|----------------|
| Auftrag `offen` | Offen | Offen | **In Arbeit** | oft „Offen“ / Phase Auftrag |
| Auftrag `abgeschlossen` | Abgeschlossen | Abgeschlossen | **Fertig** | — |
| Angebot → HW gesendet | Gesendet Handwerker | **An Partner gesendet** | **Gesendet HW** | Anfrage-Phase |
| HW akzeptiert | Handwerker akzeptiert | **Partner akzeptiert** | HW akzeptiert | — |
| RE gesendet | Gesendet | Gesendet (+ Überfällig) | **Versendet** | — |
| Lead abgebrochen | Verloren | Verloren | — | — |
| Korrektur RE versendet | Korrektur Versendet | dual badge „Gesendet“+Korrektur | — | — |

**Mieter-Timeline** (`/melden/status`): eigene Ereignis-Texte (Termine, Feedback, Abnahme-PDF) — nicht dieselben Pipeline-Wörter; Risiko „andere Sprache“ für denselben Auftrag.

### B3.2 Du / Sie

| Surface | Soll | Ist | Schwere |
|---------|------|-----|---------|
| Marketing Landing/Ratgeber | Du | Du | ok |
| Melde / Portal Auth / Mieter-WL | Sie | Sie | ok |
| Partner Auth & Toasts | (unklar) | **Du** | Uneinheitlich vs Portal Sie |
| Portal Privat Empty | Sie | **„deine Anfragen“** | Bruch |
| Leistungen Converter | — | Sie | Uneinheitlich vs Marketing Du |
| Datenschutz-Seite | formal | **Du** | Bruch |
| CRM Staff | informell ok | Du-ähnlich in Assistent | Kosmetik |

### B3.3 Button-Beschriftungen (gleiche Aktion, verschiedene Wörter)

| Aktion | Varianten gefunden | Schwere |
|--------|-------------------|---------|
| Persistieren | Speichern · Übernehmen · Fertig · ✓ (Sheet) | Uneinheitlich |
| Absenden Mail | Senden · Versenden · Ohne Versand | Uneinheitlich (teils Spec) |
| Wizard step | Weiter | ok |
| Confirm | Bestätigen · Zustimmen (Nachtrag) | Kosmetik |

### B3.4 Datum / Geld

| Fund | Schwere | Befund |
|------|---------|--------|
| Datum | Uneinheitlich | `formatDatum` / `formatDatumZeit` (`utils.ts`) dominant; Mail `formatDatumDeFromIso`; ISO-Slices `slice(0,10)` lokal |
| Geld | Uneinheitlich | Viele lokale `toLocaleString('de-DE')` + ` €`; teils `style: 'currency'`; teils 0 / 2 Nachkommastellen — **kein** zentrales `formatEuro` |
| Soll-Nähe | — | de-DE + € ist Richtung, aber Format-API fragmentiert |

---

## B4 — Website & Portale

### B4.1 Fonts

| Surface | Erwartung | Ist | Schwere |
|---------|-----------|-----|---------|
| Marketing | Plus Jakarta Sans / Lora | next/font → `--font-sans` / `--font-display` | ok |
| Portal / Partner | oft Jakarta | **System / SF Pro / Roboto** (`portal2/tokens`) | Uneinheitlich |
| `global-error.tsx` | Brand | system-ui | Kosmetik |

### B4.2 Radius / Pills / Abstände

| Fund | Schwere | Befund |
|------|---------|--------|
| Landing ~18px Cards, Pill-Buttons | — | Dominant auf Marketing |
| Portal2 eigene Token | Uneinheitlich | Parallel-Design-System zu Landing |
| Ausreißer | Kosmetik | Funnel-UI eigene Abstände |

### B4.3 Whitelabel-Leaks

| Fund | Schwere | Ort |
|------|---------|-----|
| „Zu Bärenwald registrieren“ | Bruch | Melde-Bestätigung |
| Fallback-Grün `#2E7D52` wenn `org_primary` fehlt | Uneinheitlich | melden.css / Bestätigung |
| „Technischer Service von …“ | ok (intentional) | MeldeServiceByLine |
| PWA `applicationName: "Bärenwald"` | Uneinheitlich | `portal/layout.tsx` für WL-Nutzer |
| Aushang „Partner Bärenwald“ | Kosmetik | Print, nicht Mieter-UI |

### B4.4 Empty States & Fehlerseiten

| Screen / System | Gestalt? | Schwere |
|-----------------|----------|---------|
| Marketing `not-found` | Ja („Diese Seite gibt es nicht.“) | — |
| `error.tsx` / `global-error` | Ja, unterschiedlich (Fonts) | Uneinheitlich |
| Portal/Partner `PortalStateView` (`leer`, `e404`, `zugriff`, `server`, `offline`) | Ja | — |
| `PortalInboxEmpty` parallel | Zweite Empty-UI | Uneinheitlich |
| Melde `/melden/fehler` | Ja (`MIETER_WL_FEHLER`) | — |
| Soft-gelöschter Status-Token | **nackte Next-404** | Bruch (keine erklärende Copy) |
| CRM Listen Empty | MockEmpty teilweise | Uneinheitlich |
| CRM Einstellungen-Aliase | oft Redirect, kaum Empty | Kosmetik |

---

## B5 — Gewachsen-Muster (Meta)

| Muster | Variante A (neuer/dominant) | Variante B (parallel/legacy) | Empfehlung |
|--------|----------------------------|------------------------------|------------|
| Buttons | `MockBtn` + `.btn.*` | `ui/Button` + raw `btn` | **A** kanonisch; B als Thin-Wrapper vereinheitlichen |
| Modal | `ui/Modal` | viele `*Modal.tsx`, MockModal-Adapter | **A**; Domain-Modals nur Inhalt |
| Sheets | `EditorSheet` | MobileEditSheet, FormSheet, SidePanel | **EditorSheet** |
| Document Wizard | `DocumentCanvas` | — | Docs-Name WizardShell → DocumentCanvas (2026-08-25) |
| Listen Pipeline | `VorgaengeListeClient` | Alias-Routen | **A** |
| Stammdaten-Listen | Kunden/HW Master-Detail | — | ok getrennt |
| Toast | custom `app-toast` | `sonner` in package, ungenutzt | **A**; sonner entfernen (später) |
| Status-Badge | `StatusBadge` → MockBadge | emerald-Tailwind, LeadStatus*-Varianten | **A** |
| Status-Labels | `vorgang-labels` / `status-display` | `dashboard-mock-mapping` Kurzformen | **eine** Map für UI |
| Rechner | `/rechner` | `/portal-tools/rechner` Clone | eine Route + Redirect |
| Landing | `BaerenwaldLandingClient` | `HomeLanding` ungenutzt | A; B löschen/archiv |
| Auth Shell | `PortalAuthShell` | `PartnerAuthShell` Wrapper | ok dünn |
| Portal Empty | `PortalStateView` | `PortalInboxEmpty` | eine Empty-API |
| Öffentlicher Status | `/melden/status` + `/projekt` | `/status/[id]` Legacy | Legacy deprecaten |
| Abnahme | Sheet im Auftrag | `/abnahme/erstellen` Redirect | Sheet kanonisch |

### Verwaiste / Soft-Orphan Routen

| Route | Status |
|-------|--------|
| `/auftraege/[id]/abnahme/erstellen` | Redirect; noch Deep-Links in Cards/`naechste-schritte` |
| `/auftraege/[id]/abschluss` | Redirect |
| `/angebote/[id]/bearbeiten` | Redirect; noch Push aus Anfrage-Tabs |
| `/status/[id]` | Live, nicht in CRM-Nav; Mail-Links möglich |
| `HomeLanding` (Komponente) | ungenutzt |
| `sonner` Dependency | ungenutzt in `src/` |
| `AbnahmeprotokollCreateWizard` | orphan (kein Import gefunden) |

---

## Kurzfazit

Das CRM hat eine **klare Surface-Richtung** (Vorgänge, DetailShell 4 Tabs, DocumentCanvas, EditorSheet, Mock-CSS), aber die **Wort- und Primitive-Ebene** ist noch gewachsen: drei Status-Sprachen, zwei Button-APIs, mehrere Primaries, Dual-Badges. Die Website trennt Marketing und Portale optisch (Fonts), was Whitelabel hilft — gleichzeitig lecken BW-Marke und Anrede in WL-/Portal-Copy.

*Leitfaden-Entwurf:* [PATTERN-LEITFADEN.md](./PATTERN-LEITFADEN.md)
