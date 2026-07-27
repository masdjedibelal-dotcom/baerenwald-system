# CRM Alltag-Audit — Bärenwald Innendienst

**Zweck:** Bewertung aus Sicht eines Mitarbeiters, der den Fall *jetzt* erledigen muss.  
**Nicht:** Feature-Katalog. **Sondern:** Situation → geht das? → versteht man das? → passt Copy/UX/UI (Timing, Hierarchie)?

**Umsetzung (Bauanleitung Außen→Innen):** [`docs/CRM-UMSETZUNGSPLAN.md`](./CRM-UMSETZUNGSPLAN.md) — pro To-do **Markt · Wir heute · Wir wollen · Vergleich** + FE/BE + Abnahme.

**Scope:** `baerenwald-crm-dashboard` (Desktop + Mobile). Partner = ein Nav-Punkt; Referral nicht im Scope.

**Legende Fit**

| Fit | Bedeutung |
|-----|-----------|
| **Geht** | Funktion da, Weg findbar, Copy/UX passen grob |
| **Reibung** | Geht mit Umweg / Lernen / ⋯-Menü; Timing oder Labels stören |
| **Blockiert** | Funktion fehlt, tot, oder UI führt aktiv falsch |

**Dimensionen pro Situation**

1. **IST Funktion** — Wie geht es heute (konkreter Weg) oder warum nicht?  
2. **Verständlichkeit UX/UI** — Würde ein neuer MA den richtigen nächsten Klick finden? Desktop vs. Mobile.  
3. **Gesamt Copy + Struktur** — Steht das Richtige im richtigen Moment? Primary vs. Banner vs. ⋯? Noise?  
4. **SOLL / Vorschlag** — Konkret, umsetzbar.

---

## Kurzfazit

Der Happy Path (Anfrage → Wizard → Auftrag → RE) ist *technisch* oft da. Die Reibung kommt aus drei Schichten:

1. **Falsche Primary / falscher Default-Tab** im Moment (Annehmen statt Senden; Auftrag immer „Rechnung erstellen“; RE öffnet auf Stammdaten).
2. **Keine Orientierung in der Pipeline** — Phasen-Strip im Detail-Kopf ist entfernt; Historie/Verlauf sind zwei späte Tabs; „Als Nächstes“ ist Text ohne klaren Klick.
3. **Geld-Logik & Korrektur** (Zahlplan/Schluss, Rate korrigieren) plus Copy-Inkonsistenz (Stammdaten/Details, Handwerker/Partner, Wizard „Individualisieren/Paket“).

**Neu (Juli 2026):** Abnahme / Vor Ort ist *technisch* gewachsen (7-Schritt-Wizard, Bearbeiten, PDF), UX/UI aber **unter dem Rest des CRM** — parallele Surfaces, Formular-Ästhetik, Tab als Kitchen-Sink. Fit: **Blockiert** für Alltag „schnell sauberes Protokoll“. → Situationen **38–42** + [DESIGN_AUDIT §5.7 / §9.3](./DESIGN_AUDIT_CRM_FUNDAMENT.md).

Mobile ist **Desktop-First mit Adaption** (nicht Mobile-First): Doppel-Chrome, Breakpoint-Lücke 760≠767, Listen-Popover vs. Detail-Sheet, zu viele Tabs. Siehe Kapitel **Mobile First vs. Desktop-on-Mobile**.

→ Ausführlich: Kapitel **Phasen, Detail-Orientierung, Copy & Wizards** + Situationen 16–31 (inkl. Orphans) + **Abnahme-UX**.

---

## Situations-Index

| # | Cluster | Situation | Fit |
|---|---------|-----------|-----|
| 1 | Einstieg | Kunde ruft an → Anfrage | Geht |
| 2 | Einstieg | Morgens: Was heute? | Blockiert |
| 3 | Angebot | Angebot an Kunden mailen (Detail) | Blockiert |
| 4 | Angebot | Zuerst Partner, dann Kunde | Blockiert |
| 5 | Angebot | Telefonisch Ja | Reibung |
| 6 | Angebot | Kunde lehnt ab | Blockiert |
| 7 | Angebot | Nachfassen nach 5 Tagen | Reibung |
| 8 | Auftrag | Auftrag mittendrin stornieren | Blockiert |
| 9 | Zahlung | Gesamten Abschlagsplan anpassen | Geht |
| 10 | Zahlung | Position ändern, Abschläge laufen | Reibung |
| 11 | Zahlung | Abschlag + Schluss zusammen > VK | Blockiert |
| 12 | Zahlung | Nur eine Rate falsch, andere bezahlt | Reibung |
| 13 | Zahlung | Rate nur nochmal senden | Reibung |
| 14 | Wiederfinden | Alter Fall / welche RE? | Reibung |
| 15 | Mobile | Unterwegs kurz handeln | Reibung |
| 16 | Auftrag | Partner zuweisen / wechseln | Reibung |
| 17 | Auftrag | Ersten Abschlag stellen | Reibung |
| 18 | Auftrag | Vor Ort / Bautagebuch prüfen | Reibung |
| 19 | Auftrag | Abnahme / Abschluss | Reibung |
| 20 | Auftrag | Nachtrag / Mehrleistung | Reibung |
| 21 | Auftrag | Notfall direkt beauftragen | Reibung |
| 22 | Auftrag | Versicherungsakte | Geht |
| 23 | Auftrag | Stornieren | Blockiert |
| 24 | Auftrag | Nach RE wiederfinden | Reibung |
| 25 | Auftrag | Projektstand verstehen | Blockiert |
| 26 | Auftrag | Termin / Wiedervorlage | Blockiert |
| 27 | Auftrag | Anrufen vom Vorgang | Reibung |
| 28 | Auftrag | Kunden-Zwischenstand / Update senden | Blockiert |
| 29 | Auftrag | Baustopp dokumentieren | Blockiert |
| 30 | Auftrag | Status manuell setzen (offen→Arbeit→Abnahme) | Reibung |
| 31 | Auftrag | Compliance vor Start prüfen | Reibung |
| 32 | Mobile | Detail: zwei Leisten (Doppel-Chrome) | Blockiert |
| 33 | Mobile | Listen-⋯ mit Daumen (Popover) | Reibung |
| 34 | Mobile | Breakpoint-Lücke 761–767 | Reibung |
| 35 | Mobile | 10 Tabs horizontal scrollen | Reibung |
| 36 | Mobile | Filter inkonsistent | Reibung |
| 37 | Mobile | Stamm/Partner unter Mehr | Reibung |
| 38 | Abnahme | Abnahmeprotokoll per Wizard erstellen | **Blockiert** |
| 39 | Abnahme | Fehler im Protokoll korrigieren | Reibung |
| 40 | Abnahme | Vor-Ort-Tab: Abnahme vs. Tagebuch vs. Abschluss | **Blockiert** |
| 41 | Abnahme | Checkliste / Gewerk vor Ort bedienen | Reibung |
| 42 | Abnahme | PDF prüfen / an Kunden geben | Reibung |

---

## 1 · Kunde ruft an → Anfrage anlegen

**Szene:** Montag 9:12, Telefon. Fall soll sofort im System sein.

### IST Funktion
- **Geht:** FAB „Neu“ → Anfrage → Staff-Funnel, Kanal Telefon, Notiz.
- Web-Leads erscheinen unter Vorgänge → Anfrage.

### Verständlichkeit UX/UI
- **Desktop:** Klar (FAB + Wizard).
- **Mobile:** Zentraler FAB, Wizard fullscreen — ok.

### Gesamt Copy + Struktur
- Funnel-Texte verständlich. Hier stimmt das Timing: Primary = anlegen.

### SOLL / Vorschlag
- Behalten. Optional: Onboarding-Empty „Erste Anfrage anlegen“ wenn Liste leer.

---

## 2 · Morgens: Was muss ich heute tun?

**Szene:** CRM auf — du willst eine Arbeitsliste, keine Charts.

### IST Funktion
- **Fehlt:** Keine Tages-Inbox (WV fällig, stille Angebote, überfällige RE).
- Dashboard = Greeting + KPIs + Funnel/Charts/Ranking.

### Verständlichkeit UX/UI
- **Desktop:** KPI-Klicks helfen halb; Charts dominieren die erste Viewport — falsches Signal „Reporting statt Arbeit“.
- **Mobile:** Dashboard-Tab noch weniger handlungsfähig.

### Gesamt Copy + Struktur
- „Vertriebs-Funnel“, „Gesamt-Conversion“, „Top-Ranking“ = Analytics-Jargon im falschen Moment.
- Ranking-Hints wirken wie Pflichtlektüre, sind selten handlungsrelevant.

### SOLL / Vorschlag
- Erste Viewport = **My Work** (5–8 Zeilen). Charts eine Scroll-Länge tiefer / „Mehr Kennzahlen“.
- Copy: „Heute anrufen“, „Angebot nachfassen“, „RE überfällig“.
- **Todo:** W2-01

---

## 3 · Angebot an Kunden mailen (am Detail, nach Wizard)

**Szene:** Angebot fertig. Du bist im Detail und willst senden — nicht annehmen.

### IST Funktion
- **Blockiert / tot am Detail:** `AngebotVersandSection` mit `mode="kunde"` blendet den Senden-Button aus; `kundeVersandOpen` wird nie auf true gesetzt.
- ⋯ „Angebot versenden“ oft erst nach bereits gesendet (Resend).
- Zuverlässig: Versand am **Wizard-Ende**.

### Verständlichkeit UX/UI
- **Desktop:** Primary oft **„Angebot annehmen“** — sieht aus wie der nächste Schritt, ist aber der falsche für „noch mailen“.
- **Mobile:** Sticky Primary = Annehmen → noch stärkerer Fehlreiz.

### Gesamt Copy + Struktur
- Banner „Als Nächstes: … versenden oder direkt annehmen“ + Primary Annehmen = **drei Stimmen, eine falsche Hierarchie**.
- Klassischer Fall „falsches Ding im falschen Moment“.

### SOLL / Vorschlag
- Entwurf: Primary **„An Kunden senden“** → öffnet Modal.
- Nach Versand: Primary **„Annehmen“**, Secondary Nachfassen/Ablehnen.
- Banner-Text = Primary oder Banner weglassen.
- **Todo:** W1-01

---

## 4 · Zuerst Partner anfragen, dann Kunde

**Szene:** Multi-Gewerk — Partner soll Preise liefern, bevor die Kundin das Angebot sieht.

### IST Funktion
- Primary „Handwerker anfragen“ scrollt oft zu `#angebot-versand-handwerker`; Section am Detail häufig nicht gerendert.
- Workaround: Wizard-Zuweisung oder später Auftrag → Leistungen.

### Verständlichkeit UX/UI
- **Desktop/Mobile:** Button wirkt kaputt (Scroll ins Leere) → Vertrauensbruch.
- Naming: Nav „Partner“, Button „Handwerker“ — zusätzliche Verwirrung.

### Gesamt Copy + Struktur
- Banner spricht von Partner, Button von Handwerker — gleicher Schritt, zwei Wörter.

### SOLL / Vorschlag
- Partner-Block sichtbar; Primary „Partner anfragen“ / „Einreichung prüfen“.
- Status-Labels einheitlich „Partner…“.
- **Todo:** W1-02

---

## 5 · Kunde sagt telefonisch Ja

**Szene:** Kein Mail-Ping-Pong — Auftrag sofort.

### IST Funktion
- **Geht:** „Angebot annehmen“ auch ohne vorherigen Versand.

### Verständlichkeit UX/UI
- Für *diesen* Case ist Primary Annehmen richtig — aber nur, wenn Zustand „versendet oder Telefon-Zusage“ klar ist.
- Ohne Zustandsunterscheidung lernt der MA das falsche Default.

### Gesamt Copy + Struktur
- Banner sagt oft noch „senden“ → Konflikt mit Telefon-Ja.

### SOLL / Vorschlag
- Zwei klare Zustände im Header: *Noch nicht beim Kunden* vs. *Warten / Telefon-Zusage möglich*.
- Optional Hint: „Telefonisch annehmen (ohne Mail)“.
- **Todo:** Teil von W1-01

---

## 6 · Kunde lehnt ab / zu teuer

**Szene:** Fall schließen, Pipeline nicht ewig offen lassen.

### IST Funktion
- **Fehlt UI:** Status abgelehnt nur Anzeige/API; kein Ablehnen-Button.

### Verständlichkeit UX/UI
- Nutzer sucht „Ablehnen“ neben Annehmen — findet nichts → improvisiert Notiz/Verloren/Löschen.

### Gesamt Copy + Struktur
- Verloren ≠ Abgelehnt (fachlich), aber nur eines ist bedienbar.

### SOLL / Vorschlag
- Zone „Warten auf Kunde“: Anrufen | Nochmal senden | **Ablehnen** (+ kurzer Grund) → Lifecycle Erledigt.
- **Todo:** W1-03, W2-02

---

## 7 · Angebot liegt seit 5 Tagen — nachfassen

**Szene:** Anruf loggen, Wiedervorlage, optional nochmal senden.

### IST Funktion
- Kein „Nachgefasst“-Event/Button.
- Nochmal senden: ⋯ wenn schon gesendet.
- Anrufen: eher Kunden-Detail, nicht Vorgangs-⋯.

### Verständlichkeit UX/UI
- Primary = Annehmen suggeriert „Abschluss“, nicht „Nachfassen“.
- **Mobile:** Anruf noch weiter weg.

### Gesamt Copy + Struktur
- Banner „Auf Kundenantwort warten…“ ohne klickbare Actions = leere Guidance.

### SOLL / Vorschlag
- Card mit 3 gleichwertigen Actions + „Nachgefasst am …“ / Reminder.
- **Todo:** W2-02

---

## 8 · Auftrag mittendrin stornieren

**Szene:** Versicherung zahlt nicht — Abbruch mit Spur, kein Löschen.

### IST Funktion
- Status `storniert` existiert; **Steuerungs-UI fehlt**.

### Verständlichkeit UX/UI
- MA sieht ggf. nur Löschen → Angst / Datenverlust.

### Gesamt Copy + Struktur
- Storno muss als Warn-Action erklärt werden („bleibt unter Erledigt sichtbar“), nicht wie Löschen.

### SOLL / Vorschlag
- ⋯ „Auftrag stornieren“ + Pflichtgrund → Erledigt + Historie.
- **Todo:** W1-04

---

## 9 · Gesamten Abschlagsplan anpassen

**Szene:** 30/40/30 → 40/60; eine Rate schon gestellt.

### IST Funktion
- **Geht:** Auftrag → Zahlung & Rechnung → Plan bearbeiten.
- Gestellt/bezahlt = eingefroren; offene Raten editierbar; Speichern nur bei Summe 100 %; Server prüft ≤100 %/≤VK (Validation nachgezogen).

### Verständlichkeit UX/UI
- **Desktop:** Modal verständlich („fest“).
- **Mobile:** nutzbar; Summe-Hinweis gut.

### Gesamt Copy + Struktur
- „muss 100% sein“ ist gutes Feedback im richtigen Moment.
- Live-Restbetrag fehlt noch.

### SOLL / Vorschlag
- Behalten + Live „Bereits gestellt / offener Rest“.
- **Todo:** DONE-01 (Validation erledigt); Rest-Anzeige ergänzen

---

## 10 · Position ändern, während Abschläge laufen

**Szene:** Leistung teurer; 1. Abschlag schon bezahlt.

### IST Funktion
- Leistungen am Auftrag änderbar.
- Bezahlte Planzeile/RE ändern sich **nicht** automatisch.
- Offene Raten/Schluss müssen bewusst neu gedacht werden.

### Verständlichkeit UX/UI
- Zwei Orte (Leistungen vs. Zahlung) — leicht vergessen, den Plan nachzuziehen.
- **Kein** Hinweis nach Speichern der Position.

### Gesamt Copy + Struktur
- Fehlende Erklärung der Auswirkung = typisches „System schweigt im kritischen Moment“.

### SOLL / Vorschlag
- Nach Positions-Save Banner: „Bezahlte Raten unverändert. Offene Raten / Schluss prüfen.“ + Link.
- **Todo:** Hinweis + ZP-01 / W5-01

---

## 11 · Abschlag + Schluss zusammen > VK

**Szene:** 30 % Abschlag (Pauschale) + Schluss mit allen Positionen ≈ 130 %.

### IST Funktion
- **Blockiert / Bug-Pfad:** Abschlag ohne `position_ids` → Pauschale aus Plan-%.
- Schluss (Rest) ohne belegte Positionen am Abschlag → **alle** Auftragspositionen (= ~100 % VK).
- `bereitsGestellt` oft nur im Text, nicht als Abzug vom Schluss-Betrag bei Positions-Schluss.
- Plan-%-Summe 100 % verhindert das **nicht**.

### Verständlichkeit UX/UI
- Einzeln sehen beide REs „plausibel“ aus; erst die Summe zeigt den Fehler.
- Keine Warnung „Summe RE > Auftrag“.

### Gesamt Copy + Struktur
- Label „Schlussrechnung“ suggeriert Rest — Verhalten ist oft „Rest der *Positionen*“, nicht „Rest des *Geldes*“.
- **Falsches mentales Modell im entscheidenden Moment.**

### SOLL / Vorschlag
1. Schluss-Betrag = `max(0, VK − Summe gestellter/bezahlter Abschläge)` **oder**
2. Pflicht: Abschläge Leistungen zuordnen **oder** alles durchgängig pauschal vom Plan.
3. UI-Warnung wenn Σ RE-Brutto > VK (± Toleranz).
- **Todo:** **ZP-01** (kritisch, vor/mit Welle 1 Geld-Themen)

---

## 12 · Nur eine Abschlags-RE falsch — andere schon bezahlt

**Szene:** 1. Abschlag bezahlt. 2. Abschlag/Schluss falsch → neu raus.

### IST Funktion
- Bezahlte Rate eingefroren (richtig).
- Korrektur der falschen RE: RE öffnen → **Rechnung korrigieren** (Storno + neue Nr.) oder Soft-Storno wenn nur gesendet.
- Am Zahlplan-Row fehlt klarer CTA „Korrigieren“.

### Verständlichkeit UX/UI
- MA sucht die Aktion an der **Rate** — findet sie an der **RE**.
- **Desktop:** umwegig aber machbar.
- **Mobile:** langer Weg + Doppel-Chrome.

### Gesamt Copy + Struktur
- „Rechnung korrigieren“ erklärt zu wenig: „Ersetzt *diese* Rate — bezahlte bleiben.“

### SOLL / Vorschlag
- Pro Rate im Plan: Zur RE | **Korrigieren** | Nochmal senden.
- Copy-Sheet: Was passiert bei Storno+Neu.
- **Todo:** W3-03, W5-01

---

## 13 · Rate nur nochmal senden (Inhalt ok)

**Szene:** Kunde: „Mail nicht bekommen.“

### IST Funktion
- RE-Detail: nochmal versenden (meist).
- Zahlplan-Row „Nochmal versenden“ laut offenen Punkten oft **nicht verdrahtet**.

### Verständlichkeit UX/UI
- Erwartung: Aktion an der Rate. Realität: RE öffnen.

### Gesamt Copy + Struktur
- Toter Menüpunkt zerstört Vertrauen schneller als fehlender Menüpunkt.

### SOLL / Vorschlag
- Verdrahte Resend an Rate **oder** entferne den Punkt.
- **Todo:** W3-03

---

## 14 · Alter Fall wiederfinden („welche RE?“)

**Szene:** Kollege krank; Suche über Name/Phase.

### IST Funktion
- Suche + Tab Historie helfen teilweise.
- Kunde-Vorgänge unvollständig (OP-8d).
- Nach RE-Phasenwechsel wirkt Auftrag „weg“.

### Verständlichkeit UX/UI
- Tabs **Verlauf** vs. **Historie** — zwei „Geschichten“.
- **Mobile:** Stamm hinter Mehr.

### Gesamt Copy + Struktur
- Naming ist das Hauptproblem, nicht fehlende Daten.

### SOLL / Vorschlag
- Tabs: **Aktivität** / **Projektphasen**.
- Leerer Auftrag-Tab: „Aktuell unter Rechnung RE-…“.
- Kunde-Vorgänge verdrahten; Suche AN/RE.
- **Todo:** W3-01, W3-02, W6-08

---

## 15 · Unterwegs kurz handeln

**Szene:** Auto/Baustelle, eine Hand, Partner ruft.

### IST Funktion
- Kern geht, wenn man den Desktop-Weg kennt.

### Verständlichkeit UX/UI
- BottomNav + sticky Detail-Bar = Doppel-Chrome.
- Listen-⋯ oft Popover statt Sheet.
- Filter inkonsistent.

### Gesamt Copy + Struktur
- Mehr: „Partner“ + Legacy „Netzwerk“ — falsches zweites Konzept im falschen Screen.

### SOLL / Vorschlag
- Detail: eine Action-Bar; Listen-⋯ Sheet; eine Partner-Kachel; Office-light CTAs.
- **Todo:** W4-01, W4-02

---

## Querbefund: „Falsches Ding im falschen Moment“

| Moment | Was die UI oft zeigt | Was der MA braucht |
|--------|----------------------|--------------------|
| Angebot Entwurf | Primary Annehmen | Senden / Partner |
| Angebot gesendet | Primary Annehmen | Nachfassen / Ablehnen / Annehmen |
| Dashboard Start | Funnel/Charts | Heute-Liste |
| Zahlplan Rate | Wenig Row-Actions | Korrigieren / Resend an der Rate |
| Schluss erstellen | „Schluss“-Label | Restgeld, nicht nochmal 100 % LV |
| Detail mobil | BottomNav + CTA-Bar | Eine Leiste |
| Guidance | Banner + Resolver + Badge | Eine Handlungsstimme |

**Regel für Fixes:** Primary = der häufigste *richtige* nächste Geld-/Kunden-Schritt in *diesem* Status. Alles andere Secondary oder ⋯.

---

## Phasen, Detail-Orientierung, Copy & Wizards

> **Lücke, die Du angesprochen hast:** Bisher zu wenig Auftrag-Alltag, zu wenig „was sehe ich pro Phase?“, zu wenig Historie/Guidance/Wizard/Copy-Konsistenz. Dieses Kapitel schließt das — **codebasiert**.

### Gesamtbefund (Orientierung)

| Thema | Urteil | Kern |
|-------|--------|------|
| Phasen-Navigation im Detail | **Blockiert / entfernt** | `EntityDetailLayout`: `projektKontext` / Phasen-Breadcrumb sind **@deprecated und werden nicht gerendert**. Die Kette Anfrage→…→RE ist **nicht** dauerhaft sichtbar. |
| „Was soll ich tun?“ | **Reibung** | `NaechsterSchrittBanner` + oft abweichende Primary + ggf. `VorgangResolverBanner` = mehrere Stimmen. Texte oft **beschreibend**, nicht **klickbar**. |
| Historie | **Reibung** | Nur Tab „Historie“ (spät in der Tab-Leiste). `ACTIVITY_TAB_LABEL = 'Aktivität'` existiert in `crm-labels.ts`, Tabs heißen aber weiter **„Verlauf“**. Zwei Geschichten: Timeline vs. Phasen-Links. |
| Default-Tab | **Falscher Moment** | Jede Phase öffnet einen **generischen** ersten Tab — selten den Arbeits-Tab des Status. |
| Auftrag-Primary | **Falscher Moment** | Fast immer **„Rechnung erstellen“**, auch wenn Partner/Abnahme/Zahlplan der echte nächste Schritt ist. |
| Wizards | **Reibung** | Angebot 5 Schritte klarer; RE-Wizard **Individualisieren / Paket** unklar; viel auf einmal. |
| Copy | **Inkonsistent** | Stammdaten/Details/Projektinfos/Auftragdetails; Handwerker vs Partner; Back „Suchergebnisse“; Verlauf vs Historie. |

---

### Tab-Landschaft pro Phase (IST)

| Phase | Default-Tab | Weitere Tabs (Reihenfolge sinngemäß) | Problem |
|-------|-------------|--------------------------------------|---------|
| **Anfrage** | `Bedarf` (`details`) | Stammdaten, Fotos, Verlauf, Historie, Dokumente, Notizen | Relativ fokussiert; „Als Nächstes“ oft besser als Primary. |
| **Angebot** | `Projektinfos` | Leistungen, Stammdaten, Fotos, Verlauf, Historie, Dokumente, Notizen | Kein Zahlplan-Tab; Versand/Partner nicht als Tab. Primary oft Annehmen. |
| **Auftrag** | `Auftragdetails` | Leistungen, Stammdaten, Fotos, **Zahlung & Rechnung**, **Vor Ort & Abschluss**, Verlauf, Historie, Dokumente, Notizen | **~10 Tabs** — Überforderung. Geld/Partner tief. Primary = Rechnung. |
| **Rechnung** | `Stammdaten` | Details, Auftragdetails?, Zahlplan, Fotos, Verlauf, Historie, Dokumente, Notizen | Öffnet mit **Stammdaten**, obwohl oft Versenden/Bezahlt/Korrektur der Job ist. Label „Details“ generisch. |

Quellen: `AnfrageDetailClient`, `AngebotDetailPageClient`, `AuftragDetailClient`, `RechnungDetailClient`, `ACTIVITY_SECTIONS` in `crm-labels.ts`.

---

### „Als Nächstes“ vs. Primary (IST Copy)

Aus `naechster-schritt.ts`:

| Phase / Status | Banner-Hint (gekürzt) | Typische Primary | Konflikt |
|----------------|----------------------|------------------|----------|
| Anfrage ohne Angebot | Bedarf prüfen, Angebot erstellen | Angebot erstellen | Gering |
| Angebot Entwurf | Positionen prüfen — versenden **oder** annehmen | Oft **Annehmen** | **Hoch** |
| Angebot gesendet | Warten — oder manuell annehmen | **Annehmen** | Hoch (Nachfassen fehlt) |
| Auftrag offen/in_arbeit | Leistungen steuern; Portal vor Ort | **Rechnung erstellen** | **Hoch** |
| Auftrag Abnahme | Abnahme prüfen → Abschluss + RE | Rechnung erstellen | Mittel |
| Auftrag abgeschlossen | RE/Dokumente nachziehen | — / RE | Ok |

**SOLL-Regel:** Banner-Text = Primary-Label *oder* Banner weglassen. Primary = statusabhängiger Arbeits-Schritt (nicht immer Geld).

---

### Historie & Phasen-Kette

**IST**
- Komponenten existieren: `ProjektHistorieTab`, `ProjektKette`, `VorgangPhasenDiagramm`, `EntityProjektUebersichtCard`.
- Layout rendert **keine** permanente Phasen-Navigation mehr (`EntityDetailLayout` Zeilen 18–21, 36–44: Props ignoriert).
- Historie = Tab mit Phasen-Gruppen + Links; Verlauf = Event-Timeline. Beide heißen „Geschichte“-artig.
- Übersicht-Card oft **im ersten Inhaltstab** versteckt (Bedarf/Projektinfos/Auftragdetails), nicht global.

**Verständlichkeit:** MA sieht Status-Badge, aber nicht „wo in der Pipeline“. Springen zwischen AN/AU/RE nur über Historie-Tab oder Suche.

**SOLL**
1. Kompakte **Phasen-Strip** dauerhaft unter Detail-Kopf (Anfrage · Angebot · Auftrag · Rechnung), aktiver Glied + Link.
2. Tab **„Verlauf“ → „Aktivität“** (`ACTIVITY_TAB_LABEL` nutzen); **„Historie“ → „Projektphasen“**.
3. Optional: letzte 3 Aktivitätseinträge als Preview im Kopf / ersten Tab.

**Todos:** W3-02 (Rename), **W7-01** (Phasen-Strip zurück), **W7-02** (Aktivität-Preview).

---

### Auftrag-Phase: Alltagssituationen (Erweiterung)

| # | Situation | Fit | IST kurz | UX/Copy | SOLL |
|---|-----------|-----|----------|---------|------|
| 16 | Partner dem Auftrag zuweisen / wechseln | Reibung | Leistungen / Disposition; Menü „Nachunternehmervertrag“ nur Bauprojekt | Primär RE, nicht Partner | Statusabhängige Primary „Partner zuweisen“; klarer Ort |
| 17 | Ersten Abschlag stellen | Reibung | Tab Zahlung & Rechnung (nicht Default) | Default = Auftragdetails | Deep-Link / Default nach Status; Primary „Abschlag erstellen“ wenn Plan offen |
| 18 | Partner vor Ort / Bautagebuch prüfen | Reibung | Tab Vor Ort & Abschluss; Banner sagt Portal | Tab weit rechts; vermischt | Segment Tagebuch; früher bei Status in_arbeit/abnahme |
| 19 | Abnahme / Abschluss | **Blockiert** | Secondary; **7-Step**-Wizard; RE Primary | Wizard grauenhaft | Primary Abnahme; ≤3 Steps (W9) |
| 20 | Nachtrag / Mehrleistung | Reibung | Nur ⋯ + Vertrag-Gate | Unsichtbar | CTA „Nachtrag“ (W5-01) |
| 21 | Notfall / Direkt beauftragen | Reibung | ⋯ „Direkt beauftragen (Notfall)“ | Ok versteckt | Behalten im ⋯; Banner wenn Notfall-Flag |
| 22 | Versicherungsakte PDF | Geht* | ⋯ wenn Kostenträger Versicherung | Selten | Ok im ⋯ |
| 23 | Auftrag stornieren | Blockiert | Status ohne UI | — | W1-04 |
| 24 | Nach RE-Phase: Auftrag wiederfinden | Reibung | Auftrag-Tab in Vorgängen leer ohne Erklärung | Naming/Empty | W3-02 Empty+Link |
| 25 | Was ist der Stand des Projekts? | Blockiert | Keine Strip; Historie-Tab | „Ich weiß nicht wo ich bin“ | W7-01 |
| 26 | Termin / Wiedervorlage am Auftrag | Blockiert/dünn | Kaum First-Class | — | WV in My Work + am Auftrag (W2-01+) |
| 27 | Anrufen vom Auftrag | Reibung | Oft nur Kunden-Detail | Vorgangs-⋯ ohne Anruf | Anrufen in Actions (W2-02/W4) |
| 28 | Kunden-Zwischenstand mit Fotos | Blockiert | `AuftragKundenUpdatePanel` existiert — **am Detail nicht verdrahtet** | Feature „tot“ trotz Code | Panel unter Vor Ort / Kommunikation (W7-07) |
| 29 | Baustopp / Nachtrag-Doku | Blockiert | `AuftragNachtragBaustoppSection` nur über `AuftragDokumentationPanel` — **kein Consumer** am live Detail | Orphan | An Vor Ort/Dokumente hängen (W6-09 / W7-07) |
| 30 | Status manuell setzen | Reibung | Kein klarer Status-Picker im Header | Badge ohne Steuerung | Optional Status-⋯ mit Gates (W7-02) |
| 31 | Compliance vor Start | Reibung | Nur Bauprojekt, unter Dokumente; Copy erwähnt teils fehlenden „Compliance“-Tab | Versteckt | Unterblock klar benennen |

\*Geht = Funktion vorhanden, nicht Alltags-Primary.

### Auftrag: orphaned / unverdrahtete UI

Komponenten mit Actions, aber **kein Import** in `AuftragDetailClient` (Stand Explore):

| Komponente | Zweck | Folge |
|------------|-------|--------|
| `AuftragKundenUpdatePanel` | Kunden-Zwischenstand | Alltag „Update an Kunden“ fehlt |
| `AuftragProjektSteuerung` / `AuftragDetailKopf` | Projektsteuerung / Kopf-Steuerung | Parallel-UI tot |
| `AuftragDokumentationPanel` (+ `AuftragNachtragBaustoppSection`) | Nachtrag/Baustopp-Doku | Baustopp nur Improvisation |
| `buildAuftragNaechsteSchritte` | Checkliste | Banner-only; Primary bleibt RE |

**Deep-Links (positiv):** `?tab=zahlplan|abnahme|bautagebuch|verlauf|historie|phasen` — gut für My-Work, sofern Default-Tab nicht dagegen arbeitet.

**Todos:** **W7-07** (Orphans verdrahten oder löschen), W5-01, W6-09, W1-04.

---

### Wizards: Komplexität

| Wizard | Schritte | Labels | Urteil |
|--------|----------|--------|--------|
| Staff-Funnel / Anfrage | variabel | Funnel | Meist ok |
| **Angebot** | 5: Typ & Projekt → Positionen → Finalisieren → Vorschau → Versenden | Verständlich | Länger, aber logisch; Partner-Zuweisung leicht versteckt |
| **Rechnung** | 4: Positionen → **Individualisieren** → **Paket** → Versand | **Unklar** | „Individualisieren“ = Texte/Empfänger?; „Paket“ = Anhänge/Abschlag? — Copy-Fail (W6-04) |
| Abnahmeprotokoll | **7:** Übergabe → Personen → Bauvorhaben → Leistungen → Ergebnis → Fotos → PDF | PDF-Felder als Steps | **Blockiert / grauenhaft** — siehe Sit. 38–42 |
| Vertrag / Nachtrag | mehrstufig | Fachlich | Nur Bauprojekt; Einstieg über ⋯ |

**SOLL RE-Wizard:** Labels z. B. „Texte & Empfänger“ / „Anhänge & Abschlag-Typ“ / „Prüfen & Senden“. Optional Step zusammenlegen wenn keine Anhänge.

**SOLL Abnahme-Wizard:** max. **3** Steps — Checkliste & Ergebnis · Übergabe-Meta (ein Screen, kollabierbar) · Prüfen & PDF. Surfaces konsolidieren (Wizard **oder** Inline, nicht beides + FillFlow).

---

### Abnahme / Vor Ort — Alltag (Juli 2026)

> Ergänzung zum Fundament-Audit §5.7: Der Flow ist **neu und wichtig**, aber UI/UX fühlt sich an wie ein zusammengeklebtes Formular — nicht wie ein Werkzeug für die Baustelle.

#### Surfaces (parallel)

| Was | Wo | Problem |
|-----|-----|---------|
| Create-Wizard | `/abnahme/erstellen` | 7 Steps, Form-Inputs, kein Preview |
| VorOrtPanel | Tab Vor Ort | Abnahme + Tagebuch + Abschluss gestapelt |
| Inline | Legacy unter Vor Ort | Mock-UI + FAB, zweiter Editor |
| FillFlow | `/abnahme` | Dritter „Ausfüllen“-Pfad |
| Card | Auftrag-Cards | Liste ok, Einstieg unklar |
| Mängel-Flow | `/abnahme/maengel` | Isoliert ok |

#### Situations-Detail

| # | Situation | Fit | IST | SOLL |
|---|-----------|-----|-----|------|
| 18 | Partner vor Ort / Bautagebuch | Reibung | Tab weit rechts; vermischt mit Abnahme | Segment „Tagebuch“; früher bei `in_arbeit` |
| 19 | Abnahme / Abschluss | Reibung→**Blockiert** | Secondary + 7-Step-Wizard; RE bleibt Primary | Primary „Abnahme“; Wizard ≤3 Steps |
| 38 | Protokoll erstellen | **Blockiert** | 7 Klicks Meta vor Checkliste; wirkt administrativ | Checkliste zuerst; Meta später/neben |
| 39 | Protokoll korrigieren | Reibung | Bearbeiten geht (Prefill), aber wieder 7 Steps | Kurz-Edit oder Step „Prüfen“ öffnen |
| 40 | Vor-Ort-Tab verstehen | **Blockiert** | Intro + 2 Kacheln + Tagebuch + Abschluss + Extras | Segmented Control, eine Aufgabe |
| 41 | Checkliste bedienen | Reibung | Gewerk-/Titel-Inputs, kleine Toggles, Default-Labels | Große OK/Mangel; Rename unter „Mehr“ |
| 42 | PDF Qualität prüfen | Reibung | Download am Ende; Checks/Layout oft Überraschung | Preview-Step oder Inline-Vorschau |

#### Todos (Welle 9 — Abnahme UX)

| ID | Impact | Aufwand | To-do |
|----|--------|---------|-------|
| **W9-01** | kritisch | M | Surfaces entscheiden: 1 Wizard + 1 Liste; Inline/FillFlow entfernen oder mergen |
| **W9-02** | kritisch | M | Wizard auf ≤3 Steps + Checkliste-first |
| **W9-03** | hoch | M | Vor-Ort Segmented: Abnahme \| Tagebuch \| Abschluss |
| **W9-04** | hoch | S | Visuell: gleiche Shell wie Angebot; große Status-Controls |
| **W9-05** | mittel | S | PDF-Preview vor Finalisieren; Mobile Stepper Labels |
| **W9-06** | mittel | S | Bei Status `abnahme`: Primary = Abnahme (eng W7-02) |

---

### Copy- & UI-Konsistenz (Querschnitt)

| Muster | Beispiel IST | Soll |
|--------|--------------|------|
| Generische Tabs | Stammdaten, Details, Projektinfos, Auftragdetails | Inhaltlich: Kunde & Objekt, Positionen, Übersicht |
| Zwei „Geschichten“ | Verlauf + Historie | Aktivität + Projektphasen |
| Ungenutzte Konstante | `ACTIVITY_TAB_LABEL='Aktivität'` unbenutzt | Tab umbenennen |
| **Ungenutzte Spec** | `entity-detail/entity-detail-tabs.ts` definiert u. a. `Aktivität`, `Nächste Schritte`, `Leistungen` — **Detail-Clients hardcodieren Labels und nutzen die Spec kaum** | Clients nur noch über `entityDetailTabLabel` / `ENTITY_DETAIL_TAB_LABELS` |
| Partner-Naming | Button „Handwerker anfragen“, Banner „Partner…“, Status „Gesendet Handwerker“, Complete-Screen „Handwerker anfragen“ | Überall Partner (`vorgang-labels`, Wizard-Complete, CTAs) |
| Partner vs Netzwerk | Sidebar Partner=`/handwerker`; Mehr: Partner **und** Netzwerk (`/partner`) | Eine Kachel (W4-02) |
| Portal-Link-Copy | „Handwerker-Link“ vs „Partner-Link“ vs „Kundenportal-Link“ (`entity-menu`) | Partner-Link / Kundenportal-Link |
| Back-Link | „Zurück zu den Suchergebnissen“ auch ohne Suche | „Zurück zu Vorgängen / offenen Aufträgen“ (W2-03) |
| Guidance-Stack | Resolver + Als Nächstes + Badge + Primary | Eine Primärstimme (W6-01) |
| Rechnung Default | Stammdaten zuerst | Statusabhängig: Entwurf→Details/Versand; gesendet→Zahlplan/Bezahlt |
| Auftrag Default | Auftragdetails | Statusabhängig: Zahlung / Vor Ort / Leistungen |
| Positions-Label | Angebot/Auftrag: *Leistungen* · Rechnung: *Details* · Spec auch *Positionen* | Ein Wort pro Inhaltstyp |

### Doppelte „Nächste Schritte“-Systeme

| System | Datei | Was es ist | Lücke |
|--------|-------|------------|-------|
| Banner „Als Nächstes“ | `naechster-schritt.ts` + `NaechsterSchrittBanner` | Ein Hint-Text, **nicht klickbar** | **Keine** `naechsterSchrittRechnung`; Auftrag-Texte oft Portal-Info statt Staff-CTA |
| Checklisten-Card | `naechste-schritte.ts` / `auftrag-naechste-schritte.ts` + `NaechsteSchritteCard` | Konkretere Steps (Nachfassen, Handwerker zuweisen, …), teils klickbar | Parallel zum Banner; Copy mischt Handwerker; nicht überall verdrahtet / sichtbar |

**SOLL:** Ein Guidance-Modell — entweder Banner = Primary spiegeln **oder** eine Checklisten-Card als einzige „Was tun?“-Fläche; Rechnung braucht eigenen Resolver.

---

### Navigation (Liste → Detail)

- Vorgänge-Phasenfilter zeigen Pipeline; Detail öffnet **ohne** sichtbare Pipeline-Position.
- KPI/Dashboard führen oft in Listen, nicht in „heute zu tun“.
- Nach Phasenwechsel (Auftrag→Rechnung) wirkt der alte Tab **leer** — ohne Copy „jetzt unter RE-…“.

**SOLL:** Liste und Detail teilen Lifecycle-Sprache; Detail zeigt Strip; Empty-States erklären Phasenwechsel.

---

### Neue Master-Todos (Welle 7 — Orientierung)

| ID | Impact | Aufwand | To-do |
|----|--------|---------|-------|
| **W7-01** | kritisch | M | Phasen-Strip dauerhaft im Detail-Kopf (Links zu AN/AG/AU/RE) |
| **W7-02** | hoch | M | Statusabhängiger Default-Tab + Primary (Auftrag/RE/Angebot) |
| **W7-03** | hoch | S | Tab-Rename: Aktivität / Projektphasen; `ACTIVITY_TAB_LABEL` nutzen |
| **W7-04** | mittel | M | Auftrag: Tab-Anzahl auf Kern reduzieren (Rest unter „Mehr“) |
| **W7-05** | mittel | S | RE-Wizard Labels Individualisieren/Paket → klare Verben |
| **W7-06** | mittel | M | Tab-Label-SoT: Spec `entity-detail-tabs.ts` in Clients nutzen |
| **W7-07** | hoch | M | Auftrag-Orphans: KundenUpdate / Baustopp-Nachtrag verdrahten oder entfernen |

Mapping: W7-03 überlappt W3-02 — W7-03 = Rename-Umsetzung, W3-02 behält Empty nach RE. W7-05 überlappt W6-04 — W7-05 = konkreter Wizard-Patch. W7-07 überlappt W5-01/W6-09 — Fokus ist „Code existiert, Screen nicht“.

---

### Neue Befunde F-70…

| Befund-ID | Befund | Master |
|-----------|--------|--------|
| F-70 | Phasen-Breadcrumb/Strip im Detail entfernt | W7-01 |
| F-71 | Auftrag ~10 Tabs, Geld/Vor-Ort nicht Default | W7-04 / W7-02 |
| F-72 | Auftrag Primary immer „Rechnung erstellen“ | W7-02 |
| F-73 | RE Default-Tab Stammdaten | W7-02 |
| F-74 | Als Nächstes nicht klickbar / ≠ Primary | W1-01 / W7-02 / W6-01 |
| F-75 | ACTIVITY_TAB_LABEL unbenutzt; Tab heißt Verlauf | W7-03 |
| F-76 | Historie nur spät im Tab, keine Kopf-Kette | W7-01 |
| F-77 | RE-Wizard Individualisieren/Paket | W7-05 / W6-04 |
| F-78 | Generische Tab-Namen Stammdaten/Details | W7-06 / W6-02 |
| F-79 | Partner zuweisen kein klarer Auftrag-Primary | W7-02 / W1-02 |
| F-80 | Vor-Ort/Abnahme-Alltag: Kitchen-Sink-Tab + **7-Step-Wizard** (UX kritisch) | W9-01…W9-06 / W7-02 |
| F-81 | Anrufen am Auftrag-Vorgang fehlt | W2-02 / W4-01 |
| F-82 | Spec `entity-detail-tabs.ts` kaum von Detail-Clients genutzt | W7-06 |
| F-83 | Kein `naechsterSchrittRechnung` | W7-02 / W6-01 |
| F-84 | Zwei Guidance-Systeme (Banner vs. NaechsteSchritteCard) | W6-01 / W7-02 |
| F-85 | Listen-Status „Gesendet Handwerker“ / Complete „Handwerker anfragen“ | W1-02 |
| F-86 | Portal-Menü: Handwerker-Link vs Partner-Link | W1-02 |
| F-87 | Rechnung-Tab „Details“ = Positionen; Naming vs Leistungen | W7-06 |
| F-88 | Kein Auftrag-Create-Wizard — Empty/Copy muss den Weg erklären | W7-06 / W5-01 |
| F-89 | `AuftragKundenUpdatePanel` nicht am Detail verdrahtet | W7-07 |
| F-90 | `AuftragDokumentationPanel` / Baustopp-Section orphaned | W7-07 / W6-09 |
| F-91 | `AuftragProjektSteuerung` / `AuftragDetailKopf` ohne Consumer | W7-07 |
| F-92 | Auftrag-Status ohne Staff-Picker (offen→in_arbeit→abnahme) | W7-02 |
| F-93 | Dokumente-Copy erwähnt Compliance-Tab, der nicht existiert | W7-06 |
| F-94 | Banner prüft nicht: Partner fehlt / kein Zahlplan / offene Abschläge | W7-02 / W6-01 |
| F-95 | Leistungen-Empty sagt „Handwerker anfragen“ | W1-02 |

---

## Mobile First vs. Desktop-on-Mobile · Markt · Vereinheitlichung

> **Deine Beobachtung trifft zu:** Mobile wirkt oft wie eine **geschrumpfte Desktop-App**, nicht wie ein Mobile-First-Arbeitsgerät. Im Audit standen bisher vor allem W4 (Chrome) und W6-06 (Breakpoints) — zu dünn für Design-System, Flow-Einheitlichkeit und „jeder MA kann’s sofort“.

### Diagnose: Was wir gebaut haben

| Schicht | IST | Wirkung |
|---------|-----|---------|
| Architektur | **Eine Komponenten-Basis** + CSS/Hook-Umschaltung — keine echte Mobile-App | Schnell, aber Desktop-Informationsdichte bleibt |
| Breakpoints | CSS-Shell **≤760**, JS/`useIsMobile`/`md` **≤767**, Reste **768/900** | **761–767px-Lücke**: BottomNav schon weg, Sticky-Bar noch „mobile“ (oder umgekehrt) |
| Shell | Sidebar↔BottomNav nur CSS; Detail = **BottomNav + sticky DetailActionsBar** | Doppel-Chrome, Daumen-Zone voll, Inhalt zu klein |
| Detail | Desktop: linke Section-Nav; mobil: **horizontale Scroll-Tabs** derselben ~8–10 Gruppen | Desktop-IA auf schmalem Screen — Orientierungsverlust |
| Listen-⋯ | Detail = ActionSheet; Listen = **Popover** (`MockEntityRowMenu`) | Zwei Interaktionsmuster für dieselbe Idee „Menü“ |
| Filter | Teils Sheet, teils Popover, teils Chips | Lernen pro Screen |
| Spec ungenutzt | `DetailResponsiveTabs` exportiert, **nirgends verwendet** | Geplante Mobile-Trennung nicht live |
| Master-Detail | `AppMasterDetailLayout` **splittet nicht mehr** (Kommentare veraltet) | Weder klassisches Desktop-Split noch klares Mobile-Stack |

**Kurz:** Nicht „kein Mobile“, sondern **Desktop-First mit Adaptionen**. Deshalb fühlt sich alles „ähnlich, aber mühsamer“ an.

---

### Markt: Wie normale CRMs Desktop vs. Mobile lösen

Orientierung an HubSpot / Pipedrive / Salesforce Mobile / typische Field-Service-Apps (kein Feature-Klon — **Prinzipien**):

| Prinzip | Markt-Standard | Bärenwald heute | SOLL |
|---------|----------------|-----------------|------|
| **Nav-Job** | Mobile: 3–5 Primärziele (Inbox, Deals, Kalender, Mehr). Desktop: Sidebar mit allem. | BottomNav ok (Dashboard/Vorgänge/FAB/Kalender/Mehr), aber Stamm tief hinter Mehr | Behalten; Mehr aufräumen (ein Partner) |
| **Detail-Chrome** | Auf Record-Detail: **App-Tabbar aus** oder nur Back; eine sticky Primary | BottomNav **bleibt** + CTA-Bar | **W4-01:** Detail = Back + eine Action-Bar |
| **Eine Primary** | Statusabhängiger großer Button | Oft falsche Primary (RE/Annehmen) | **W7-02** |
| **Actions** | Überall Bottom-Sheet / Overflow | Sheet nur Detail; Listen-Popover | **Alles touch:** ActionSheet |
| **Info-Dichte** | Mobile: 1–2 Meta-Zeilen, Rest hinter Tabs/„Mehr“ | Viele Tabs, Card-Meta dicht | Max. 2 Meta; Kern-Tabs |
| **Create** | Fullscreen flow oder Sheet mit Progress | Wizard fullscreen gut; Stammdaten Modal/Sheet gemischt | Regel beibehalten, Labels vereinheitlichen |
| **Desktop Power** | Keyboard, Hover, Split/Master-Detail optional | Split entfernt; Hover dünn | Desktop darf mehr (W5-02); Mobile nicht kopieren |
| **Guidance** | Ein „Next step“ oder Task-Queue | Banner + Resolver + Primary | Eine Stimme |

**Kernunterschied Markt:** Mobile ist ein **anderer Job** (kurz handeln, anrufen, Status, Foto) — Desktop ist **planen & bauen**. Wir zeigen mobil dieselben Tabs und denselben Chrome.

---

### SOLL-Zielbild (verständlich · funktional · ohne Lernaufwand)

#### 1. Ein Interaktions-Kit (Komponenten vereinheitlichen)

| Pattern | Eine Komponente | Regel |
|---------|-----------------|-------|
| ⋯-Menü | **ActionSheet** ≤768, Popover nur Desktop-Hover optional | Listen + Detail + Positionen |
| Filter | **MobileListFilterSheet** überall | Keine Popover-Filter mobil |
| Modal | Bottom-Sheet ≤768 / zentriert Desktop | Schon CSS — durchgängig nutzen |
| Detail-Tabs | `DetailShell` **oder** `DetailResponsiveTabs` — **eine** Spec | Max. 5 Kern-Tabs mobil; Rest „Mehr“ |
| Primary-Bar | Eine `DetailActionsBar` | Auf Detail: BottomNav hide |
| Empty / Banner / Toast | gemeinsame Primitives | gleiche Sprache |

**Breakpoint-SoT:** Ein Token z. B. `--bp-mobile: 768px` = CSS + `useIsMobile` + Tailwind `md`. **W6-06** hochziehen in Priorität (nicht nur Polish).

#### 2. Flows vereinheitlichen (eine Art zu arbeiten)

Heute zu viele Wege für denselben Job:

| Job | Wege heute | Ein Flow |
|-----|------------|----------|
| Etwas Neues anlegen | FAB / Wizard-Ende / Detail-Primary / ⋯ | FAB oder kontextuelle Primary — gleiche Steps |
| Versenden | Wizard-Ende / Detail (teilweise tot) / ⋯ Resend | Immer dasselbe Versand-Modal |
| Korrigieren | RE-Detail / (fehlt am Plan) | Rate + RE dieselbe Korrektur-Action |
| Partner anfragen | Wizard-Position / Detail-Scroll tot / Leistungen-⋯ | Ein Sheet „Partner anfragen“ |
| Abschließen | Secondary / Vor-Ort-Tab / Route mobil | Ein Abschluss-Flow |
| Menü-Aktionen | Popover vs Sheet vs Inline | Kit oben |

**Regel:** Pro Job **ein kanonischer Flow** (Screen-ID in Spec). Varianten nur, wenn Status es erzwingt — nicht pro Entity neu erfinden.

#### 3. Mobile-First Content (nicht Desktop schrumpfen)

1. **Erste Viewport Detail:** Titel · Status · eine Meta-Zeile · Primary · max. 4 Tabs (Übersicht, Arbeit, Geld, Aktivität).  
2. **Phasen-Strip** kompakt (W7-01) — Orientierung ohne Historie-Tab.  
3. **Desktop:** darf linke Nav, Hover, dichtere Tabellen, optional Split (W5-02).  
4. **My Work** auf Dashboard mobil = Hauptjob (W2-01) — nicht Charts first.

#### 4. Verständlichkeit für jeden Nutzer

- Labels aus SoT (`crm-labels` + `entity-detail-tabs`) — keine Entity-Sonderwörter ohne Grund.  
- Primary = nächster Schritt in Alltagssprache („An Kunden senden“, nicht „Finalisieren“).  
- Keine parallelen Guidance-Systeme (W6-01 / F-84).  
- Orphans löschen oder verdrahten (W7-07) — tote UI zerstört Vertrauen.

---

### Mobile-Situationen (Ergänzung Index)

| # | Situation | Fit | IST | SOLL |
|---|-----------|-----|-----|------|
| 32 | Detail mobil: zwei Leisten | Blockiert | BottomNav + CTA-Bar | Eine Leiste (W4-01) |
| 33 | Listen-⋯ mit Daumen | Reibung | Popover | ActionSheet (W4-01) |
| 34 | Breakpoint-Lücke 761–767 | Reibung | CSS≠JS | Ein BP (W6-06 / W8-01) |
| 35 | 10 Tabs horizontal scrollen | Reibung | Desktop-IA | 4 Kern + Mehr (W7-04) |
| 36 | Filter mal Sheet mal nicht | Reibung | Inkonsistent | Immer Sheet (W4-02) |
| 37 | Stamm/Partner unter Mehr | Reibung | Extra Tap + Doppelkachel | Eine Partner-Kachel (W4-02) |

---

### Neue Master-Todos (Welle 8 — Design-System & Flow-Einheit)

| ID | Impact | Aufwand | To-do |
|----|--------|---------|-------|
| **W8-01** | kritisch | M | Breakpoint-SoT: ein Wert 768 überall (CSS + Hook + Tailwind) |
| **W8-02** | hoch | M | Interaktions-Kit: ActionSheet/Filter/Modal-Regeln durchziehen |
| **W8-03** | hoch | L | Flow-Katalog: Versenden / Korrigieren / Partner / Abschluss — je ein kanonischer Flow |
| **W8-04** | mittel | M | Mobile Detail-IA: **5** Kern-Tabs (Übersicht·Leistungen·Zahlung·Vor Ort·Aktivität) + „Mehr“ (#3) |
| **W8-05** | mittel | S | Desktop ≠ Mobile Jobs dokumentieren (Field vs. Office) in DESIGN-Kurzspec |

Mapping: W8-01 ⊆ W6-06 (konkreter). W8-02 ⊆ W4-01/02. W8-03 verbindet W1/W3/W5/W7. W8-04 ⊆ W7-04.

### Neue Befunde F-96…

| ID | Befund | Master |
|----|--------|--------|
| F-96 | Mobile = Desktop-First-Adaption, nicht Mobile-First | W8-04 / W4-01 |
| F-97 | Breakpoint-Lücke 761–767 (CSS 760 vs JS 767) | W8-01 / W6-06 |
| F-98 | Listen-Popover vs Detail-ActionSheet | W8-02 / W4-01 |
| F-99 | `DetailResponsiveTabs` ungenutzt | W8-04 |
| F-100 | Master-Detail-Split entfernt, Kommentare veraltet | W5-02 / W8-05 |
| F-101 | Zu viele parallele Flows für denselben Job | W8-03 |
| F-102 | Mobile Detail-IA = alle Desktop-Tabs horizontal | W8-04 / W7-04 |
| F-103 | Kein zentrales BREAKPOINTS-Modul / Token | W8-01 |


---

## Master-To-dos (vollständig)

**38 Einträge** (… + W7-01…07 + W8-01…05). Sortierung: Welle → Impact → Aufwand.
Früher war Welle 6 fälschlich als `W6-*` zusammengefasst — hier wieder einzeln.

### Übersicht

| ID | Welle | Art | Impact | Aufwand | To-do | Situationen |
|----|-------|-----|--------|---------|-------|-------------|
| DONE-01 | 0 | Funktion | kritisch | S | Abschlagsplan: Validation Summe ≤ VK / ≤100 % | 9 |
| W1-03 | 1 | Funktion | kritisch | S | UI Angebot ablehnen (+ kurzer Grund) | 6 |
| W1-04 | 1 | Funktion | kritisch | S | Auftrag stornieren im UI | 8 |
| W1-01 | 1 | Gemischt | kritisch | M | Angebot-Detail: Erstversand + Primary/Banner angleichen | 3, 5 |
| W1-02 | 1 | Gemischt | kritisch | M | Partner-Anfrage am Angebot-Detail + Naming Partner | 4 |
| ZP-01 | 1 | Funktion | kritisch | M | Schluss/Abschlag: keine Doppelabrechnung; Warnung Σ RE > VK | 10, 11 |
| W2-03 | 2 | Gemischt | hoch | S | Lifecycle in URL + ehrliche Back-Links | 14 |
| W2-01 | 2 | Gemischt | hoch | M | Tages-Inbox / My Work auf Dashboard | 2 |
| W2-02 | 2 | Gemischt | hoch | M | Nachgefasst + Zone „Warten auf Kunde“ | 6, 7 |
| W3-02 | 3 | Copy | hoch | S | Tabs Aktivität / Projektphasen + Empty nach RE | 14 |
| W3-01 | 3 | Funktion | hoch | M | Kunde-Vorgänge-Tab + Duplikat-Gate | 14 |
| W3-03 | 3 | Gemischt | mittel | S | Zahlplan-Resend / Bestand / HV-Copy | 12, 13 |
| W4-01 | 4 | UI/UX | hoch | M | Eine Action-Bar; Listen-⋯ ActionSheet | 15 |
| W4-02 | 4 | Gemischt | mittel | S | Mehr: eine Partner-Kachel; Filter als Sheet | 15 |
| W5-01 | 5 | Funktion | mittel | M | Nachtrag-CTA; No-Show-Hinweis; Gutschrift-Hilfe | 10, 12 |
| W5-02 | 5 | UI/UX | niedrig | L | Desktop Split / Hover-Actions / optional Board | Komfort |
| W6-01 | 6 | Copy | mittel | S | Resolver + Banner + Badge entflechten | Querbefund Guidance |
| W6-02 | 6 | Copy | mittel | S | Stammdaten→Kunde & Objekt; Details→Positionen | Naming Tabs |
| W6-05 | 6 | UI/UX | mittel | M | ⋯ gruppieren; Inline Gesendet; Status-Farbmatrix | ⋯ / Status |
| W6-06 | 6 | UI/UX | mittel | M | Breakpoints / Thumb-Padding / Row-Dichte / Modal-vs-Route | Mobile/Desktop Shell |
| W6-08 | 6 | Funktion | mittel | M | Suche um Angebote/Rechnungen erweitern | 14 |
| W6-09 | 6 | Funktion | mittel | L | Voll-Merge; Bounce; Bulk; Handoff; Baustopp; Mail→Anfrage | Backlog Epics |
| W6-03 | 6 | Copy | niedrig | S | Admin Login / KI / Notizen·0 / Fotos-Empty / Dev-Empty | Copy-Noise |
| W6-04 | 6 | Copy | niedrig | S | Wizard-Hilfetexte; RE Individualisieren/Paket; Ohne-Ersatz-Copy | Wizard/RE Copy |
| W6-10 | 6 | UI/UX | niedrig | S | Kunden optional in BottomNav | 15 optional |
| W6-07 | 6 | UI/UX | niedrig | M | Optimistic UI; A11y; Onboarding-Empty; Swipe optional | Polish |
| W7-01 | 7 | UI/UX | kritisch | M | Phasen-Strip dauerhaft im Detail-Kopf | 25, 14 |
| W7-02 | 7 | Gemischt | hoch | M | Statusabhängiger Default-Tab + Primary | 16–20, 3 |
| W7-03 | 7 | Copy | hoch | S | Tabs Aktivität / Projektphasen | 14, 25 |
| W7-04 | 7 | UI/UX | mittel | M | Auftrag-Tabs auf Kern reduzieren | 16–20 |
| W7-07 | 7 | Funktion | hoch | M | Auftrag-Orphans verdrahten oder löschen | 28, 29 |
| W7-05 | 7 | Copy | mittel | S | RE-Wizard Labels klar | Wizard |
| W7-06 | 7 | Copy | mittel | M | Tab-Label-SoT Spec in Clients | alle Details |

### Detail: IST · SOLL · Umsetzung

#### Welle 0 · Erledigt

##### `DONE-01` — Abschlagsplan: Validation Summe ≤ VK / ≤100 %

- **Art / Impact / Aufwand:** Funktion · kritisch · S
- **Schaltet frei:** Kein Plan mit Abschlägen > Auftragssumme
- **IST:** Auftrag-Modal: Speichern nur bei 100 %. ZahlungsplanEditor (Angebot/RE-Wizard) + Server: kein Deckel → 60 %+60 %+Rest möglich.
- **SOLL:** Jeder Speichern-Pfad prüft ≤100 % bzw. Beträge ≤ VK netto; UI zeigt Fehler.
- **Umsetzung:** Erledigt: validateZahlungsplanGegenGesamt + saveAuftragZahlungsplan + Warnung im ZahlungsplanEditor.
- **Situationen:** 9

#### Welle 1 · Kette freischalten

##### `W1-03` — UI Angebot ablehnen (+ kurzer Grund)

- **Art / Impact / Aufwand:** Funktion · kritisch · S
- **Schaltet frei:** Kunde-Nein → sauberer Endzustand
- **IST:** Status „abgelehnt“ existiert/Anzeige; kein Staff-Button. Pipeline bleibt oft „offen“.
- **SOLL:** ⋯ oder Zone „Warten“: „Ablehnen“ → Modal Grund (Dropdown) → status_einfach=abgelehnt + Timeline-Event → Lifecycle Erledigt.
- **Umsetzung:** entity-menu onReject; Server-Action setAngebotAbgelehnt; Primary bei gesendet ergänzen durch Secondary „Ablehnen“; naechster-Schritt null bei abgelehnt (schon).
- **Situationen:** 6

##### `W1-04` — Auftrag stornieren im UI

- **Art / Impact / Aufwand:** Funktion · kritisch · S
- **Schaltet frei:** Abbruch nach Start ohne Löschen
- **IST:** Status storniert in DB/Typen; Steuerungs-UI orphan/fehlt. MA droht „Löschen“.
- **SOLL:** ⋯ „Auftrag stornieren“ → Confirm + Pflichtgrund → status=storniert, Lifecycle Erledigt, Historie-Event.
- **Umsetzung:** buildEntityMenu onCancel; Action storniereAuftrag; Gate wenn RE bezahlt (Hinweis/Block); Banner „Storniert“.
- **Situationen:** 8

##### `W1-01` — Angebot-Detail: Erstversand + Primary/Banner angleichen

- **Art / Impact / Aufwand:** Gemischt · kritisch · M
- **Schaltet frei:** Happy-Path Mail am Detail; Copy-Konflikt weg
- **IST:** mode=kunde blendet Versand-Card aus; kundeVersandOpen nie true; Primary oft „Annehmen“; Banner sagt „versenden oder annehmen“; ⋯-Versand erst nach erstem Versand.
- **SOLL:** Entwurf: Primary „An Kunden senden“ öffnet Modal. Nach Versand: Primary „Annehmen“, Secondary Nachfassen. Banner-Text = Primary-Label oder Banner weg.
- **Umsetzung:** AngebotDetailPageClient primaryAction umbauen; setKundeVersandOpen(true); AngebotVersandSection mode full oder CTA außerhalb; naechsterSchrittAngebot an Primary koppeln; Menü onSend auch bei Entwurf.
- **Situationen:** 3, 5

##### `W1-02` — Partner-Anfrage am Angebot-Detail + Naming Partner

- **Art / Impact / Aufwand:** Gemischt · kritisch · M
- **Schaltet frei:** Multi-Gewerk Partner-First
- **IST:** Primary „Handwerker anfragen“ scrollt zu #angebot-versand-handwerker; Section oft nicht gerendert (mode kunde). Labels Handwerker vs Partner gemischt.
- **SOLL:** Partner-Block sichtbar am Detail; Primary „Partner anfragen“ / „Einreichung prüfen“; Status-Texte „Partner…“.
- **Umsetzung:** AngebotHandwerkerPartnerSection oder VersandSection mode=handwerker einbinden; IDs setzen; Strings in entity-menu/primary/status auf Partner; openHandwerkerAnfragen → echtes Modal/Section.
- **Situationen:** 4

##### `ZP-01` — Schluss/Abschlag: keine Doppelabrechnung; Warnung Σ RE > VK

- **Art / Impact / Aufwand:** Funktion · kritisch · M
- **Schaltet frei:** Schluss = Restgeld; kein Abschlag+Schluss > VK
- **IST:** Abschlag ohne position_ids = Pauschale %-Plan. Schluss (Rest) ohne belegte Positionen am Abschlag zieht oft alle LV-Positionen. bereitsGestellt oft nur Text. Plan-%-Summe 100 % verhindert Doppelabrechnung nicht.
- **SOLL:** Schluss-Betrag = max(0, VK − Summe gestellter/bezahlter Abschläge) ODER Pflicht-Leistungszuordnung / alles pauschal. UI-Warnung wenn Σ RE-Brutto > VK (± Toleranz).
- **Umsetzung:** zahlungsplan.ts berechneSchluss/Rest; Gate in wizard-actions + RE erstellen; Warnung in AuftragZahlungsplanSection / Wizard.
- **Situationen:** 10, 11

#### Welle 2 · Alltag nach Versand

##### `W2-03` — Lifecycle in URL + ehrliche Back-Links

- **Art / Impact / Aufwand:** Gemischt · hoch · S
- **Schaltet frei:** Filter bleibt; kein „Suchergebnisse“-Fake
- **IST:** Offen/Erledigt nur Client-State; Back-Default „Zurück zu den Suchergebnissen“; KPI ohne lifecycle.
- **SOLL:** ?lifecycle=offen|erledigt in /vorgaenge; KPI-Links setzen beides; Back „Zurück zu Vorgängen“ / „… offenen Angeboten“.
- **Umsetzung:** VorgaengeListeClient URL-Sync; EntityDetailLayout crumbBackHref kontextuell; Dashboard-Links erweitern.
- **Situationen:** 14

##### `W2-01` — Tages-Inbox / My Work auf Dashboard

- **Art / Impact / Aufwand:** Gemischt · hoch · M
- **Schaltet frei:** Morgens Arbeitsliste statt nur KPIs
- **IST:** Dashboard = Greeting + KPIs + Funnel/Charts/Ranking zuerst.
- **SOLL:** Erste Viewport: 5–8 Arbeitszeilen (WV fällig, Angebote ohne Antwort >X Tage, RE überfällig). Charts eine Scroll-Länge tiefer.
- **Umsetzung:** Neue Query/Loader work-items; Dashboard-Komponente Arbeitsliste; Funnel hinter „Mehr Kennzahlen“ oder weiter unten.
- **Situationen:** 2

##### `W2-02` — Nachgefasst + Zone „Warten auf Kunde“

- **Art / Impact / Aufwand:** Gemischt · hoch · M
- **Schaltet frei:** Nachfassen loggen; 3 klare Actions
- **IST:** Bei gesendet nur Primary Annehmen; kein Call-Log; Banner „warten oder annehmen“.
- **SOLL:** Card: Anrufen | Nochmal senden | Ablehnen + „Nachgefasst am …“ / Reminder-Datum.
- **Umsetzung:** Timeline-Event nachgefasst; optional Spalte/wiedervorlage_am; UI-Block unter Header wenn status gesendet/abgelaufen.
- **Situationen:** 6, 7

#### Welle 3 · Orientierung & Geld

##### `W3-02` — Tabs Aktivität / Projektphasen + Empty nach RE

- **Art / Impact / Aufwand:** Copy · hoch · S
- **Schaltet frei:** Kein Verwechseln Historie/Verlauf; Auftrag nicht „weg“
- **IST:** Tabs „Verlauf“ + „Historie“; nach Phasen-Gewinn RE ist Auftrag-Tab leer ohne Erklärung.
- **SOLL:** „Aktivität“ + „Projektphasen“; Empty: „Aktuell unter Rechnung RE-…“ mit Link.
- **Umsetzung:** entity-detail-tabs Labels; ProjektHistorieTab Titel; Vorgänge-Liste/Detail Empty-State mit resolve-vorgang Link.
- **Situationen:** 14

##### `W3-01` — Kunde-Vorgänge-Tab + Duplikat-Gate

- **Art / Impact / Aufwand:** Funktion · hoch · M
- **Schaltet frei:** Alle Jobs einer Kundin; weniger Doppelstämme
- **IST:** OP-8d: Tab unvollständig; Duplikat-Banner, speichert trotzdem neu.
- **SOLL:** VorgaengeListe mit restrictKunde; bei gleichem Tel/Mail Speichern blocken oder „Bestehenden öffnen“.
- **Umsetzung:** loadVorgaengeListe Filter; Kunde-Create Action Gate; CTA zum bestehenden Kunden.
- **Situationen:** 14

##### `W3-03` — Zahlplan-Resend / Bestand / HV-Copy

- **Art / Impact / Aufwand:** Gemischt · mittel · S
- **Schaltet frei:** Keine toten Menüpunkte; verständliche Chips
- **IST:** Row „Nochmal versenden“ tot (OP-ZAHLPLAN-01); Chip „Bestand“; „Warte auf HV“.
- **SOLL:** Resend → bestehende RE-Mail-Action ODER Menüpunkt weg; Chip „Wiederkehrend“; „Warte auf Hausverwaltung“.
- **Umsetzung:** AuftragZahlungsplanSection verdrahten oder remove; vorgang-labels; fachbegriffe/Chips.
- **Situationen:** 12, 13

#### Welle 4 · Mobile Chrome

##### `W4-01` — Eine Action-Bar; Listen-⋯ ActionSheet

- **Art / Impact / Aufwand:** UI/UX · hoch · M
- **Schaltet frei:** Kein Doppel-Chrome; touchfähige Menüs
- **IST:** BottomNav + DetailActionsBar; Listen MockEntityRowMenu = Popover.
- **SOLL:** Auf Entity-Detail BottomNav hide/nur Back; Listen-⋯ = ActionSheet wie Detail.
- **Umsetzung:** DashboardShell/Detail route class; DetailActionsBar safe-area; MockEntityRowMenu → ActionsMenu Sheet mobil.
- **Situationen:** 15

##### `W4-02` — Mehr: eine Partner-Kachel; Filter als Sheet

- **Art / Impact / Aufwand:** Gemischt · mittel · S
- **Schaltet frei:** Ein Partner-Begriff mobil
- **IST:** MEHR_TILE_NAV: Partner + Netzwerk; Filter teils Popover.
- **SOLL:** Nur Partner (Netzwerk-Einträge unter Partner oder Kategorie); Filter Full-Sheet überall.
- **Umsetzung:** nav-config MEHR_TILE_NAV; /partner Deep-Link unter Partner-UI oder Redirect; Listbar → MobileListFilterSheet.
- **Situationen:** 15

#### Welle 5 · Änderung & Polish

##### `W5-01` — Nachtrag-CTA; No-Show-Hinweis; Gutschrift-Hilfe

- **Art / Impact / Aufwand:** Funktion · mittel · M
- **Schaltet frei:** Mehrleistung & Korrektur verständlich
- **IST:** Nachtrag oft nur ⋯ + Vertrag-Gate Toast; No-Show fehlt; Gutschrift vs Korrigieren ohne Erklärung.
- **SOLL:** CTA „Mehrleistung/Nachtrag“; No-Show als Status oder Termin-Hinweis; Sheet „Was passiert?“ bei RE-Korrektur.
- **Umsetzung:** Nachtrag-Section verdrahten oder Copy am Gate; Anfrage-Status oder Kalender-Flag; Modal-Copy in RechnungDetailClient.
- **Situationen:** 10, 12

##### `W5-02` — Desktop Split / Hover-Actions / optional Board

- **Art / Impact / Aufwand:** UI/UX · niedrig · L
- **Schaltet frei:** Komfort, kein Fach-Blocker
- **IST:** Liste ODER Voll-Detail; keine Hover-Row-Actions; kein Kanban.
- **SOLL:** ≥1280px optional Split; Hover Anrufen/Mail; Board nur Phase Angebot optional.
- **Umsetzung:** AppMasterDetailLayout Split-Mode; Row-hover toolbar; neues Board-View hinter Toggle.
- **Situationen:** Komfort

#### Welle 6 · Backlog Copy

##### `W6-01` — Resolver + Banner + Badge entflechten

- **Art / Impact / Aufwand:** Copy · mittel · S
- **Schaltet frei:** Eine Handlungsstimme
- **IST:** Resolver „Aktion erforderlich“, Nächster-Schritt-Banner, Status-Badge parallel.
- **SOLL:** Badge immer; Banner nur Blockade; Resolver nur Notfall/Überfällig.
- **Umsetzung:** NaechsterSchrittBanner conditional; VorgangResolverBanner Scope verengen.
- **Situationen:** Querbefund Guidance

##### `W6-02` — Stammdaten→Kunde & Objekt; Details→Positionen

- **Art / Impact / Aufwand:** Copy · mittel · S
- **Schaltet frei:** Tabs selbsterklärend
- **IST:** Generische Tab-Labels Stammdaten / Details.
- **SOLL:** Inhaltliche Labels pro Entity.
- **Umsetzung:** entity-detail-tabs.ts Labels ändern.
- **Situationen:** Naming Tabs

##### `W6-05` — ⋯ gruppieren; Inline Gesendet; Status-Farbmatrix

- **Art / Impact / Aufwand:** UI/UX · mittel · M
- **Schaltet frei:** Menü & Feedback klarer
- **IST:** Flaches ⋯-Menü; nur Toast; Badges inkonsistent.
- **SOLL:** Gruppen Komm/Dok/Status/Gefahr; Kopf „Gesendet an…“; eine Farbmatrix.
- **Umsetzung:** entity-menu Sep+Gruppen; DetailHead Statuszeile; Token-Doku + Audit.
- **Situationen:** ⋯ / Status

##### `W6-06` — Breakpoints / Thumb-Padding / Row-Dichte / Modal-vs-Route

- **Art / Impact / Aufwand:** UI/UX · mittel · M
- **Schaltet frei:** Konsistente Mobile-Shell
- **IST:** 760/767/768 gemischt; Pagination unter Bars; Desktop-Dichte mobil; Modal≠Route.
- **SOLL:** Ein Breakpoint; padding-bottom sicher; max. 2 Meta-Zeilen; Regel dokumentiert.
- **Umsetzung:** CSS + useIsMobile angleichen; list-pagination; .vg-row mobil; Kurz-Doku in DESIGN.
- **Situationen:** Mobile/Desktop Shell

##### `W6-08` — Suche um Angebote/Rechnungen erweitern

- **Art / Impact / Aufwand:** Funktion · mittel · M
- **Schaltet frei:** Alte Nr. finden
- **IST:** Suche deckt Anfragen/Kunden/Aufträge/Partner ab — AN/RE lückenhaft.
- **SOLL:** Treffergruppen inkl. Angebote & Rechnungen mit Phase-Badge.
- **Umsetzung:** api/crm/suche erweitern; GlobalSearch UI Gruppen.
- **Situationen:** 14

##### `W6-09` — Voll-Merge; Bounce; Bulk; Handoff; Baustopp; Mail→Anfrage

- **Art / Impact / Aufwand:** Funktion · mittel · L
- **Schaltet frei:** Schwere Ops-Cases
- **IST:** Alles fehlt oder nur API/Notiz-Improvisation.
- **SOLL:** Eigene Epics je Thema — nicht in Welle 1–5 mischen.
- **Umsetzung:** Pro Epic spezifizieren; Merge zuerst wenn Datenqualität brennt; Rest backlog.
- **Situationen:** Backlog Epics

##### `W6-03` — Admin Login / KI / Notizen·0 / Fotos-Empty / Dev-Empty

- **Art / Impact / Aufwand:** Copy · niedrig · S
- **Schaltet frei:** Keine Dev-/Jargon-Strings im Alltag
- **IST:** „Admin Login“, „KI Intelligence“, „Notizen · 0“, Mieter-Empty, SQL-Empty.
- **SOLL:** Rollenklare Labels; Notizen ohne ·0; Staff-Empty ohne SQL.
- **Umsetzung:** entity-menu Labels; Mehr-Tiles; MockCard titles; MockEmpty hints.
- **Situationen:** Copy-Noise

##### `W6-04` — Wizard-Hilfetexte; RE Individualisieren/Paket; Ohne-Ersatz-Copy

- **Art / Impact / Aufwand:** Copy · niedrig · S
- **Schaltet frei:** Weniger Wizard-Rückfragen
- **IST:** Steps „Individualisieren“/„Paket“ unklar; Ohne Ersatz ohne Kontext.
- **SOLL:** „Texte & Empfänger“ / „Abschlag oder Schluss“; Kurzhilfe Storno-Arten.
- **Umsetzung:** Wizard-Step-Titel; Modal-Copy Rechnung.
- **Situationen:** Wizard/RE Copy

##### `W6-10` — Kunden optional in BottomNav

- **Art / Impact / Aufwand:** UI/UX · niedrig · S
- **Schaltet frei:** Ein Tap weniger
- **IST:** Kunden nur unter Mehr.
- **SOLL:** Nur wenn Nutzung zeigt Mehr zu tief — sonst lassen.
- **Umsetzung:** BOTTOM_NAV_ITEMS tauschen/erweitern nach Messung.
- **Situationen:** 15 optional

##### `W6-07` — Optimistic UI; A11y; Onboarding-Empty; Swipe optional

- **Art / Impact / Aufwand:** UI/UX · niedrig · M
- **Schaltet frei:** Speed & Zugang
- **IST:** Warten auf Server; Tap-Targets gemischt; Empty ohne Checklist; keine Gesten.
- **SOLL:** Annehmen/Bezahlt sofort UI; 44px+focus-visible; 3-Schritt-Checklist; optional Swipe Anrufen.
- **Umsetzung:** useOptimistic/transitions; CSS; MockEmpty CTA-Liste; optional swipe lib.
- **Situationen:** Polish


#### Welle 7 · Detail-Orientierung (neu)

##### `W7-01` — Phasen-Strip dauerhaft im Detail-Kopf

- **Art / Impact / Aufwand:** UI/UX · kritisch · M
- **Schaltet frei:** „Wo bin ich in der Pipeline?“ ohne Historie-Tab
- **IST:** `EntityDetailLayout` rendert `projektKontext` nicht mehr (deprecated). Historie nur als Tab.
- **SOLL:** Strip Anfrage·Angebot·Auftrag·Rechnung mit Links; aktiver Glied markiert.
- **Umsetzung:** `ProjektKette` oder `VorgangPhasenDiagramm` wieder in Layout unter `DetailHead`; Props nicht mehr ignorieren.
- **Situationen:** 25, 14

##### `W7-02` — Statusabhängiger Default-Tab + Primary

- **Art / Impact / Aufwand:** Gemischt · hoch · M
- **Schaltet frei:** Richtige Infos und CTA im richtigen Moment
- **IST:** Auftrag Default Auftragdetails + Primary Rechnung; RE Default Stammdaten; Angebot oft Annehmen.
- **SOLL:** Matrix Status→Default-Tab→Primary (z. B. Auftrag in_arbeit → Vor Ort oder Leistungen; Plan offen → Zahlung; RE gesendet → Bezahlt/Erinnerung).
- **Umsetzung:** Resolver-Funktion pro Entity; `AuftragDetailClient` / `RechnungDetailClient` / Angebot Primary umbauen.
- **Situationen:** 16–20, 3

##### `W7-03` — Tabs Aktivität / Projektphasen

- **IST:** Tabs „Verlauf“ + „Historie“; `ACTIVITY_TAB_LABEL` unbenutzt.
- **SOLL:** „Aktivität“ + „Projektphasen“ überall.
- **Umsetzung:** `ACTIVITY_SECTIONS.verlauf` oder Label auf `ACTIVITY_TAB_LABEL`; Historie-Label ändern (eng mit W3-02).

##### `W7-04` — Auftrag-Tabs auf Kern

- **IST:** ~10 Tabs.
- **SOLL:** Kern: Übersicht, Leistungen, Zahlung, Vor Ort, Aktivität; Rest unter „Mehr/Dokumente“.

##### `W7-05` — RE-Wizard Labels

- **IST:** Individualisieren / Paket.
- **SOLL:** Texte & Empfänger / Anhänge & Typ / Prüfen & Senden (eng W6-04).

##### `W7-06` — Tab-Label-SoT

- **IST:** Stammdaten/Details/Projektinfos/Auftragdetails gemischt. Spec in `entity-detail/entity-detail-tabs.ts` (`ENTITY_DETAIL_TAB_LABELS`, inkl. Aktivität) wird von den Detail-Clients **kaum** genutzt — Labels hardcodiert.
- **SOLL:** Alle Detail-Tabs nur noch über Spec/SoT; erste Tabs inhaltlich benannt; RE „Details“ → „Leistungen“/„Positionen“.
- **Umsetzung:** Detail-Clients auf `entityDetailTabLabel` umstellen; Duplikate in `crm-labels` angleichen.

##### `W7-07` — Auftrag-Orphans verdrahten oder löschen

- **Art / Impact / Aufwand:** Funktion · hoch · M
- **Schaltet frei:** Kunden-Update, Baustopp/Nachtrag-Doku als echte Alltagspfade
- **IST:** `AuftragKundenUpdatePanel`, `AuftragDokumentationPanel` (+ Baustopp), `AuftragProjektSteuerung` / `AuftragDetailKopf` existieren ohne Import in `AuftragDetailClient`.
- **SOLL:** Entweder unter Vor Ort / Dokumente / Kopf einbinden **oder** Code entfernen (kein toter Pfad).
- **Umsetzung:** Entscheidung Produkt → Wire in `AuftragDetailClient` Tab `ausfuehrung`/`dokumente` oder Delete; Deep-Links beibehalten.
- **Situationen:** 28, 29



#### Welle 8 · Design-System & Flow-Einheit (neu)

##### `W8-01` — Breakpoint-SoT
- **IST:** CSS 760, JS/Tailwind 767/768, Lücke 761–767.
- **SOLL:** Ein Wert (768); `--bp-mobile` + `useIsMobile` + `md`.
- **Umsetzung:** `mock-design-system.css` + Hook angleichen; Kurztest 760/768/900.

##### `W8-02` — Interaktions-Kit
- **IST:** Listen-Popover, Detail-Sheet, Filter gemischt.
- **SOLL:** Mobile immer Sheet für ⋯ und Filter; eine Modal→Sheet-Regel.
- **Umsetzung:** `MockEntityRowMenu` → ActionSheet mobil; Filter nur `MobileListFilterSheet`.

##### `W8-03` — Flow-Katalog
- **IST:** Versenden/Partner/Korrigieren/Abschluss je Entity anders.
- **SOLL:** Pro Job ein kanonischer Flow (Spec-Tabelle) — UI nur wiederverwendet.
- **Umsetzung:** Doc-Abschnitt + Refactor Einstiege auf Shared Sheets/Modals.

##### `W8-04` — Mobile Detail-IA
- **IST:** Alle Desktop-Sections als Horizontal-Tabs; `DetailResponsiveTabs` tot.
- **SOLL:** 4 Kern-Tabs + Mehr; oder Spec-Komponente live schalten.
- **Umsetzung:** Entscheidung nutzen vs. löschen; Auftrag/Angebot/RE angleichen.

##### `W8-05` — Desktop ≠ Mobile Jobs
- **IST:** Field vs. Office Jobs vermischt; Features 1:1 auf Mobile gespiegelt.
- **SOLL:** Eine Seite in DESIGN: Mobile = kurz handeln; Desktop = planen/bauen. Features nicht 1:1 spiegeln.
- **Umsetzung:** Kurzspec in DESIGN_KONZEPT; Tab-SoT + Default-Resolver (eng W7-02 / W7-06).

#### Welle 9 · Abnahme / Vor-Ort UX (Juli 2026)

##### `W9-01` — Surfaces konsolidieren
- **IST:** Wizard + Inline + FillFlow + Card + VorOrt-Stack.
- **SOLL:** Ein Editor (Wizard) + eine Liste; Rest entfernen oder mergen.
- **Situationen:** 38–40

##### `W9-02` — Wizard ≤3 Steps, Checkliste first
- **IST:** 7 Steps Meta→…→PDF.
- **SOLL:** Checkliste & Ergebnis · Angaben · Prüfen & PDF.
- **Situationen:** 38, 39, 41

##### `W9-03` — Vor-Ort Segmented Control
- **IST:** Alles auf einer Scrollseite.
- **SOLL:** Abnahme | Tagebuch | Abschluss.
- **Situationen:** 18, 40

##### `W9-04` — Visuelle Shell + große Status-Controls
- **IST:** Form-Inputs + Mock-UI gemischt.
- **SOLL:** Angebot-Wizard-Shell; daumenfreundliche OK/Mangel.
- **Situationen:** 38, 41

##### `W9-05` — PDF-Preview
- **IST:** Überraschungen erst nach Download.
- **SOLL:** Preview-Step vor Finalisieren.
- **Situationen:** 42

##### `W9-06` — Primary bei Status Abnahme
- **IST:** oft „Rechnung erstellen“.
- **SOLL:** „Abnahme starten / fortsetzen“ (eng W7-02).
- **Situationen:** 19

---

### Empfohlene Reihenfolge

1. **ZP-01** (Geld)
2. **W7-01** (Phasen-Strip — Orientierung) parallel zu W1 wo möglich
3. **W1-01 + W1-02** + **W7-02** Primary/Default-Tab
4. **W1-03, W1-04**
5. **W7-03** + **W3-02** (Aktivität/Projektphasen + Empty)
6. **W2-01 … W2-03**
7. **W3-01, W3-03**
8. **W8-01** Breakpoints + **W4-01/02** Chrome/Kit (ein PR-Paket Mobile)
9. **W8-02/04** + **W7-04** Detail-IA mobil
10. **W7-07** Orphans · **W7-05/06** · **W8-03** Flow-Katalog
11. **W9-01 … W9-06** Abnahme / Vor-Ort UX
12. **W5** · **W6-*** · **W8-05** Spec

### Anhang: Journey-Fixes (P0–P2, ursprüngliche Liste)

Diese Fixes sind in die Master-IDs gemappt — hier zur Nachvollziehbarkeit:

| Prio | Fix | → Master |
|------|-----|----------|
| P0 | Angebot-Detail: Erstversand-Button + Modal | W1-01 |
| P0 | Partner-Anfrage am Angebot-Detail verdrahten | W1-02 |
| P0 | Primary und „Als Nächstes“ angleichen | W1-01 |
| P0 | UI Angebot ablehnen + kurzer Grund | W1-03 |
| P0 | Auftrag stornieren im UI | W1-04 |
| P0 | Schluss/Abschlag Doppelabrechnung (später ergänzt) | ZP-01 |
| P1 | Zahlplan „Nochmal versenden“ fixen oder entfernen | W3-03 |
| P1 | Aktion „Nachgefasst“ (Anruf/Notiz + Reminder) | W2-02 |
| P1 | No-Show abbilden oder klarer Hinweis | W5-01 |
| P1 | Tages-Inbox: WV + stille Angebote + überfällige REs | W2-01 |
| P1 | Lifecycle in URL + KPI-Links | W2-03 |
| P1 | Nachtrag klar verdrahten | W5-01 |
| P1 | Historie → „Projektphasen“ | W3-02 |
| P1 | Kunde-Vorgänge-Tab verdrahten | W3-01 |
| P1 | Duplikat: Merge oder Speichern blocken | W3-01 |
| P1 | Mehr: Netzwerk in Partner ziehen | W4-02 |
| P1 | Listen-⋯ als ActionSheet | W4-01 |
| P1 | Filter als Sheet; Lifecycle sichtbar | W4-02 / W2-03 |
| P2 | Kurzhilfe Gutschrift vs. Korrigieren | W5-01 |
| P2 | Label „Partner ersetzen“ | W1-02 |
| P2 | Copy: Ohne Ersatz vs. Korrigieren | W6-04 |
| P2 | Chip Bestand → Wiederkehrend | W3-03 |
| P2 | Suche um AN/RE erweitern | W6-08 |
| P2 | Breakpoints vereinheitlichen | W6-06 |
| P2 | Doppel-Chrome / Padding | W4-01 / W6-06 |

### Verwandte offene Ops (Code-Doku)

| OP | Thema | Master |
|----|-------|--------|
| OP-8d-01 | Kunde-Vorgänge-Tab | W3-01 |
| OP-8d-02 | Partner-Vorgänge-Tab | W3-01 / W6-09 |
| OP-ZAHLPLAN-01 | Row „Nochmal versenden“ | W3-03 |
| OP-9c-BULK | Bulk-Aktionen | W6-09 |

---

## Befund-Matrix (alle ursprünglichen Findings)

**Ehrlich:** Die Master-IDs (DONE/ZP/W1–W6) sind **Sammel-Tickets**. Darunter stecken die konkreten Einzelbefunde aus dem Alltag-Audit (ursprünglich ~65 in der Abdeckungs-Matrix).

Diese Tabelle listet **alle 69 Befunde** einzeln — damit nichts „unter W6-*“ verloren geht.

| # | Befund | Art | Master-ID | Welle | Note |
|---|--------|-----|-----------|-------|------|
| 1 | Abschlagsplan Summe ≤ VK | Funktion | `DONE-01` | 0 | Erledigt |
| 2 | Anfrage-Banner redundant kürzen | Copy | `W1-01` | 1 | Gleiches Muster wie Angebot |
| 3 | Angebot Erstversand am Detail | Funktion | `W1-01` | 1 | Mit Primary/Banner |
| 4 | Banner „Als Nächstes“ nur bei Blockade (Angebot) | Copy | `W1-01` | 1 |  |
| 5 | Primary = nächster Schritt / Banner angleichen | UI/UX | `W1-01` | 1 | Gebündelt mit Versand |
| 6 | Visuelle Hierarchie Detail-Kopf | UI/UX | `W1-01` | 1 | Folgt aus Primary-Klarheit |
| 7 | Partner überall statt Handwerker (Angebot) | Copy | `W1-02` | 1 | Rest-Labels in W4-02/W6 |
| 8 | Partner-Anfrage am Angebot-Detail | Funktion | `W1-02` | 1 |  |
| 9 | Angebot ablehnen | Funktion | `W1-03` | 1 |  |
| 10 | Auftrag stornieren | Funktion | `W1-04` | 1 |  |
| 11 | Abschlag + Schluss Doppelabrechnung (> VK) | Funktion | `ZP-01` | 1 | Später gefunden: Pauschal-Abschlag + Positions-Schluss summiert > VK. Nicht in der ursprünglichen 65er-Matrix. |
| 12 | Warnung Σ RE-Brutto > Auftrag-VK | UI/UX | `ZP-01` | 1 | Begleit-UI zu ZP-01. |
| 13 | Dashboard Charts zurück / Funnel-Noise | UI/UX | `W2-01` | 2 |  |
| 14 | Dashboard Funnel/Ranking Copy | Copy | `W2-01` | 2 |  |
| 15 | Tages-Inbox / My Work | Gemischt | `W2-01` | 2 |  |
| 16 | Nachfassen loggen / Reminder | Funktion | `W2-02` | 2 |  |
| 17 | Zone Warten auf Kunde (3 Actions) | UI/UX | `W2-02` | 2 |  |
| 18 | Back „Suchergebnisse“ weg | Copy | `W2-03` | 2 |  |
| 19 | Back-Link ehrlich + Filter persist | UI/UX | `W2-03` | 2 |  |
| 20 | Lifecycle in URL + KPI | Gemischt | `W2-03` | 2 |  |
| 21 | Kunde-Vorgänge-Tab | Funktion | `W3-01` | 3 |  |
| 22 | Kunden-Duplikat / Merge-Minimum | Funktion | `W3-01` | 3 | Voll-Merge → W6-09 |
| 23 | Detail-Tab-Anzahl / Rename | UI/UX | `W3-02` | 3 | Volles Zusammenlegen → später |
| 24 | Leerer Auftrag nach RE (Empty+Link) | UI/UX | `W3-02` | 3 |  |
| 25 | Verlauf/Historie Rename | Copy | `W3-02` | 3 |  |
| 26 | Bestand → Wiederkehrend | Copy | `W3-03` | 3 |  |
| 27 | HV ausschreiben | Copy | `W3-03` | 3 |  |
| 28 | Rate am Zahlplan: Korrigieren-CTA (Storno+Neu) | Gemischt | `W3-03` | 3 | Alltags-Erweiterung: Korrektur an der Rate, nicht nur Resend. |
| 29 | Zahlplan Nochmal versenden | Funktion | `W3-03` | 3 |  |
| 30 | Listen-⋯ ActionSheet | UI/UX | `W4-01` | 4 |  |
| 31 | Mobile Doppel-Chrome weg | UI/UX | `W4-01` | 4 |  |
| 32 | Thumb-Zone / Pagination-Padding | UI/UX | `W4-01` | 4 | Mit Chrome-Fix |
| 33 | Filter-Sheet einheitlich | UI/UX | `W4-02` | 4 |  |
| 34 | Mehr eine Partner-Kachel | UI/UX | `W4-02` | 4 |  |
| 35 | Partner-Label mobil (Legacy Netzwerk) | Copy | `W4-02` | 4 |  |
| 36 | Gutschrift / RE korrigieren (Copy-Hilfe) | Copy | `W5-01` | 5 |  |
| 37 | Hinweis nach Positions-Änderung bei laufenden Abschlägen | Copy | `W5-01` | 5 | Alltags-Erweiterung Situation 10. |
| 38 | Nachtrag am Auftrag | Funktion | `W5-01` | 5 |  |
| 39 | No-Show | Funktion | `W5-01` | 5 | Hinweis/Status leicht |
| 40 | Desktop Split-Pane | UI/UX | `W5-02` | 5 |  |
| 41 | Hover Quick-Actions | UI/UX | `W5-02` | 5 |  |
| 42 | Pipeline Board optional | UI/UX | `W5-02` | 5 |  |
| 43 | Resolver + Banner + Badge entflechten | Copy | `W6-01` | 6 | War „—“ in alter Matrix |
| 44 | Stammdaten → Kunde & Objekt / Details→Positionen | Copy | `W6-02` | 6 |  |
| 45 | Admin Login umbenennen | Copy | `W6-03` | 6 |  |
| 46 | Dev-Empty (SQL/Compliance) Staff-tauglich | Copy | `W6-03` | 6 |  |
| 47 | Fotos Empty „Mieter-Meldung“ | Copy | `W6-03` | 6 |  |
| 48 | KI Intelligence Label | Copy | `W6-03` | 6 |  |
| 49 | Notizen · 0 | Copy | `W6-03` | 6 |  |
| 50 | RE Ohne-Ersatz-Copy | Copy | `W6-04` | 6 |  |
| 51 | Wizard Step-Hilfetext / RE Individualisieren | Copy | `W6-04` | 6 |  |
| 52 | Status-Farbmatrix | UI/UX | `W6-05` | 6 |  |
| 53 | Toast + Inline „Gesendet an…“ | UI/UX | `W6-05` | 6 |  |
| 54 | ⋯-Menü gruppieren | UI/UX | `W6-05` | 6 |  |
| 55 | Breakpoints 760/767/768 | UI/UX | `W6-06` | 6 |  |
| 56 | Mobile Row-Dichte (max 2 Meta) | UI/UX | `W6-06` | 6 |  |
| 57 | Modal vs Route Regel dokumentieren | UI/UX | `W6-06` | 6 |  |
| 58 | A11y Focus / 44px Tap | UI/UX | `W6-07` | 6 |  |
| 59 | Onboarding-Checklist Empty | UI/UX | `W6-07` | 6 |  |
| 60 | Optimistic UI Annehmen/Bezahlt | UI/UX | `W6-07` | 6 |  |
| 61 | Swipe Anrufen | UI/UX | `W6-07` | 6 |  |
| 62 | Suche AN/RE erweitern | Funktion | `W6-08` | 6 |  |
| 63 | Baustopp | Funktion | `W6-09` | 6 |  |
| 64 | Bulk Status ändern | Funktion | `W6-09` | 6 |  |
| 65 | E-Mail Bounce-Workflow | Funktion | `W6-09` | 6 |  |
| 66 | Mail-Inbox → Anfrage | Funktion | `W6-09` | 6 |  |
| 67 | Team-Handoff / Schichtnotiz | Funktion | `W6-09` | 6 |  |
| 68 | Voll-Merge Kunden | Funktion | `W6-09` | 6 | Minimum in W3-01 |
| 69 | Tab-Bar Kunden in BottomNav | UI/UX | `W6-10` | 6 | Optional nach Messung |

### Mapping-Hinweis

- Ein Master-To-do (z. B. `W6-03`) kann **mehrere** Copy-Befunde bündeln — die Umsetzung sollte die Einzelzeilen abhaken.
- `W6-09` ist bewusst ein **Epic-Bucket** (Merge, Bounce, Bulk, Handoff, Baustopp, Mail→Anfrage) — jedes Finding dort braucht ggf. ein eigenes Ticket.
- Journey-Fixes P0–P2 und OPs stehen im Anhang unter Master-To-dos.

### Befund-IDs (stabil zum Abhaken)

| Befund-ID | Befund | Master |
|-----------|--------|--------|
| `F-01` | Abschlagsplan Summe ≤ VK | `DONE-01` |
| `F-02` | Anfrage-Banner redundant kürzen | `W1-01` |
| `F-03` | Angebot Erstversand am Detail | `W1-01` |
| `F-04` | Banner „Als Nächstes“ nur bei Blockade (Angebot) | `W1-01` |
| `F-05` | Primary = nächster Schritt / Banner angleichen | `W1-01` |
| `F-06` | Visuelle Hierarchie Detail-Kopf | `W1-01` |
| `F-07` | Partner überall statt Handwerker (Angebot) | `W1-02` |
| `F-08` | Partner-Anfrage am Angebot-Detail | `W1-02` |
| `F-09` | Angebot ablehnen | `W1-03` |
| `F-10` | Auftrag stornieren | `W1-04` |
| `F-11` | Abschlag + Schluss Doppelabrechnung (> VK) | `ZP-01` |
| `F-12` | Warnung Σ RE-Brutto > Auftrag-VK | `ZP-01` |
| `F-13` | Dashboard Charts zurück / Funnel-Noise | `W2-01` |
| `F-14` | Dashboard Funnel/Ranking Copy | `W2-01` |
| `F-15` | Tages-Inbox / My Work | `W2-01` |
| `F-16` | Nachfassen loggen / Reminder | `W2-02` |
| `F-17` | Zone Warten auf Kunde (3 Actions) | `W2-02` |
| `F-18` | Back „Suchergebnisse“ weg | `W2-03` |
| `F-19` | Back-Link ehrlich + Filter persist | `W2-03` |
| `F-20` | Lifecycle in URL + KPI | `W2-03` |
| `F-21` | Kunde-Vorgänge-Tab | `W3-01` |
| `F-22` | Kunden-Duplikat / Merge-Minimum | `W3-01` |
| `F-23` | Detail-Tab-Anzahl / Rename | `W3-02` |
| `F-24` | Leerer Auftrag nach RE (Empty+Link) | `W3-02` |
| `F-25` | Verlauf/Historie Rename | `W3-02` |
| `F-26` | Bestand → Wiederkehrend | `W3-03` |
| `F-27` | HV ausschreiben | `W3-03` |
| `F-28` | Rate am Zahlplan: Korrigieren-CTA (Storno+Neu) | `W3-03` |
| `F-29` | Zahlplan Nochmal versenden | `W3-03` |
| `F-30` | Listen-⋯ ActionSheet | `W4-01` |
| `F-31` | Mobile Doppel-Chrome weg | `W4-01` |
| `F-32` | Thumb-Zone / Pagination-Padding | `W4-01` |
| `F-33` | Filter-Sheet einheitlich | `W4-02` |
| `F-34` | Mehr eine Partner-Kachel | `W4-02` |
| `F-35` | Partner-Label mobil (Legacy Netzwerk) | `W4-02` |
| `F-36` | Gutschrift / RE korrigieren (Copy-Hilfe) | `W5-01` |
| `F-37` | Hinweis nach Positions-Änderung bei laufenden Abschlägen | `W5-01` |
| `F-38` | Nachtrag am Auftrag | `W5-01` |
| `F-39` | No-Show | `W5-01` |
| `F-40` | Desktop Split-Pane | `W5-02` |
| `F-41` | Hover Quick-Actions | `W5-02` |
| `F-42` | Pipeline Board optional | `W5-02` |
| `F-43` | Resolver + Banner + Badge entflechten | `W6-01` |
| `F-44` | Stammdaten → Kunde & Objekt / Details→Positionen | `W6-02` |
| `F-45` | Admin Login umbenennen | `W6-03` |
| `F-46` | Dev-Empty (SQL/Compliance) Staff-tauglich | `W6-03` |
| `F-47` | Fotos Empty „Mieter-Meldung“ | `W6-03` |
| `F-48` | KI Intelligence Label | `W6-03` |
| `F-49` | Notizen · 0 | `W6-03` |
| `F-50` | RE Ohne-Ersatz-Copy | `W6-04` |
| `F-51` | Wizard Step-Hilfetext / RE Individualisieren | `W6-04` |
| `F-52` | Status-Farbmatrix | `W6-05` |
| `F-53` | Toast + Inline „Gesendet an…“ | `W6-05` |
| `F-54` | ⋯-Menü gruppieren | `W6-05` |
| `F-55` | Breakpoints 760/767/768 | `W6-06` |
| `F-56` | Mobile Row-Dichte (max 2 Meta) | `W6-06` |
| `F-57` | Modal vs Route Regel dokumentieren | `W6-06` |
| `F-58` | A11y Focus / 44px Tap | `W6-07` |
| `F-59` | Onboarding-Checklist Empty | `W6-07` |
| `F-60` | Optimistic UI Annehmen/Bezahlt | `W6-07` |
| `F-61` | Swipe Anrufen | `W6-07` |
| `F-62` | Suche AN/RE erweitern | `W6-08` |
| `F-63` | Baustopp | `W6-09` |
| `F-64` | Bulk Status ändern | `W6-09` |
| `F-65` | E-Mail Bounce-Workflow | `W6-09` |
| `F-66` | Mail-Inbox → Anfrage | `W6-09` |
| `F-67` | Team-Handoff / Schichtnotiz | `W6-09` |
| `F-68` | Voll-Merge Kunden | `W6-09` |
| `F-69` | Tab-Bar Kunden in BottomNav | `W6-10` |
| `F-70` | Phasen-Breadcrumb/Strip im Detail entfernt | `W7-01` |
| `F-71` | Auftrag ~10 Tabs, Geld/Vor-Ort nicht Default | `W7-04` / `W7-02` |
| `F-72` | Auftrag Primary immer Rechnung erstellen | `W7-02` |
| `F-73` | RE Default-Tab Stammdaten | `W7-02` |
| `F-74` | Als Nächstes nicht klickbar / ≠ Primary | `W1-01` / `W7-02` / `W6-01` |
| `F-75` | ACTIVITY_TAB_LABEL unbenutzt; Tab heißt Verlauf | `W7-03` |
| `F-76` | Historie nur spät im Tab, keine Kopf-Kette | `W7-01` |
| `F-77` | RE-Wizard Individualisieren/Paket | `W7-05` / `W6-04` |
| `F-78` | Generische Tab-Namen Stammdaten/Details | `W7-06` / `W6-02` |
| `F-79` | Partner zuweisen kein klarer Auftrag-Primary | `W7-02` |
| `F-80` | Vor-Ort/Abnahme: Kitchen-Sink + 7-Step-Wizard | `W9` / `W7-02` |
| `F-81` | Anrufen am Auftrag-Vorgang fehlt | `W2-02` / `W4-01` |
| `F-82` | Spec `entity-detail-tabs.ts` kaum genutzt | `W7-06` |
| `F-83` | Kein `naechsterSchrittRechnung` | `W7-02` / `W6-01` |
| `F-84` | Banner vs. NaechsteSchritteCard parallel | `W6-01` / `W7-02` |
| `F-85` | „Gesendet Handwerker“ / Wizard-Complete Handwerker | `W1-02` |
| `F-86` | Portal-Menü Handwerker-Link vs Partner-Link | `W1-02` |
| `F-87` | RE-Tab „Details“ vs Leistungen/Positionen | `W7-06` |
| `F-88` | Kein Auftrag-Create-Wizard — Empty/Copy erklären | `W7-06` |
| `F-89` | `AuftragKundenUpdatePanel` nicht am Detail verdrahtet | `W7-07` |
| `F-90` | `AuftragDokumentationPanel` / Baustopp orphaned | `W7-07` / `W6-09` |
| `F-91` | `AuftragProjektSteuerung` / `AuftragDetailKopf` ohne Consumer | `W7-07` |
| `F-92` | Auftrag-Status ohne Staff-Picker | `W7-02` |
| `F-93` | Dokumente-Copy erwähnt fehlenden Compliance-Tab | `W7-06` |
| `F-94` | Banner prüft nicht Partner/Zahlplan/Abschläge | `W7-02` / `W6-01` |
| `F-95` | Leistungen-Empty „Handwerker anfragen“ | `W1-02` |
| `F-96` | Mobile = Desktop-First-Adaption | `W8-04` / `W4-01` |
| `F-97` | Breakpoint-Lücke 761–767 | `W8-01` |
| `F-98` | Listen-Popover vs Detail-ActionSheet | `W8-02` |
| `F-99` | `DetailResponsiveTabs` ungenutzt | `W8-04` |
| `F-100` | Master-Detail-Split entfernt / Kommentare veraltet | `W5-02` / `W8-05` |
| `F-101` | Zu viele parallele Flows pro Job | `W8-03` |
| `F-102` | Mobile Detail = alle Desktop-Tabs horizontal | `W8-04` |
| `F-103` | Kein BREAKPOINTS-Token-Modul | `W8-01` |

---

## Hinweise für Claude / weitere Reviews

Bitte bei Vorschlägen:

1. Pro Situation **IST → Verständlichkeit → Copy/Struktur → SOLL** beibehalten.  
2. Keine Features erfinden, die nicht zum Code passen — bei Unsicherheit Dateipfade nennen.  
3. Primär **Timing der Primary CTA**, **Phasen-Orientierung (W7)** und **Zahlplan-Restlogik** priorisieren.  
4. Mobile als **eigenes Zielbild** (W8 + W4): nicht Desktop schrumpfen; Komponenten/Flows vereinheitlichen.  
5. Konkrete Patches: Datei + Verhalten + kurzer Testplan (Happy Path + bezahlte Rate + Schluss).

### Zentrale Dateien (Orientierung)

| Thema | Dateien |
|-------|---------|
| Angebot Versand/Primary | `AngebotDetailPageClient.tsx`, `AngebotVersandSection.tsx`, `naechster-schritt.ts`, `naechste-schritte.ts` |
| Detail-Tabs / Spec | `entity-detail/entity-detail-tabs.ts`, `crm-labels.ts`, `*DetailClient.tsx` |
| Zahlplan | `zahlungsplan.ts`, `AbschlagsplanEditorModal.tsx`, `AuftragZahlungsplanSection.tsx`, `zahlplan-gates.ts`, `wizard-actions.ts` |
| RE Korrektur | `rechnung-korrektur.ts`, `rechnungen/actions.ts`, `RechnungDetailClient.tsx` |
| Nav/Mobile | `nav-config.ts`, `DetailActionsBar.tsx`, `DashboardShell.tsx`, `MehrScreenClient.tsx`, `useIsMobile.ts`, `mock-design-system.css`, `ActionSheet.tsx`, `MockEntityRowMenu` |
| Phasen-Orientierung | `EntityDetailLayout.tsx`, `ProjektKette.tsx`, `ProjektHistorieTab.tsx`, `VorgangPhasenDiagramm.tsx` |

---

*Stand: + Mobile-First-Kapitel (Marktvergleich, Kit, Flow-Einheit); Situationen 32–37; W8-01…05; Befunde F-96…103; Master 38 IDs.*
