# CRM Umsetzungsplan — Außen → Innen

**Quelle:** `docs/CRM-ALLTAG-AUDIT.md`  
**Nordstern:** Desktop = Büro-CRM · Mobile = App (gesamter Nutzungsumfang).

**Pflichtformat für jedes To-do (immer):**

| Spalte | Inhalt |
|--------|--------|
| **Markt** | Praxisbeispiel: wie HubSpot / Pipedrive / Salesforce Mobile / typische Field-Service-Apps das lösen |
| **Wir heute** | IST bei uns (Code/UX) |
| **Wir wollen** | SOLL-Verhalten |
| **Vergleich** | Eine Zeile: Abstand Markt ↔ heute → was sich ändern muss |
| **FE / BE** | Technische Umsetzung |
| **Abnahme** | Prüfkriterium Desktop + Mobile |

---

## Nordstern (kurz)

Eine Codebase, **zwei Nutzungsmodi**: Desktop wie CRM, Mobile wie App — Job-Parität, keine Pixel-Kopie. Details: siehe frühere Nordstern-Tabelle im Audit / unten in den To-dos.

---

## Block-Reihenfolge

| Block | Fokus | IDs |
|-------|-------|-----|
| A | Fundament | W8-01, W8-05 |
| B | Shell / Kit | W4-01, W4-02, W8-02 |
| **B2** | **Flow / Create / Wizard SoTA (Sheets)** | **W11-01…05**, W10, W9-02/04 |
| C | Detail-Rahmen | W7-01, W7-03, W3-02, W7-02 |
| D | Angebot | W1-01, W1-02, W1-03 |
| E | Geld | ZP-01, W3-03 · **#5 beschlossen:** Auftrag fertig ≠ bezahlt |
| F | Auftrag | W1-04, W7-07, W5-01, W7-04 · **#3:** 5 Kern-Tabs |
| G | Arbeitstag | W2-01, W2-02, W2-03 |
| H | Wiederfinden | W3-01, W6-08 |
| I | Flows / Copy | W8-03, W8-04, W6-01, W7-05, W7-06, W6-02, W6-04 |
| J | Optional | W5-02, W6-05…W6-10, W6-09 |

**Produktentscheidungen (2026-07-27):** siehe `ENTSCHEIDUNGSLOG.md` — **#3** (5 Kern-Tabs inkl. Vor Ort), **#5** (Auftrag erledigt = abgeschlossen, Badge Zahlung offen). **PR C** startklar sobald #11/#12 + Tab-SoT (#7/13, inkl. #3) stehen.

---

# Block A — Fundament

## W8-01 — Ein Breakpoint überall

| | |
|--|--|
| **Markt** | Ein Cutoff (oft ~768): darunter App-Chrome, darüber Desktop-CRM. Keine „halbe Zone“. |
| **Wir heute** | CSS Shell oft **760**, JS/`md` **767** → Lücke 761–767. |
| **Wir wollen** | Ein Token **768** (`MOBILE_MAX=767`) in CSS + Hook + Tailwind. |
| **Vergleich** | Markt = eine Regel; wir = zwei Regeln → vereinheitlichen. |

**FE:** `breakpoints.ts`, `useIsMobile`, `mock-design-system.css` 760→767, Hardcodes. **BE:** —.  
**Abnahme:** Bei 765 vs 770 erscheinen BottomNav und Detail-Bar **gemeinsam** an/aus.

## W8-05 — Desktop≠Mobile Jobs spezifizieren

| | |
|--|--|
| **Markt** | Mobile-Apps weglassen Reporting/dichte Tabellen; Desktop behält Power-Features. |
| **Wir heute** | Implizit Desktop-First; Spec fehlt. |
| **Wir wollen** | Eine Seite `DESIGN-MOBILE-DESKTOP.md`: Field vs. Office. |
| **Vergleich** | Markt hat klare Rollen; wir entscheiden ad hoc → Spec als SoT. |

**FE:** Doc. **BE:** —.  
**Abnahme:** Spec reviewt; jedes spätere PR nennt „Desktop-Job / Mobile-Job“.

**Danach Block A:** Kein Breakpoint-Glitch; Zielbild schriftlich.

---

# Block B — Shell & Interaktions-Kit

## W4-01 — Eine Action-Bar; Listen-⋯ Sheet

| | |
|--|--|
| **Markt** | Record öffnen → Tabbar weg oder nur Back; **eine** sticky Primary. Listen-⋯ = Bottom-Sheet. |
| **Wir heute** | BottomNav **+** DetailActionsBar; Listen-⋯ = **Popover**. |
| **Wir wollen** | Detail: eine Leiste; Listen mobil: ActionSheet. |
| **Vergleich** | Markt = App-Chrome; wir = Desktop-Fuß + Desktop-Menü auf dem Phone. |

**FE:** Detail-Flag → BottomNav hide; `MockEntityRowMenu` → Sheet mobil. **BE:** —.  
**Abnahme Desktop:** Kopf-Actions wie CRM. **Mobile:** eine Leiste; ⋯ von unten.

## W4-02 — Mehr: ein Partner; Filter-Sheet

| | |
|--|--|
| **Markt** | „More“ = klare Kacheln; Filter mobil = Fullscreen/Sheet. |
| **Wir heute** | Partner **und** Netzwerk; Filter gemischt. |
| **Wir wollen** | Eine Partner-Kachel; Filter immer Sheet mobil. |
| **Vergleich** | Markt = ein Konzept; wir = zwei Nav-Namen + inkonsistente Filter. |

**FE:** `MEHR_TILE_NAV`; Filter nur Sheet. **BE:** optional Redirect `/partner`.  
**Abnahme:** Mehr ohne Doppel; Filter-Sheet auf Vorgängen mobil.

## W8-02 — Interaktions-Kit durchziehen

| | |
|--|--|
| **Markt** | Ein Pattern-Kit: Sheet / Modal / Toast überall gleich. |
| **Wir heute** | Sheet nur Detail; Listen Popover; Filter teils Popover. |
| **Wir wollen** | Regel: mobil Sheet für ⋯+Filter; Modal→Sheet ≤767. |
| **Vergleich** | Markt lernt 1×; wir lernen pro Screen. |

**FE:** Kit-Doc + alle Listen/Filter. **BE:** —.  
**Abnahme:** Stichprobe 5 Screens — gleiches Menü-/Filter-Verhalten.

**Danach Block B:** Mobile = App-Chrome; Desktop unverändert CRM-artig.

---

# Block B2 — Flow / Create / Wizard SoTA (Sheets)

> **PO (2026-07-27):** Es reicht nicht, nur Shells zu migrieren. **Nutzung** von Wizards, Erstellungen und Alltags-Flows muss sich ändern: Bottom Sheets, app-artige Komponenten, State of the Art — mobil wie iOS Settings/Field-App, desktop klar und leicht.
>
> **Lexware-Soll (2026-07-27):** Angebot/RE = **DocumentCanvas** (eine Scroll-Seite) + Sheets für Kunde/Position/Anlegen — [WIZARD-LEXWARE-KONZEPT.md](./WIZARD-LEXWARE-KONZEPT.md). Stepper-„Weiter“ nur noch wo Phasen nötig.

## W11-01 — Create-Einstiege (Neu …)

| | |
|--|--|
| **Markt** | Lexware / Field-Apps: „Neu“ öffnet Dokument-Canvas oder Sheet-Stack; ein Job, große Targets. |
| **Wir heute** | Gemischt: Routes, Modals, Funnel, teils Desktop-Formulare auf dem Phone. |
| **Wir wollen** | Jeder Create-Flow startet in **einer** App-Shell (`DocumentCanvas` / `WizardShell`). |
| **Vergleich** | Markt = App-Create; wir = Desktop-Form in Mobile-Viewport. |

**FE:** Einstiege auf Shell/Canvas vereinheitlichen; FAB → gleicher Flow. **BE:** —.  
**Abnahme Mobile:** Neu → Canvas/Shell; Desktop: gleicher Flow.

## W11-02 — Aktionen als Bottom Sheet

| | |
|--|--|
| **Markt** | Versenden / Ablehnen / Status / Partner = Action Sheet; Kunde/Artikel = Picker-Sheet. |
| **Wir heute** | Desktop-Menüs, Modals, teils tote Anker. |
| **Wir wollen** | Kern-Aktionen + Picker mobil immer Sheet; Desktop Modal oder Slide-over — gleiche Steps. |
| **Vergleich** | Markt lernt 1 Pattern; wir pro Entity anders. |

**FE:** Shared `FlowActionSheet` + `PickerSheet`; W1/W8-03 anbinden. **BE:** bestehende Actions.  
**Abnahme:** Stichprobe Versenden + Ablehnen + Status mobil = Sheet.

## W11-03 — DocumentCanvas: Picker & Meta per Sheet

| | |
|--|--|
| **Markt** | Lexware: eine Dokument-Seite; Kunde/Position tippen → Sheet (wählen oder `+` Neu). |
| **Wir heute** | Angebot/RE Stepper + teils `MobileEditableBlock`; Abnahme angeglichen. |
| **Wir wollen** | AG/RE als **DocumentCanvas**; Kunde & Positionen = Picker-Sheet (+ Nested Anlegen); Meta = Overview→Sheet. |
| **Vergleich** | Markt = Dokument bearbeiten; wir = durch Steps klicken. |

**FE:** `DocumentCanvas` + DashedAdd; Vertrag/Funnel angleichen. **BE:** —.  
**Abnahme:** Kein Step nur „lange Formularliste“ mobil ohne Overview/Sheet.

## W11-04 — Desktop Create: gleiche mentale Modelle

| | |
|--|--|
| **Markt** | Gleiches Dokument; Sheets → Modal/Slide-over; kein Fake-Bottom-Sheet. |
| **Wir heute** | Desktop oft besser; trotzdem uneven (AppFlow vs WizardShell). |
| **Wir wollen** | Gleicher Canvas/Jobs wie Mobile; Darstellung = Cards + Modal/Slide-over. |
| **Vergleich** | Parität der Jobs, nicht der Pixel. |

**FE:** `WIZARD-LEXWARE-KONZEPT` + `WIZARD-UI-MUSTER` als Gate. **BE:** —.  
**Abnahme:** Angebot/RE/Abnahme Desktop = Canvas + Modal-Picker + eine Primary (✓ Speichern).

## W11-05 — Shared Flow-Kit (Komponenten)

| | |
|--|--|
| **Markt** | Design-System: SheetHeader, DashedAdd, DocActionBar, OverviewRow. |
| **Wir heute** | Pieces verstreut (`MobileEditSheet`, MockBtn, eigene Header). |
| **Wir wollen** | Kit: `DashedAddCard`, `PickerSheet`, `DocActionBar`, `FlowOverviewRow`, `FlowStickyFooter`. |
| **Vergleich** | SoTA = wiederverwendbare Bausteine; wir kopieren Markup. |

**FE:** `components/flow/` oder unter `layout/app` + Doc. **BE:** —.  
**Abnahme:** Neue Flows importieren nur Kit-Bausteine.

**Danach Block B2:** Create und Wizards fühlen sich wie eine App an — nicht wie portierte Desktop-Formulare.

---

# Block C — Detail-Orientierung

## W7-01 — Phasen-Strip im Kopf

| | |
|--|--|
| **Markt** | Deal/Opportunity zeigt Stage-Pfad (Lead→…→Won) dauerhaft. |
| **Wir heute** | Strip entfernt; nur Tab „Historie“. |
| **Wir wollen** | Strip Anfrage·Angebot·Auftrag·Rechnung mit Links. |
| **Vergleich** | Markt = Orientierung sofort; wir = versteckt. |

**FE:** `ProjektKette` in `EntityDetailLayout`. **BE:** —.  
**Abnahme:** Strip auf AN/AG/AU/RE; Klick wechselt Phase.

## W7-03 / W3-02 — Aktivität / Projektphasen + Empty

| | |
|--|--|
| **Markt** | „Activity“ vs. „Related / Stages“ klar getrennt. |
| **Wir heute** | „Verlauf“ + „Historie“; Empty nach RE ohne Erklärung. |
| **Wir wollen** | Aktivität / Projektphasen; Empty „aktuell unter RE-…“. |
| **Vergleich** | Markt = zwei klare Wörter; wir = zwei „Geschichten“. |

**FE:** Labels + Empty-Copy. **BE:** —.  
**Abnahme:** Rename sichtbar; Auftrag-Empty nach Phasenwechsel mit Link.

## W7-02 — Status→Tab→Primary-Matrix

| | |
|--|--|
| **Markt** | Primary = nächster Deal-Schritt (Call / Send / Mark won) je Stage. |
| **Wir heute** | Angebot oft Annehmen; Auftrag immer Rechnung; RE→Stammdaten. |
| **Wir wollen** | Matrix Status→defaultTab→primary→banner. |
| **Vergleich** | Markt führt; wir zeigen oft den falschen CTA. |

**FE:** `detail-primary.ts` + Detail-Clients. **BE:** —.  
**Abnahme:** Entwurf→Senden; Auftrag ohne Partner→nicht blind RE; RE gesendet→nicht Stammdaten-first.

**Danach Block C:** Pipeline sichtbar; CTA stimmt.

---

# Block D — Angebot-Kette

## W1-01 — Erstversand + Primary/Banner

| | |
|--|--|
| **Markt** | Quote draft: Primary **Send**; Accept erst nach Send/Call. |
| **Wir heute** | Versand am Detail tot; Primary Annehmen; Banner widerspricht. |
| **Wir wollen** | Primary „An Kunden senden“ → Modal; danach Annehmen. |
| **Vergleich** | Markt = Senden first; wir = Annehmen first. |

**FE:** `setKundeVersandOpen`, Versand-Section, Banner=Primary. **BE:** bestehende Mail-Actions.  
**Abnahme Desktop/Mobile:** Senden vom Detail ohne Wizard-Ende.

## W1-02 — Partner am Detail + Naming

| | |
|--|--|
| **Markt** | „Request vendor quote“ als klarer Step am Record. |
| **Wir heute** | Scroll zu totem Anker; Handwerker vs Partner. |
| **Wir wollen** | Partner-Block + Primary; überall „Partner“. |
| **Vergleich** | Markt = ein Wort + sichtbarer Block; wir = Bruch + Naming-Mix. |

**FE:** Section rendern; Labels. **BE:** bestehende Partner-Mail/Einreichung.  
**Abnahme:** Button startet Flow; keine „Handwerker“-Primary.

## W1-03 — Angebot ablehnen

| | |
|--|--|
| **Markt** | Mark as lost / Disqualified + Reason. |
| **Wir heute** | Status existiert, kein Button. |
| **Wir wollen** | Ablehnen + Grund → Erledigt + Timeline. |
| **Vergleich** | Markt schließt Pipeline; wir lassen „offen“ liegen. |

**FE:** Modal + Menü. **BE:** `setAngebotAbgelehnt`.  
**Abnahme:** Abgelehnt unter Erledigt; Grund sichtbar.

**Danach Block D:** Angebot wie CRM-Quote-Flow.

---

# Block E — Geld

## ZP-01 — Keine Doppelabrechnung

| | |
|--|--|
| **Markt** | Abschlag/Schluss: Rest = Vertrag − gestellt; Soft-Warnung bei Overbill. |
| **Wir heute** | Pauschal-Abschlag + Positions-Schluss kann **> VK**. |
| **Wir wollen** | Schluss = Restgeld und/oder Pflicht-Zuordnung; Gate Σ≤VK. |
| **Vergleich** | Markt schützt Geld; wir erlauben fachlichen Fehler. |

**FE:** Warnung UI. **BE:** `zahlungsplan.ts` + Validation beim Erstellen.  
**Abnahme:** 30 %+Schluss = Rest, nicht ~130 %.

## W3-03 — Rate: Resend / Korrigieren / Copy

| | |
|--|--|
| **Markt** | Payment schedule row: Resend / Void+reissue am Posten. |
| **Wir heute** | Resend oft tot; Korrigieren nur RE-Detail; Bestand/HV-Jargon. |
| **Wir wollen** | Row-Actions verdrahtet; klare Labels. |
| **Vergleich** | Markt handelt an der Rate; wir zwingen RE-Umweg. |

**FE:** Plan-Row-Menü. **BE:** Resend-Action; Korrektur bestehend.  
**Abnahme:** Resend sendet oder Punkt weg; Korrigieren von Rate aus.

**Danach Block E:** Geld wie ernsthaftes CRM-Billing.

---

# Block F — Auftrag

## W1-04 — Auftrag stornieren

| | |
|--|--|
| **Markt** | Cancel job + reason; bleibt in History (kein Delete). |
| **Wir heute** | Status da, UI fehlt → Risiko Löschen. |
| **Wir wollen** | ⋯ Stornieren + Grund → Erledigt. |
| **Vergleich** | Markt = fachliches Ende; wir = Löschen-Versuchung. |

**FE:** Menü+Modal. **BE:** `storniereAuftrag`.  
**Abnahme:** Storno sichtbar unter Erledigt, nicht weg.

## W7-07 — Orphans verdrahten oder löschen

| | |
|--|--|
| **Markt** | Keine toten Screens; Feature ist bedienbar oder fehlt. |
| **Wir heute** | KundenUpdate / Baustopp-Panel / Kopf ohne Consumer. |
| **Wir wollen** | Wire unter Vor Ort/Dokumente **oder** Delete. |
| **Vergleich** | Markt = Vertrauen; wir = Schein-Features. |

**FE/BE:** laut ENTSCHEIDUNGSLOG.  
**Abnahme:** Entweder Flow funktioniert oder Code weg.

## W5-01 — Nachtrag / No-Show / Korrektur-Hilfe

| | |
|--|--|
| **Markt** | Change order CTA; No-show status; Void-Erklärung im Sheet. |
| **Wir heute** | Nachtrag tief + Gate; No-Show fehlt; Korrektur ohne Hilfe. |
| **Wir wollen** | Sichtbarer Nachtrag-CTA; Hinweis No-Show; Copy-Sheet Korrektur. |
| **Vergleich** | Markt erklärt Konsequenzen; wir verstecken/schweigen. |

**FE:** CTAs + Sheets. **BE:** bestehende Nachtrag-Actions.  
**Abnahme:** Nachtrag findbar wenn Vertrag da; Korrektur-Sheet einmal gelesen verständlich.

## W7-04 / W8-04 — Weniger Tabs mobil

| | |
|--|--|
| **Markt** | 3–5 Kern-Tabs, Rest „More“. |
| **Wir heute** | ~10 Horizontal-Tabs. |
| **Wir wollen** | **5 Kern-Tabs (beschlossen #3):** Übersicht · Leistungen · Zahlung · Vor Ort · Aktivität — Rest unter „Mehr“. `DetailResponsiveTabs` nutzen oder löschen. |
| **Vergleich** | Markt = App-IA; wir = Desktop-IA auf dem Phone. Vor Ort bleibt First-Class (VO-01), nicht unter Mehr. |

**FE:** Tab-Gruppen laut #3; Desktop darf dichter sein. **BE:** —.  
**Abnahme Mobile:** genau diese 5 Kern-Tabs + Mehr; Vor Ort und Zahlung sichtbar ohne Mehr-Öffnen.

**Danach Block F:** Auftrag steuerbar wie Field-Service-CRM.

---

# Block G — Arbeitstag

## W2-01 — My Work / Tages-Inbox

| | |
|--|--|
| **Markt** | Home = Tasks due today (HubSpot tasks, Pipedrive activities). Charts secondary. |
| **Wir heute** | Dashboard Charts/Funnel first. |
| **Wir wollen** | Erste Viewport = WV / stille Angebote / überfällige RE. |
| **Vergleich** | Markt = Arbeit; wir = Reporting. |

**FE:** MyWorkList. **BE:** Inbox-Query.  
**Abnahme Desktop+Mobile:** Todos oben.

## W2-02 — Nachfassen-Zone

| | |
|--|--|
| **Markt** | Log call / Follow-up / Lost nebeneinander. |
| **Wir heute** | Primary Annehmen; kein Nachgefasst. |
| **Wir wollen** | Anrufen | Nochmal | Ablehnen + Timestamp. |
| **Vergleich** | Markt loggt Alltag; wir pushen Abschluss. |

**FE:** Zone-Card. **BE:** `logAngebotNachgefasst`.  
**Abnahme:** Nachfassen sichtbar in Aktivität.

## W2-03 — Lifecycle URL + ehrlicher Back

| | |
|--|--|
| **Markt** | Filter in URL; Back = letzte Liste. |
| **Wir heute** | Lifecycle nur Client; Back „Suchergebnisse“. |
| **Wir wollen** | `?lifecycle=`; Back „Vorgänge / offene Angebote“. |
| **Vergleich** | Markt shareable; wir lügen im Back-Label. |

**FE:** URL-State + Labels. **BE:** —.  
**Abnahme:** Reload hält Filter; Back-Text ehrlich.

**Danach Block G:** Start = Arbeitstag.

---

# Block H — Wiederfinden

## W3-01 — Kunde-Vorgänge + Duplikat-Gate

| | |
|--|--|
| **Markt** | Contact → related deals; Duplicate warning blockt/merge. |
| **Wir heute** | Tab unvollständig; Duplikat speichert trotzdem. |
| **Wir wollen** | Liste mit `restrictKunde`; Speichern blocken oder öffnen. |
| **Vergleich** | Markt verhindert Chaos; wir erlauben Doppelkunden. |

**FE:** Vorgänge-Tab. **BE:** Loader + Gate.  
**Abnahme:** Kundenseite zeigt Vorgänge; Doppel-Tel stoppt.

## W6-08 — Suche AN/RE

| | |
|--|--|
| **Markt** | Global search trifft Quotes & Invoices. |
| **Wir heute** | AN/RE lückenhaft. |
| **Wir wollen** | Treffergruppen mit Phase-Badge. |
| **Vergleich** | Markt findet Nummern; wir oft nicht. |

**FE:** Search-UI. **BE:** Suche erweitern.  
**Abnahme:** RE-/AN-Nr. findbar Desktop+Mobile.

**Danach Block H:** Vertretung möglich.

---

# Block I — Flows, Guidance, Copy

## W8-03 — Flow-Katalog (ein Weg pro Job)

| | |
|--|--|
| **Markt** | Ein „Send quote“-Flow, egal ob Toolbar oder Liste. |
| **Wir heute** | Versenden/Partner/Korrektur je Entity anders. |
| **Wir wollen** | Katalog + nur erlaubte Entry-Points. |
| **Vergleich** | Markt = ein Muskelgedächtnis; wir = neu lernen. |

**FE:** Doc + Refactor Einstiege. **BE:** Wrapper optional.  
**Abnahme:** 3 Einstiege „Partner“ → gleiches Sheet.

## W6-01 — Eine Guidance-Stimme

| | |
|--|--|
| **Markt** | Entweder Next-step-Banner **oder** Task-List — nicht drei. |
| **Wir heute** | Resolver + Banner + Primary (+ teils Checkliste). |
| **Wir wollen** | Badge immer; eine Handlungsfläche. |
| **Vergleich** | Markt = eine Stimme; wir = Chor. |

**FE:** Banner/Resolver Scope. **BE:** —.  
**Abnahme:** Max. eine „Was tun?“-Fläche außer Primary.

## W7-05 / W6-04 — Wizard-Labels

| | |
|--|--|
| **Markt** | Steps heißen nach Inhalt („Payment terms“, „Attachments“). |
| **Wir heute** | „Individualisieren“, „Paket“. |
| **Wir wollen** | „Texte & Empfänger“, „Anhänge & Typ“, … |
| **Vergleich** | Markt spricht Fach; wir sprechen intern. |

**FE:** `RechnungWizard` Labels (+ Hilfetexte). **BE:** —.  
**Abnahme:** Keine Wörter Individualisieren/Paket.

## W7-06 / W6-02 — Tab-Label-SoT

| | |
|--|--|
| **Markt** | Einheitliche Record-Tabs (Details / Activity / Files). |
| **Wir heute** | Spec ungenutzt; Bedarf/Projektinfos/Auftragdetails/Details gemischt. |
| **Wir wollen** | Nur `entityDetailTabLabel`; inhaltliche Namen. |
| **Vergleich** | Markt = System; wir = pro Entity erfunden. |

**FE:** Clients auf Spec. **BE:** —.  
**Abnahme:** Stichprobe — keine Hardcode-Titel.

**Danach Block I:** Konsistenz wie Produkt, nicht Baukasten.

---

# Block J — Optional (gleiche Logik, eigene Tickets)

## W5-02 — Desktop Split / Hover / Board

| | |
|--|--|
| **Markt** | Weite Screens: Liste|Detail; Hover-Quick-Actions; optional Kanban. |
| **Wir heute** | Nur Voll-Detail; Split-Kommentare veraltet. |
| **Wir wollen** | Optional ≥1280 Split; Hover; Board nur Angebot. |
| **Vergleich** | Markt nutzt Desktop-Breite; wir verschwenden sie. |

## W6-05 — ⋯ gruppieren; Inline Gesendet; Farben

| | |
|--|--|
| **Markt** | Menü-Gruppen; „Sent to…“ im Kopf; konsistente Statusfarben. |
| **Wir heute** | Flaches ⋯; nur Toast; Farben inkonsistent. |
| **Wir wollen** | Gruppen; Inline-Status; Farbmatrix. |
| **Vergleich** | Markt scannt; wir suchen im Toast. |

## W6-06 — (aufgehen in W8-01) Thumb / Dichte

| | |
|--|--|
| **Markt** | Safe-area, große Rows, max. 2 Meta-Zeilen mobil. |
| **Wir heute** | Dichte + Padding-Probleme teils. |
| **Wir wollen** | Nach Breakpoint-Fix: Dichte-Regeln. |
| **Vergleich** | Markt touch-first; wir teils Desktop-Dichte. |

## W6-07 — Optimistic / A11y / Onboarding

| | |
|--|--|
| **Markt** | Sofort-Feedback; 44px; Empty mit 3 Schritten. |
| **Wir heute** | Warten auf Server; gemischt; Empty dünn. |
| **Wir wollen** | Optimistic wo safe; Focus-visible; Checklist-Empty. |
| **Vergleich** | Markt fühlt sich flott an; wir oft „speichern…“. |

## W6-09 — Epics (Merge, Bounce, Bulk, …)

| | |
|--|--|
| **Markt** | Eigene Module (Duplicate management, Bounce handling, Bulk edit). |
| **Wir heute** | Fehlt / Improvisation; Baustopp-UI orphaned. |
| **Wir wollen** | Pro Thema eigenes Epic + Spec (nicht in A–I mischen). |
| **Vergleich** | Markt = Produktlinie; wir = Sammel-Backlog. |

## W6-03 / W6-10 — Copy-Noise / Kunden-Tab optional

| | |
|--|--|
| **Markt** | Staff-Sprache; Nav nach Nutzung. |
| **Wir heute** | Admin Login, KI Intelligence, Notizen·0; Kunden hinter Mehr. |
| **Wir wollen** | Rollenklare Labels; BottomNav nur nach Messung. |
| **Vergleich** | Markt poliert Copy; wir lassen Dev-Worte stehen. |

## DONE-01 — Plan-Validation (erledigt)

| | |
|--|--|
| **Markt** | Plan muss aufgehen (100 % / ≤ Vertrag). |
| **Wir heute** | **Erledigt** (Validation Server+UI). |
| **Wir wollen** | Behalten; Restbetrag-Anzeige noch in E. |
| **Vergleich** | Markt-Minimum erreicht; Overbill (ZP-01) noch offen. |

---

# PR-Schnitt & Abhängigkeit

```
A → B → B2(∥) → C → (D ∥ E) → F → (G ∥ H) → I → J
```

| PR | IDs | Merge wenn Abnahmen Desktop+Mobile grün |
|----|-----|----------------------------------------|
| A | W8-01, W8-05 | Breakpoint + Spec |
| B | W4-01, W4-02, W8-02 | App-Chrome |
| **B2** | **W11-01…05** (+ W10 parallel) | **Create/Wizard/Flows = Sheets + SoTA** |
| C | W7-01, W7-02, W7-03, W3-02 | Strip + Primary · Tab-SoT inkl. **#3** |
| D | W1-01…03 | Angebot-Kette |
| E | ZP-01, W3-03 | Geld · **#5:** fertig ≠ bezahlt |
| F | W1-04, W7-07, W5-01, W7-04 | Auftrag · 5 Kern-Tabs |
| G | W2-01…03 | Inbox · RE-überfällig-Zeile |
| H | W3-01, W6-08 | Suche/Kunde |
| I | W8-03/04, W6-01, W7-05/06, … | Konsistenz |

---

# Abnahme-Meta (jeder PR)

1. **Markt-Check:** Entspricht das dem Praxisbeispiel in der To-do-Tabelle?  
2. **Desktop-CRM-Check:** Liste/Detail/Primary wie Büro-CRM?  
3. **Mobile-App-Check:** Sheet / eine Leiste / große Targets?  
4. **Vergleich-Check:** Abstand „Wir heute → Wir wollen“ geschlossen?

---

*Stand: Jedes To-do mit Markt · Wir heute · Wir wollen · Vergleich · FE/BE · Abnahme. Audit bleibt Befund-Quelle.*
