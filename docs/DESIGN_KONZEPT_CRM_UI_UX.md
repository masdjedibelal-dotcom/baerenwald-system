# Bärenwald CRM — UI/UX-Konzept (Soll-Zustand)

**Stand:** Juni 2026  
**Zielgruppe:** Product, Design, Entwicklung, Stakeholder  
**Zweck:** Vollständiges **Zielbild** für UI und UX — verständlich, intuitiv, umsetzbar. Ergänzt das Ist-Audit in [DESIGN_AUDIT_CRM_FUNDAMENT.md](./DESIGN_AUDIT_CRM_FUNDAMENT.md).

**Kernversprechen in einem Satz:**

> *„Ich öffne das CRM und sehe sofort, was heute dran ist. Ein Klick — und ich bin beim richtigen Projekt, beim richtigen Schritt.“*

**Bezug zu anderen Dokumenten:**

| Dokument | Rolle |
|----------|-------|
| [DESIGN_AUDIT_CRM_FUNDAMENT.md](./DESIGN_AUDIT_CRM_FUNDAMENT.md) | Ist-Zustand, Lücken, Code-Pfade |
| Dieses Dokument | **Soll-Zustand** — wie es aussehen und sich anfühlen soll |
| [HANDWERKER_KOORDINATION_PROZESS.md](./handwerker-koordination/HANDWERKER_KOORDINATION_PROZESS.md) | Fachlicher HW-Flow |
| [CRM_PARTNER_FLOW_CHECKLIST.md](./CRM_PARTNER_FLOW_CHECKLIST.md) | CRM ↔ Partner-Portal |

---

## Inhaltsverzeichnis

1. [Grundprinzip](#1-grundprinzip)
2. [Navigation — vier Bereiche](#2-navigation--vier-bereiche)
3. [Projekt-Kette (roter Faden)](#3-projekt-kette-roter-faden)
4. [Ein Bildschirm-Muster für alles](#4-ein-bildschirm-muster-für-alles)
5. [Heute — das Dashboard](#5-heute--das-dashboard)
6. [Projekte — eine Pipeline](#6-projekte--eine-pipeline)
7. [Detail-Welten: Anfrage, Angebot, Auftrag](#7-detail-welten-anfrage-angebot-auftrag)
8. [Positionen — der tägliche Arbeits-Screen](#8-positionen--der-tägliche-arbeits-screen)
9. [Wizards — ein Muster](#9-wizards--ein-muster)
10. [Status — eine Sprache](#10-status--eine-sprache)
11. [Mobile](#11-mobile)
12. [Kontakte & Finanzen](#12-kontakte--finanzen)
13. [CRM ↔ Partner-Portal](#13-crm--partner-portal)
14. [Leere Zustände](#14-leere-zustände)
15. [Visuelle Sprache](#15-visuelle-sprache)
16. [Bewusst weggelassen](#16-bewusst-weggelassen)
17. [Umsetzungswellen](#17-umsetzungswellen)
18. [Erfolgskriterien](#18-erfolgskriterien)
19. [Abgleich: Claude Spec & Mockup](#19-abgleich-claude-spec--mockup)
20. [Zusammenfassung](#20-zusammenfassung)

---

## 1. Grundprinzip

Menschen denken nicht in Tabellen. Sie denken in **Geschichten**:

```
Kunde ruft an → Angebot machen → Kunde sagt ja →
Handwerker koordinieren → Bau läuft → Abnahme → Rechnung → fertig
```

Das CRM muss diese Geschichte **sichtbar machen** — nicht verstecken hinter vielen Menüpunkten und Tabs.

### Die drei Regeln

| Regel | Bedeutung für den Nutzer |
|-------|--------------------------|
| **Ein Schritt pro Bildschirm** | Immer klar: Was ist hier zu tun? Was ist der nächste Klick? |
| **Eine Wahrheit pro Zeile** | Ein Status, ein Fortschritt — nicht drei Badges, die sich widersprechen |
| **Gleiches Muster überall** | Anfrage, Angebot und Auftrag sehen gleich aus — man muss nicht neu lernen |

### Diagnose (Ist) vs. Ziel (Soll)

| Ist (Fundament-Audit) | Soll (dieses Konzept) |
|-----------------------|------------------------|
| UI spiegelt die Datenbank | UI spiegelt den **Nutzer-Job** |
| 9+ parallele Module | **4 Bereiche** + Mehr |
| 6+ Status-Welten | **1 sichtbarer Status** + optionale Mini-Pipeline bei HW |
| Desktop ≠ Mobile (Tabs, Defaults) | **Gleiche IA**, andere Dichte |
| Dashboard = KPI-Wand | Dashboard = **„Heute“** |

---

## 2. Navigation — vier Bereiche

**Heute** vier getrennte Listen (Anfragen, Angebote, Aufträge …). **Neu:** vier Bereiche, die jeder versteht.

```
┌──────────────────────────────────────────────────────────┐
│  HEUTE        Was liegt an? (persönliche Arbeit)         │
│  PROJEKTE     Alles in der Pipeline (ein Einstieg)       │
│  KONTAKTE     Kunden · Handwerker · Partner              │
│  FINANZEN     Rechnungen · Zahlungen                     │
└──────────────────────────────────────────────────────────┘
        Kalender · Einstellungen · KI Hub  →  „Mehr“
```

| Bereich | Nutzer versteht | Technische Zuordnung (heute) |
|---------|-----------------|------------------------------|
| **Heute** | Morgen-Check, meine Schritte | Dashboard (neu strukturiert) |
| **Projekte** | Ein Ort für die ganze Kette | Anfragen + Angebote + Aufträge (eine Listen-IA, Filter nach Phase) |
| **Kontakte** | Wer sind die Menschen? | Kunden, Handwerker, Partner |
| **Finanzen** | Alles mit Geld | Rechnungen, Zahlungsplan, ggf. Auftrag/Finanzen |

**Kalender** bleibt erreichbar; Termine erscheinen primär unter **Heute**.

### Sidebar (Desktop) — Ziel-Sitemap

| Gruppe | Einträge |
|--------|----------|
| **Arbeit** | Heute · Projekte |
| **Stammdaten** | Kontakte (Kunden / Handwerker / Partner) |
| **Finanzen** | Rechnungen |
| **Mehr** | Kalender · KI Hub · Einstellungen |

### Mobile Bottom Nav

`Heute` · `Projekte` · `Kontakte` · `Mehr` (Finanzen, Kalender, Einstellungen)

FAB **„+ Neue Anfrage“** nur auf Projekte/Heute, wenn Kontext passt.

---

## 3. Projekt-Kette (roter Faden)

Auf **jedem** Detail-Screen (Anfrage, Angebot, Auftrag):

```
Maria Koch  ›  Anfrage #1247  ›  Angebot AN-2026-042  ›  Auftrag AU-2026-018
     ↑              ↑                    ↑                      ↑
  klickbar      klickbar             klickbar              aktueller Ort
```

**Nutzer-Verständnis:** *„Ich bin mitten in einer Geschichte — und kann jederzeit zur Anfrage oder zum Angebot springen.“*

Entspricht der bestehenden `ProjektKette`-Idee im Code — **überall** und **immer sichtbar** (nicht nur auf einzelnen Screens).

---

## 4. Ein Bildschirm-Muster für alles

Jeder Detail-Screen baut sich **identisch** auf:

```
┌─────────────────────────────────────────────────────────────────┐
│  [← Zurück]   Badsanierung Koch                    [Hauptaktion] │
│               AU-2026-018 · Maria Koch · Schwabing · 12.000 €    │
│               ● In Arbeit                                        │
│                                                                  │
│  Maria Koch › Anfrage › Angebot › Auftrag                        │
├─────────────────────────────────────────────────────────────────┤
│  ▼ Stammdaten (standardmäßig eingeklappt)                        │
├─────────────────────────────────────────────────────────────────┤
│  [ Tab 1 ]  [ Tab 2 ]  [ Tab 3 ]  [ Tab 4 ]                      │
│                                                                  │
│  … Inhalt des aktiven Tabs …                                     │
└─────────────────────────────────────────────────────────────────┘
```

### Die vier Zonen

| Zone | Inhalt | Sichtbarkeit |
|------|--------|--------------|
| **Kopf** | Titel, Nr., Kunde, Ort, Betrag, **ein** Status-Badge | Immer |
| **Hauptaktion** | **Ein** grüner Button — nächster sinnvoller Schritt | Immer, statusabhängig |
| **Projekt-Kette** | Breadcrumb durch Phasen | Immer |
| **Stammdaten** | Nr., Termine, PL, Kontakt, Projektleitung | Eingeklappt (ein Klick aufklappen) |
| **Tabs** | Max. **4–5** — nie mehr | Unterhalb |

**Warum eingeklappte Stammdaten?**  
Der Alltags-Job ist: Handwerker senden, Angebot nachfassen, Rechnung stellen — nicht Felder nachlesen.

### Pattern-Spec (Handoff)

| Element | Spezifikation |
|---------|---------------|
| Primär-CTA | Max. 1× `Button variant="primary"` pro Screen |
| Sekundär | Kunden-Link, Rechnung, Bearbeiten → `secondary` oder Menü `⋯` |
| Tabs Desktop = Mobile | Gleiche `id`, gleiches `label`, gleicher Default (pro Rolle dokumentiert) |
| Breakpoint | Master-Detail ab 900px; Mobile = Vollbild-Detail + gleiche Tabs |

---

## 5. Heute — das Dashboard

**Keine** KPI-Wand mit „-75 % vs. Vorwoche“ auf dem operativen Einstieg.

```
┌─────────────────────────────────────────────────────────────────┐
│  Guten Morgen, {Name}                                            │
│  {Wochentag}, {Datum} · {n} Dinge brauchen deine Aufmerksamkeit  │
├─────────────────────────────────────────────────────────────────┤
│  DEINE SCHRITTE HEUTE                                            │
│                                                                  │
│  ⚠  Angebot Müller — läuft in 3 Tagen ab        [Nachfassen]     │
│  ○  Handwerker Berger — noch nicht gesendet      [Jetzt senden]  │
│  ○  Rechnung Koch — 5 Tage überfällig            [Öffnen]        │
├─────────────────────────────────────────────────────────────────┤
│  Termine heute          │  Neue Anfragen (3)   │  Baustellen     │
│  09:00 Besichtigung     │  Maria Koch — Bad    │  Koch 65%       │
│  14:00 Abnahme Weidner  │  …                   │  Schmidt 20%    │
└─────────────────────────────────────────────────────────────────┘
```

| Block | Logik |
|-------|-------|
| **Deine Schritte** | Aus allen Projekten, priorisiert (überfällig, fällig heute, wartet auf Nutzer) |
| **Klick auf Schritt** | Deep-Link: Projekt + Tab + ggf. Modal |
| **Termine heute** | Aus Kalender, max. 3–5 Einträge |
| **Neue Anfragen** | Status neu/kontaktiert, Link ins Detail |
| **Baustellen** | Aktive Aufträge mit Fortschritt & Lieferdatum |

**KPIs** (Umsatz, Conversion, Trends) nur unter **Finanzen** oder **KI Hub**.

**Leeres To-do:** *„Alles erledigt für heute.“* + Link zu Projekte — Widget **nicht** mit „0“ und Leerfläche.

---

## 6. Projekte — eine Pipeline

Eine Listenansicht mit Phasen-Filtern — **ein Ort** statt drei Module.

### Filter-Chips (verständlich benannt)

```
[ Alles (24) ]   [ Offen (12) ]   [ Läuft (8) ]   [ Fertig (4) ]
```

| Chip | Inhalt | Beispiel |
|------|--------|----------|
| **Offen** | Anfragen + offene Angebote (noch kein laufender Auftrag) | Lead, Angebot gesendet |
| **Läuft** | Aktive Aufträge | Bau, HW, Abnahme |
| **Fertig** | Abgeschlossen, abgelehnt, storniert | Archiv |

**Nicht** „Pipeline“ ohne Erklärung — Label oder Tooltip: *„Offene Vorgänge ohne Abschluss“*.

### Listenzeile (einheitlich für alle Phasen)

| Spalte | Inhalt |
|--------|--------|
| **Nr.** | `AU-2026-018` / `AN-…` / Anfrage-Kurz-ID |
| **Projekt** | Titel + Ort (Hauptspalte) |
| **Kunde** | Name |
| **Wert** | Angebotssumme / Auftragswert |
| **Stand** | Fortschrittsbalken + relevantes Datum (Lieferung / Gültigkeit / Fälligkeit) |
| **Status** | **Ein** Badge |

**Suche:** Nr., Titel, Kunde, Ort — ein Feld.

**Status-Legende** unter der Tabelle (optional): Punkt + Label wie im Auftrags-Listen-Mockup.

### Sichtbarkeitslogik (Pipeline-Denken)

| Regel | Verhalten |
|-------|-----------|
| Anfrage mit angenommenem Angebot | Verschwindet aus „Offen“ in der aktiven Vertriebs-Pipeline |
| Angebot mit Auftrag | Erscheint unter „Läuft“ / Auftrag |
| Doppelte Einträge | **Nie** dieselbe Customer Journey in zwei Listen gleichzeitig |

Datenmodell (`lead_id`, `auftrag_id`) unterstützt das — UI muss es **konsequent** abbilden.

---

## 7. Detail-Welten: Anfrage, Angebot, Auftrag

Gleiches Layout (§4), unterschiedlicher **Default-Tab** und **Hauptaktion**.

### 7.1 Anfrage (Vertrieb)

**Hauptaktion (statusabhängig):**

| Status | Button |
|--------|--------|
| Neu | „Kunde kontaktieren“ |
| Kontaktiert | „Termin eintragen“ |
| Qualifiziert | „Angebot erstellen“ |
| Angebot erstellt | „Angebot öffnen“ |

**Tabs (max. 4):**

| Tab | Default | Inhalt |
|-----|---------|--------|
| **Nächste Schritte** | ✅ | Checkliste: Was fehlt? |
| **Angebote** | | Alle Angebote zu dieser Anfrage `(n)` |
| **Verlauf** | | Timeline |
| **Dokumente** | | Uploads, Fotos |

Kein separater Desktop-Tab „Stammdaten“ — Zone eingeklappt oben.

**Neue Anfrage:** Modal von der Liste (`?neu=1`), **kein** leeres Master-Detail-Panel.

---

### 7.2 Angebot (Vertrieb)

**Hauptaktion:**

| Status | Button |
|--------|--------|
| Entwurf | „Angebot fertigstellen“ |
| Gesendet | „Nachfassen“ |
| Angenommen | „Auftrag anlegen“ |
| Abgelehnt | „Neues Angebot“ |

**Tabs:**

| Tab | Default | Inhalt |
|-----|---------|--------|
| **Nächste Schritte** | ✅ | z. B. senden, HW-Preise prüfen |
| **Positionen** | | Gewerke + Leistungen |
| **Verlauf** | | Timeline |
| **Anhänge** | | PDF, Fotos |

**Status-Stufen** (links oder unter Kopf) — visuelle Treppe:

```
○ Entwurf  →  ● Gesendet  →  ○ Angenommen
```

**Gültigkeit:** relativ anzeigen (*„Noch 23 Tage“*) + Warnung bei < 7 Tagen.

**Wizard:** 3 Schritte — Leistungen → Finalisieren → Versand (bereits im Code; nicht neu erfinden).

---

### 7.3 Auftrag (Projektleitung)

**Hauptaktion (kontextabhängig — nie falscher CTA):**

| Situation | Button |
|-----------|--------|
| HW nicht zugewiesen | „Handwerker zuweisen“ |
| Zugewiesen, nicht gesendet | „An Handwerker senden“ |
| Bau läuft | „Baustelle öffnen“ (wenn Bauprojekt) |
| Abnahme fällig | „Abnahme starten“ |
| Fertig, nicht abgerechnet | „Rechnung erstellen“ |
| Alles erledigt | „Auftrag abschließen“ |

**Tabs:**

| Tab | Default PL | Inhalt |
|-----|------------|--------|
| **Positionen** | ✅ | Gewerke, Leistungen, HW, Baufortschritt |
| **Nächste Schritte** | Vertrieb | Checkliste projektweit |
| **Verlauf** | | Timeline |
| **Dokumente** | | Verträge, HW-Uploads, Abnahme, CRM-Uploads |
| **Finanzen** | | Zahlungsplan, Rechnungen, Marge |

**Compliance & Baustelle:** Abschnitte in Positionen oder Nächste Schritte — **keine** eigenen Top-Level-Tabs.

**Marge:** nur in Tab Finanzen — **nicht** in der Kopfzeile.

---

## 8. Positionen — der tägliche Arbeits-Screen

Aufbau (basiert auf v3, visuell und logisch geschärft):

```
┌─ Fortschritt ───────────────────────────────────────────────────┐
│  65 % erledigt · 4 von 6 Leistungen bestätigt                  │
│  Verkauf 12.000 €  ·  Partner 7.200 €  ·  Marge 4.800 €        │
└─────────────────────────────────────────────────────────────────┘

▼ 1 · Sanitär · 01.06 – 15.06
    ├─ Badewanne demontieren     Berger ✓ Bestätigt    1.200 €
    ├─ Dusche bodengleich          Berger ○ Wartet      3.400 €
    └─ [+ Leistung]

▼ 2 · Fliesen · 10.06 – 25.06
    └─ …

[ Handwerker zuweisen ]     [ 2 Anfragen senden ]  ← nur wenn relevant
```

### Handwerker Mini-Pipeline (pro Leistung)

```
Zugewiesen → Gesendet → Antwort → Freigabe → Bestätigt → Erledigt
    ●──────────○─────────○─────────○──────────○─────────○
```

| Punkt | Farbe | Bedeutung |
|-------|-------|-----------|
| Erledigt | Grün | Schritt abgeschlossen |
| Aktuell | Blau/Gelb | Hier ist Handlung nötig |
| Offen | Grau | Kommt noch |

Klick auf aktiven Schritt → Modal mit Detail + Aktion.

### Drei Kernaktionen

| Aktion | UI | Mail ans Portal? |
|--------|-----|------------------|
| **Zuweisen** | Zuweisung-Modal | Nein |
| **Senden** | Sticky Senden-Bar + Bestätigung | Ja |
| **Baufortschritt** | Status-Pill in Zeile | Nein |

Bearbeiten, Notiz, Löschen → `⋯` pro Zeile.

### Leere Zustände

| Situation | Text + CTA |
|-----------|------------|
| Keine Leistungen | „Noch keine Positionen — aus Angebot übernommen?“ |
| Kein HW | „Noch kein Handwerker — zuweisen“ |
| Nichts zu senden | Senden-Bar **ausblenden** |

---

## 9. Wizards — ein Muster

Gilt für: **Angebot**, **Rechnung**, **Projektvertrag** (optional).

```
Schritt 1          Schritt 2           Schritt 3
Was?               Details             Versand
────────           ───────             ───────
Leistungen         Gültigkeit,         PDF prüfen,
auswählen          Zahlungsplan,       Mail, Senden
                   Texte
```

| Regel | Detail |
|-------|--------|
| Container | Fullscreen-Modal (`AppFlowScreen`) |
| Fortschritt | `① ─── ② ─── ③` oben |
| Speichern | Auto-Save ab Schritt 2; Anzeige mit **Datum + Uhrzeit** |
| Abbrechen | „Als Entwurf speichern?“ |
| Neue Anfrage | Gleiche Shell-Logik als Modal, nicht eigene leere Page |

**Anfrage neu** und **Rechnung neu** von Listen aus per Modal — Routen `/anfragen/neu`, `/rechnungen/neu` redirecten oder öffnen Modal.

---

## 10. Status — eine Sprache

### Sichtbar für Nutzer (vereinfacht)

| Phase | Status-Labels |
|-------|---------------|
| **Anfrage** | Neu · Kontaktiert · Termin · Angebot erstellt · Abgeschlossen · Abgelehnt |
| **Angebot** | Entwurf · Gesendet · Angenommen · Abgelehnt |
| **Auftrag** | Geplant · Läuft · Abnahme · Fertig · Storniert |

Technisch: **ein** angezeigtes Feld pro Entität (`status_einfach` o. ä.) — Mapping in Status-Matrix (Fundament §7).

### Vier Farben — feste Semantik

| Farbe | Bedeutung |
|-------|-----------|
| **Grau** | Noch nicht gestartet |
| **Blau** | Aktiv / wartet |
| **Grün** | Erledigt / positiv |
| **Rot** | Problem / überfällig / abgelehnt |

**Pro Zeile/Screen:** max. **1 primärer Status** + optional **1 sekundärer Hinweis**.

### Badge-System (Ziel)

Eine Komponente `StatusBadge` mit semantischen Varianten — ersetzt Fragmentierung (`StatusBadge`, `AngebotEinfachStatusBadge`, `pos-v3-status-pill`, …).

---

## 11. Mobile

| Desktop | Mobile |
|---------|--------|
| Sidebar, 4 Bereiche | Bottom-Nav: Heute · Projekte · Kontakte · Mehr |
| Stammdaten eingeklappt | Optional Tab „Info“ nur wenn nötig |
| Tabelle | Karten: Projekt, Kunde, Status, Fortschritt |
| Modal | Bottom-Sheet |
| Hover / `⋯` | FAB, Action-Sheet |

**Pflicht:**

- Gleiche Tab-**Namen** und -**IDs** wie Desktop
- Gleiche **Hauptaktion**
- Touch-Targets min. **44×44 px**
- **Keine** weißen Detail-Screens (Render-/Error-Bugs zuerst beheben)

**Nicht in Phase 1:** Swipe zwischen Tabs, Bottom-Nav auf 5+ Items umbauen.

---

## 12. Kontakte & Finanzen

### Kontakte

Drei Unter-Tabs: **Kunden** · **Handwerker** · **Partner**

Listenzeile: Name · Ort · Letztes Projekt · Status (bei HW: Compliance-Kurzinfo)

**Kunden-Detail = Hub:**

| Tab / Bereich | Inhalt |
|---------------|--------|
| Stammdaten | Kontakt, Objekte |
| **Projekte** | Alle Anfragen, Angebote, Aufträge in einer Timeline |
| Kommunikation | Mails, Notizen |

### Finanzen

| Element | Spezifikation |
|---------|---------------|
| Liste | Nr. · Projekt · Kunde · Betrag · **Fälligkeit** · Status |
| Überfällig | Roter Rand / amber Hintergrund — nicht nur kleines Badge |
| Detail-CTA | „Als bezahlt markieren“ bei Status Gesendet |
| Neuer Einstieg | Modal „Auftrag wählen“ — kein leerer Wizard-Screen |
| Doppelroute | `/auftraege/[id]/finanzen` und Tab Finanzen → **ein** Einstieg |

---

## 13. CRM ↔ Partner-Portal

Eine Journey, zwei Oberflächen:

```
CRM:      Zuweisen → Senden → Freigeben → Vertrag/Compliance
              ↓         ↓         ↓
Portal:   Anfrage → Preis einreichen → Bestätigung → Dokumente
```

| CRM | Portal |
|-----|--------|
| Tab Positionen | Anfragen |
| Dokumente (intern) | HW-Uploads (Angebot, Rechnung) |
| Compliance-Tab / Abschnitt | Compliance-Bereich |

HW-Dokumente aus Portal erscheinen in **Auftrag → Dokumente** (intern, nicht kundenfreigegeben).

---

## 14. Leere Zustände

| Situation | Muster |
|-----------|--------|
| Keine Anfragen | Illustration + „Erste Anfrage anlegen“ |
| Keine Schritte heute | „Alles erledigt für heute“ |
| Kein Handwerker | Inline in Zeile + CTA |
| Keine Dokumente | Upload-Zone sofort sichtbar |
| Filter 0 Treffer | „Keine Treffer — Filter zurücksetzen“ |
| Chip mit Count 0 | Chip **ausblenden** (nicht „Abgelehnt 0“) |

Katalog Empty / Error / Loading als Pattern Library (Fundament §13).

---

## 15. Visuelle Sprache

| Token / Element | Regel |
|-----------------|-------|
| `bw-primary` `#2E7D52` | Primär-Aktionen, Links |
| `bw-dark` `#1A3D2B` | Sidebar |
| `bw-accent` `#C4922A` | FAB, seltene Akzente |
| Body | 14px, eine klare Type-Scale (12 / 14 / 16 / 18) |
| Buttons | Max. 1× primary pro Viewport |
| Icons | Lucide only — **keine** Emoji-Tabs |
| Zahlen | `tabular-nums`, rechtsbündig in Tabellen |
| PDF-Icon | Rot `#c62828` (bestehende Konvention) |

**Figma ↔ Code:** Design Tokens dokumentieren (Spacing, Radius, Shadow) — Fundament Phase D.

---

## 16. Bewusst weggelassen

| Nicht | Warum |
|-------|-------|
| Kanban als Standard | Bau-CRM = Listen + Fortschritt |
| Marge im Auftrags-Kopf | Verunsichert PL |
| 7+ Tabs pro Auftrag | Kognitive Last |
| KPI-Trends auf Heute | Irrelevant für Tagesarbeit |
| Eigene Pages für Kurzaktionen | Modals + Redirect |
| Drei Preis-Menüs in Einstellungen | Eines: „Preise & Listen“ |
| Neues Nummernformat ohne Migration | Breaking Change (PDF, Mail, Backoffice) |
| Globale Suche / Kunden-Hub 2.0 | Nach Fundament (Welle 4+) |

---

## 17. Umsetzungswellen

```
Welle 1 — VERTRAUEN (≈2 Wochen)
  · Mobile Detail zuverlässig rendern (Root-Cause, Error Boundary)
  · Status-Matrix definieren + Badge-Konsolidierung starten
  · Filter-Chip-Counts = tatsächliche Liste

Welle 2 — MUSTER (≈3 Wochen)
  · Detail-Pattern §4 auf Anfrage, Angebot, Auftrag
  · Projekt-Kette überall
  · Eingeklappte Stammdaten, ein Primär-CTA
  · Desktop = Mobile Tab-Namen

Welle 3 — FÜHRUNG (≈3 Wochen)
  · Dashboard „Heute“
  · Projekte-Liste mit Pipeline-Chips
  · HW Mini-Pipeline in Positionen v3
  · Tab „Angebote (n)“ auf Anfrage

Welle 4 — POLISH (≈2 Wochen)
  · Copy, relative Daten, leere Zustände
  · Modals: Neue Anfrage, Neue Rechnung
  · Finanzen: Fälligkeit, „Als bezahlt markieren“
  · Legacy-UI visuell entfernen (v2, Accordion)

Danach: Globale Suche, Kunden-Hub, optional Kanban
```

### Mapping zu Fundament Phase D–F

| Fundament | Dieses Konzept |
|-----------|----------------|
| Phase D — Status, Tokens, Detail-Pattern | Welle 1–2 |
| Phase E — Positionen v3, Angebot, HW-Journey | Welle 3 |
| Phase F — Legacy, Einstellungen-IA, A11y | Welle 4 |

---

## 18. Erfolgskriterien

Onboarding-Test mit neuem Mitarbeiter **ohne Schulung**:

| Frage | Ziel |
|-------|------|
| „Wo siehst du, was heute dran ist?“ | **Heute** in < 5 Sek |
| „Wo ist Projekt Koch?“ | **Projekte** + Suche in < 10 Sek |
| „Was ist der nächste Schritt?“ | Grüner Button oder Tab **Nächste Schritte** |
| „Wo sendest du den Handwerker?“ | **Auftrag → Positionen** in < 15 Sek |
| „Wie viele Status pro Zeile?“ | **Einer** |

---

## 19. Abgleich: Claude Spec & Mockup

Externe Audits (Claude Design Audit v2, User-Flow-Spec, HTML-Mockup) gegen Fundament und dieses Konzept.

### Legende

| Status | Bedeutung |
|--------|-----------|
| **Gültig** | Problem bestätigt — in Konzept aufgenommen |
| **Veraltet** | Ist-Beschreibung falsch oder Fix existiert |
| **Neu** | Wertvolle Ergänzung, im Konzept verankert |
| **Konflikt** | Nicht übernehmen |

### Meta-Abgleich

| Thema | Status | Entscheidung |
|-------|--------|--------------|
| UI spiegelt DB | Gültig | → §1, Pipeline §6 |
| Fundament vor Features | Gültig | → §17 Wellen 1–2 vor Features |
| Detail-Pattern vereinheitlichen | Gültig | → §4 |
| Mobile gleiche IA | Gültig | → §11 |
| Claude Woche-1 = Copy-Mix | Konflikt | Wellen-Reihenfolge §17 |
| Emoji Tab-Icons | Konflikt | §15 Lucide only |
| Bottom-Nav + Swipe in Prio 0 | Konflikt | §11 — nach Bugfix |

### Claude Spec — streichen (veraltet)

| Punkt | Grund |
|-------|-------|
| Wizard Schritt 3 „Handwerker“ | Bereits: Leistungen → Finalisieren → Versand |
| Tab „Leistungen fehlt“ im Auftrag | Existiert als „Positionen“ (`leistung`) |
| ProjektKette fehlt (Auftrag) | `ProjektKette` eingebunden — überall erzwingen |
| `/anfragen/neu` leeres Panel | Redirect `?neu=1` + Modal |
| `anzeigename` für Dashboard-Name | Feld ist `user_profiles.name` |
| „3 errors“ Badge | Dev-Overlay, kein Produkt |
| AN-2026-025 Nummernformat | Breaking Change — eigene Entscheidung |

### Claude Spec — übernehmen (gültig/neu)

| Punkt | Im Konzept |
|-------|------------|
| Dashboard = Cockpit, keine KPI-Trends oben | §5 |
| Stammdaten nicht above-the-fold | §4 |
| Tab „Angebote (n)“ auf Anfrage | §7.1 |
| Primär-CTA kontextabhängig | §7.3 |
| Relative Gültigkeit / Fälligkeit | §7.2, §12 |
| „Als bezahlt markieren“ | §12 |
| Leere Widgets ausblenden | §5, §14 |
| Filter-Chips mit 0 ausblenden | §6, §14 |
| Mobile weiße Screens P0 | §11, Welle 1 |

### HTML-Mockup (Claude Design) — Bewertung

| Mockup-Element | Übernehmen? | Anmerkung |
|----------------|-------------|-----------|
| Listen: Nr., Projekt+Ort, Fortschritt, Lieferdatum | ✅ | §6 |
| Auftrag 4 Tabs (Positionen, Timeline, Dokumente, Rechnungen) | ✅ angepasst | + Nächste Schritte, Finanzen statt Rechnungen-Tab allein |
| Default Tab Positionen (Auftrag) | ✅ | §7.3 |
| Kopf: Wert groß, Rechnung, Kunden-Link | ✅ | §4, §7.3 |
| HW-Pipeline inline | ✅ | §8 |
| Angebot: Status-Stufen links | ✅ | §7.2 |
| Anfrage: Tab Angebote | ✅ | §7.1 |
| Dashboard mit KPI +18 % | ❌ | Widerspricht Spec & §5 |
| SPA ohne Deep-Links | ❌ | Next.js-Routen behalten |
| Rechnungen vor Aufträge in NAV | ❌ | §2 |
| Compliance/Baustelle fehlen | ❌ | Als Abschnitte, §7.3 |
| Kanban (im Code entfernt) | ❌ | §16 |

### Zusammengeführte Priorität (Audit + Konzept)

```
A  Mobile rendern + Filter-Vertrauen
B  Status-Matrix + ein Badge-System
C  Detail-Pattern (§4) — alle Entitäten
D  Heute + Projekte-Pipeline
E  Positionen v3 + HW-Pipeline
F  Copy, Modals, Finanzen-Polish
G  Neue Features (Suche, Hub)
```

---

## 20. Zusammenfassung

```
                    ┌─────────────┐
                    │    HEUTE    │  ← Morgen-Check, deine Schritte
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  PROJEKTE   │  ← Eine Pipeline, ein Ort
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         Anfrage       Angebot       Auftrag
              │            │            │
              └────────────┴────────────┘
                           │
              Gleiches Layout überall:
              Kopf · Kette · 1 CTA · Tabs (max. 5)
                           │
              Positionen = tägliche Arbeit (PL)
              Nächste Schritte = Führung (Vertrieb)
              Dokumente = alles an einem Ort
```

**Weniger Module. Ein Muster. Ein Status. Ein nächster Schritt.**

Die Datenbank bleibt — die Oberfläche erzählt die Geschichte, die Nutzer ohnehin im Kopf haben.

---

*Bei Ist-Stand, Code-Pfaden und Modul-Audit: [DESIGN_AUDIT_CRM_FUNDAMENT.md](./DESIGN_AUDIT_CRM_FUNDAMENT.md)*
