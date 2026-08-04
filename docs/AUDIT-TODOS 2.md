# Audit-Todos — Masterliste (Kapitelweise)

**Stand:** 2026-07-27 (nach Runde 4: offene Restpunkte)  
**Quellen:** [CRM-ALLTAG-AUDIT.md](./CRM-ALLTAG-AUDIT.md) · [DESIGN_AUDIT_CRM_FUNDAMENT.md](./DESIGN_AUDIT_CRM_FUNDAMENT.md) · [UMSETZUNGSPLAN-SURFACE.md](./UMSETZUNGSPLAN-SURFACE.md) · [UMSETZUNGSPLAN-VEREINHEITLICHUNG.md](./UMSETZUNGSPLAN-VEREINHEITLICHUNG.md) · [FLOW-KATALOG.md](./FLOW-KATALOG.md) · [DESIGN-KURZSPEC-DESKTOP-MOBILE.md](./DESIGN-KURZSPEC-DESKTOP-MOBILE.md) · [EPICS-BACKLOG.md](./EPICS-BACKLOG.md) · [ENTSCHEIDUNGSLOG.md](./ENTSCHEIDUNGSLOG.md)  
**Aktiver Plan:** Audit-Wellen **Kern ✅** · Bulk/Merge/Polish ✅ · Geparkt: Board · Handoff/Bounce · Tab-Swipe.

Legende Status: **✅** done · **◐** teilweise / Slice · **○** offen / geparkt  
Aufwand: **S** klein · **M** mittel · **L** groß

---

## Kurz: erledigt vs. fehlt

### Erledigt (Runden 1–4)

| Bereich | IDs |
|---------|-----|
| Kette / Geld | **ZP-01** · **W1** · **#5** ✅ |
| Surface / Flows | **S-0…S-6** · **W10** · **W11** · **W8-03/05** ✅ |
| Abnahme / Vor-Ort | **W9** ✅ |
| Detail / Tabs | **W7** · **#3** · **W3-02** ✅ |
| Alltag / Änderung | **W2** · **W3** · **W5-01** ✅ · **W5-02** ◐ Hover |
| Copy / Suche / Nav | **W6-01…06/08/10** ✅ · **W6-07** ◐ light |
| Chrome | **W4** · **W8-01/02/04** ✅ |
| Epics | **W6-09** ◐ Baustopp + Mail-Stub · Rest geparkt |

### Bewusst geparkt (kein offener Kern-Audit)

| ID | Was |
|----|-----|
| **W5-02** Board | Kanban — [ENTSCHEIDUNGSLOG](./ENTSCHEIDUNGSLOG.md) |
| **W6-07** | Tab-Swipe nur geparkt; Sheet-Swipe ✅ |
| **W6-09** Rest | Bounce · Handoff — [EPICS-BACKLOG](./EPICS-BACKLOG.md) |
| Design-Tracks | Tokens/Figma · Finanzen-IA · KI-Hub (außerhalb Wellen-Kern) |
| **AuftragDokumentationPanel** | Overlap, nicht verdrahtet |

---

## Welle 0 · Erledigt

| ID | Status | To-do |
|----|--------|-------|
| DONE-01 | ✅ | Abschlagsplan: Validation Summe ≤ VK / ≤100 % |

---

## Welle 1 · Kette freischalten (kritisch)

| ID | Impact | Aufwand | Status | To-do |
|----|--------|---------|--------|-------|
| **ZP-01** | kritisch | M | ✅ | Hard-Gate + softWarn UI (Zahlplan + RE-Wizard) |
| **W1-01** | kritisch | M | ✅ | Angebot: Primary **Senden** / Banner angleichen |
| **W1-02** | kritisch | M | ✅ | Partner-CTA + Section „Partner“ am Angebot |
| **W1-03** | kritisch | S | ✅ | UI Angebot ablehnen (+ Grund) |
| **W1-04** | kritisch | S | ✅ | Auftrag stornieren im UI |

---

## Welle 2 · Alltag nach Versand

| ID | Impact | Aufwand | Status | To-do |
|----|--------|---------|--------|-------|
| **W2-01** | hoch | M | ✅ | My Work / „Mein Tag“ am Dashboard + Count-Badges |
| **W2-02** | hoch | M | ✅ | Zone „Warten auf Kunde“ (gesendete Angebote) getrennt von Mein Tag |
| **W2-03** | hoch | S | ✅ | `lifecycle=` Links · Back-Labels; Feinschliff ok |

---

## Welle 3 · Orientierung & Geld

| ID | Impact | Aufwand | Status | To-do |
|----|--------|---------|--------|-------|
| **W3-01** | hoch | M | ✅ | Kunde-Vorgänge-Tab + Duplikat-Gate |
| **W3-02** | hoch | S | ✅ | Tabs Aktivität / Projektphasen + Empty-Hinweise |
| **W3-03** | mittel | S | ✅ | Zahlplan „Nochmal senden“ · Wiederkehrend · Warte auf Hausverwaltung |

---

## Welle 4 · Mobile Chrome

| ID | Impact | Aufwand | Status | To-do |
|----|--------|---------|--------|-------|
| **W4-01** | hoch | M | ✅ | DetailActionsBar + Listen-⋯ / Listbar mobil → ActionSheet |
| **W4-02** | mittel | S | ✅ | Eine Partner-Kachel · Listen-Filter mobil Sheet |

---

## Welle 5 · Änderung & Polish

| ID | Impact | Aufwand | Status | To-do |
|----|--------|---------|--------|-------|
| **W5-01** | mittel | M | ✅ | Nachtrag-CTA · No-Show-Hinweis · Gutschrift/Korrigieren-Hilfe |
| **W5-02** | niedrig | L | ◐ | Desktop Hover-Actions ✅ · Board geparkt (s. [ENTSCHEIDUNGSLOG](./ENTSCHEIDUNGSLOG.md)) |

---

## Welle 6 · Copy, Shell, Backlog

| ID | Impact | Aufwand | Status | To-do |
|----|--------|---------|--------|-------|
| **W6-01** | mittel | S | ✅ | Resolver sichtbar → kein doppeltes NaechsterSchritt-Banner |
| **W6-02** | mittel | S | ✅ | Tabs „Kunde & Objekt“ / „Positionen“ |
| **W6-03** | niedrig | S | ✅ | Als Kunde öffnen · KI · Notizen/Fotos-Empty (light) |
| **W6-04** | niedrig | S | ✅ | Ohne-Ersatz-Hilfe; RE-Labels bereits W7-05 |
| **W6-05** | mittel | M | ✅ | RE-Badge via `rechnungStatusDisplay` · Inline „Gesendet“ + Datum |
| **W6-06** | mittel | M | ✅ | Touch-Rows ≥44px · Breakpoint SoT (W8-01) |
| **W6-07** | niedrig | M | ✅ | A11y · Empty · Optimistic Bulk-Delete · Swipe-dismiss Sheets (Tab-Swipe geparkt) |
| **W6-08** | mittel | M | ✅ | Suche um Angebote/Rechnungen erweitern (`/api/crm/suche`) |
| **W6-09** | mittel | L | ✅ | Bulk ✅ · Voll-Merge ✅ · Baustopp ✅ · Mail Stub ◐ · Handoff/Bounce ○ — [EPICS-BACKLOG](./EPICS-BACKLOG.md) |
| **W6-10** | niedrig | S | ✅ | Kunden als 4. BottomNav-Slot; Mehr ohne Doppel-Kachel |

---

## Welle 7 · Detail-Orientierung

| ID | Impact | Aufwand | Status | To-do |
|----|--------|---------|--------|-------|
| **W7-01** | kritisch | M | ✅ | Phasen-Strip (`ProjektKette`) im Detail-Kopf |
| **W7-02** | hoch | M | ✅ | Primary + Default-Tab aus Status (`abnahme`→Vor Ort, Zahlung offen→Zahlung) |
| **W7-03** | hoch | S | ✅ | Tab-Labels Aktivität / Projektphasen via SoT; Verlauf-Card angeglichen |
| **W7-04** | mittel | M | ✅ | 5 Kern-Tabs Spec-Labels + Mehr |
| **W7-05** | mittel | S | ✅ | RE-Wizard: Rechnungsdetails · Anlagen & Versand |
| **W7-06** | mittel | M | ✅ | Tab-SoT Auftrag + Angebot + Rechnung (+ Anfrage Labels) |
| **W7-07** | hoch | M | ✅ | Cards verdrahtet; DetailKopf/ProjektSteuerung gelöscht |

---

## Welle 8 · Design-System & Flow-Einheit

| ID | Impact | Aufwand | Status | To-do |
|----|--------|---------|--------|-------|
| **W8-01** | kritisch | M | ✅ | SoT ≤767 mobil / ≥768 Desktop (CSS + Hook + TopBar + AppDetail) |
| **W8-02** | hoch | M | ✅ | Interaktions-Kit: EditorSheet · DocumentCanvas · PickerSheet · ActionSheet |
| **W8-03** | hoch | L | ✅ | Flow-Katalog: [FLOW-KATALOG.md](./FLOW-KATALOG.md) |
| **W8-04** | mittel | M | ✅ | Mobile Detail-IA 5+Mehr + Spec-Labels (#3) |
| **W8-05** | mittel | S | ✅ | Desktop ≠ Mobile Jobs → [DESIGN-KURZSPEC-DESKTOP-MOBILE.md](./DESIGN-KURZSPEC-DESKTOP-MOBILE.md) |

---

## Welle 9 · Abnahme / Vor-Ort UX

| ID | Impact | Aufwand | Status | To-do |
|----|--------|---------|--------|-------|
| **W9-01** | kritisch | M | ✅ | Ein Pfad CreateWizard; Inline/FillFlow gelöscht (P5.1) |
| **W9-02** | kritisch | M | ✅ | DocumentCanvas · 3 Phasen Inhalt\|Prüfen\|Fertig (Scroll je Phase) |
| **W9-03** | hoch | M | ✅ | Vor-Ort Segmented: Abnahme \| Tagebuch \| Abschluss |
| **W9-04** | hoch | S | ✅ | Große Segmented-Controls OK/Mangel/Offen + Ergebnis |
| **W9-05** | mittel | S | ✅ | PDF-Vorschau vor Finalisieren (`downloadAbnahmeprotokollPdf`) |
| **W9-06** | mittel | S | ✅ | Bei Status `abnahme`: Primary = Abnahme |

---

## Welle 10 · Wizard → Canvas (früher WizardShell)

Soll-Modell ist **DocumentCanvas** (nicht mehr WizardShell).

| ID | Impact | Aufwand | Status | To-do |
|----|--------|---------|--------|-------|
| **W10-01** | hoch | M | ✅ | ProjektvertragWizard → DocumentCanvas |
| **W10-02** | mittel | M | ✅ | RahmenvertragWizard → DocumentCanvas |
| **W10-03** | niedrig | S | ✅ | Staff-Funnel → DocumentCanvas (≤3 Phasen-Chips) |

---

## Welle 11 · Flow / Create / Wizard SoTA

**Surface-Plan:** [UMSETZUNGSPLAN-SURFACE.md](./UMSETZUNGSPLAN-SURFACE.md) · Smoke: [SURFACE-ABNAHME-NUTZER.md](./SURFACE-ABNAHME-NUTZER.md)

| ID | Impact | Aufwand | Status | To-do |
|----|--------|---------|--------|-------|
| **W11-01** | kritisch | M | ✅ | Create-Einstiege → Canvas/Sheet (S-3 / `/neu`-Host) |
| **W11-02** | kritisch | M | ✅ | Kern-Picker mobil Bottom Sheet (PickerSheet) |
| **W11-03** | kritisch | M | ✅ | AG/RE: Chips frei; Weiter ohne Hard-Gate; Validierung Senden/Erstellen |
| **W11-04** | hoch | M | ✅ | Desktop: Canvas; EditorSheet Detail=Slide / Canvas=Center |
| **W11-05** | hoch | M | ✅ | Shared Kit: EditorSheet, PickerSheet, DocActionBar, … |
| **S-0** | kritisch | S | ✅ | Doku-Fixes 0.1–0.16 |
| **S-1** | kritisch | L | ✅ | Fundament EditorSheet S7–S10 |
| **S-2** | kritisch | L | ✅ | Modal→EditorSheet Migration (Kern + Admin P5.5) |
| **S-3** | kritisch | L | ✅ | DocumentCanvas AG/RE/Abnahme |
| **S-4** | hoch | M | ✅ | Detail Header/⋯/Drill-Down |
| **S-5** | hoch | M | ✅ | Copy-Soll Kern (Runden 2–3) |
| **S-6** | mittel | S | ✅ | Aufräumen (FillFlow/Inline u. a.) |

---

## Produktentscheidungen (2026-07-27)

| # | Beschluss | Status | Wirkt auf |
|---|-----------|--------|-----------|
| **#3** | 5 Kern-Tabs mobil: Übersicht · Leistungen · Zahlung · Vor Ort · Aktivität + Mehr | ✅ | W7-04, W8-04 |
| **#5** | Auftrag fertig = **abgeschlossen**; Badge „Zahlung offen“; My Work „RE überfällig“ | ✅ | W2-01, W7-02 |
| #14 / #15 | Geparkt / beschlossen — blockieren nichts | — | — |

---

## Design-Fundament (Überblick)

| Prio | Thema | Deckt | Status |
|------|-------|--------|--------|
| P0 | Status-Matrix + Badge | W6-05, W7-02 | ✅ |
| P0 | Auftrag Positionen polish | Positions-UI | laufend |
| P0 | Abnahme / Vor-Ort | **W9** | ✅ |
| P1 | Detail-Tabs Desktop = Mobile | W7-03/06, W8-04 | ✅ |
| P1 | Wizard → Canvas / Sheets | **W11**, W9-02, W10 | ✅ Kern |
| P1 | Design Tokens / Figma | Design-Track | ○ |
| P2 | Finanzen / Einstellungen / Partner-Map | eigene Tracks | ○ |
| P3 | Formulare-Builder / KI Hub | später | ○ |

---

## Empfohlene nächste Abarbeitung

1. Optional: **Mail→Anfrage** echt (IMAP) · **Handoff** · **Bounce**  
2. Board nur wenn explizit gewünscht  
3. Design-Tokens / Figma (Design-Track)


Vollständige Historie: [ENTSCHEIDUNGSLOG.md](./ENTSCHEIDUNGSLOG.md) · Plan: [UMSETZUNGSPLAN-VEREINHEITLICHUNG.md](./UMSETZUNGSPLAN-VEREINHEITLICHUNG.md)
