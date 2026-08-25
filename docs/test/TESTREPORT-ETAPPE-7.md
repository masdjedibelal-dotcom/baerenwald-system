# TESTREPORT-ETAPPE-7 — Design gegen Leitfaden + Copy-Audit

| Feld | Wert |
|---|---|
| Etappe | 7 — Design (T-UI) + Copy (T-CP) gegen eingefrorenen `PATTERN-LEITFADEN.md` |
| Datum | 2026-08-25 |
| Umgebung | Staging CRM + Website (wie Setup) |
| Maßstab | `docs/ui-audit/PATTERN-LEITFADEN.md` · Screens aus `docs/ui-audit/INVENTAR.md` |
| Ergebnis Teil A | **3 ✅ · 2 ❌ · 5 ⚠️** von 10 (T-UI-01–10) |
| Ergebnis Teil B | **1 ✅ · 0 ❌ · 4 ⚠️** von 5 (T-CP-01–05) — Copy-Tabelle unten |
| Screenshots | `docs/test/screenshots/etappe-7/` |
| Fund-IDs | fortlaufend ab **F-137** |
| Setup | `docs/test/TESTPLAN-SETUP.md` |

---

## Kurzüberblick

1. **Status-Wortlaut (T-UI-03) bricht die „eine Map“-Regel:** Dashboard-Mapping (`Fertig`, `Versendet`, `Gesendet HW`, `In Arbeit` für `offen`) ≠ Vorgänge ≠ Detail ≠ Mieter-Timeline (`Eingegangen` …).
2. **Primary-CTA:** Viele Screens ok; Code-Hotspots mit ≥2 Primaries (Versand, Finanzen, Mängel, Empty+Header). FAB + Detail-Primary laut Leitfaden §18 **erlaubt**.
3. **Whitelabel Sofort-Fixes** (Bestätigungs-CTA, Inaktiv-Seite, PWA-Name) im **Hauptpfad ok**; Org-Farbe null → CTA weiter **BW-Grün `#2e7d52`** (nicht Neutral).
4. **Mobile Vorgänge 375:** Bottom-Nav + FAB, kein Document-Horizontal-Scroll.
5. **Copy:** Wenig „Hier können Sie…“; Melde-Unterzeilen und doppelte Status-Subtitles auffällig; Tooltips nicht einheitlich.

**Nicht als neue Funde:** Button-Migration, Partner-Du-Altcopy, Portal-Systemfonts, `/portal-tools/rechner`, Legacy `/status/[id]`, Website-`/projekt` 404 (Etappe 4).

---

## Teil A — Leitfaden-Checkliste

### Sammel-✅ (keine Einzelabweichung auf Stichprobe)

| Screen (INVENTAR) | Viewport | Notiz |
|---|---|---|
| CRM Dashboard | 1440 | 1 FAB-Primary; Geld `0,00 €`; Datum „25. August“ |
| Vorgänge-Liste | 1440 + 375 | 1 Badge/Zeile; Datum `TT.MM.JJJJ`; Bottom-Nav mobil |
| Melde Org/Objekt | 1440 | 1 Primary „Weiter →“; Org-Name/Logo; Fuß „Technischer Service von Bärenwald“ ok |
| Portal-Login | 1440 | Sie-Form; gestaltete Fehler (Etappe 6) |
| Melde-Fehler | (Etappe 5) | gestaltete Fehlerseite |
| Wartung-Empty | (Etappe 6) | MockEmpty |

---

### F-137 · T-UI-01 · ⚠️ Teilweise · Wichtig

| Feld | Inhalt |
|---|---|
| Erwartet | Max. ein grüner Primary pro Viewport |
| Beobachtet | **Ok:** Melde, Dashboard (KPI-Karten nicht Primary), viele Listen. **≥2 Primaries (Code/UI):** `AngebotVersandSection` (Kunde/HW); `AuftragFinanzenClient`; `AbnahmeMaengelBearbeitenFlow`; Anfrage Empty „+ Angebot“ + Header-Primary (wenn Empty primary). Anfrage-Leistungen live: Header-Primary „Warte auf HV…“ + FAB (FAB+Detail laut §18 erlaubt). Screenshot: `T-UI-01-anfrage-leistungen-cta.png` |
| Screens mit ≥2 Primaries | Angebot-Versand · Auftrag-Finanzen · Abnahme/Mängel · Anfrage Empty+Header · Melde-Status Terminslots (n× „Bestätigen“) |
| Einordnung | Neuer Fund · FAB-Kombi = Akzeptiertes Ist (§18) |

---

### F-138 · T-UI-02 · ✅ Bestanden · —

| Feld | Inhalt |
|---|---|
| Screenshot | `T-UI-09-vorgaenge-mobile-375.png` |
| Beobachtet | Vorgänge: ein Status-Pill pro Zeile (Neu / Termin / Kontaktiert). Keine Dual-Pills auf Stichprobe. Korrektur-Zustände (RE) live nicht mit zwei Pills gesehen. |
| Einordnung | Akzeptiertes Ist |

---

### F-139 · T-UI-03 · ❌ Fehlgeschlagen · Blocker

| Feld | Inhalt |
|---|---|
| Screenshot | `T-UI-03-mieter-status-timeline.png`, `T-UI-dashboard-desktop.png` |
| Erwartet | Eine kanonische Map; Dashboard ohne Eigenwortlaute; gleiche Geschichte CRM/Portal/Mieter |
| Beobachtet | **Dashboard-Code** `dashboard-mock-mapping.ts`: `offen`→**In Arbeit**, `abgeschlossen`→**Fertig**, RE→**Versendet**, HW→**Gesendet HW** / **HW akzeptiert** — verboten laut Leitfaden §3. **Vorgänge** vs **status-display**: „Gesendet Handwerker“ vs „An Partner gesendet“. **Mieter-Timeline** eigene Sprache: Eingegangen / In Bearbeitung / Beauftragt / Handwerker vor Ort / Erledigt — CRM E2E-Lead `status=termin` zeigt „Termin“ / Primär „Warte auf HV…“, Mieter weiter **Eingegangen** (Etappe 3). Portal-Phasen (`kunde-vorgang-status`) weitere Parallelwelt. |
| Einordnung | Neuer Fund |

---

### F-140 · T-UI-04 · ⚠️ Teilweise · Kosmetik

| Feld | Inhalt |
|---|---|
| Beobachtet | CRM Desktop: Primary-Buttons gemessen `rgb(46, 125, 82)` = `#2e7d52`; Sidebar dunkel `#1a3d2b`-Familie. Keine offensichtlichen Emerald-Pills auf Stichprobe. Melde-CTA bei `org_primary_color=null` ebenfalls BW-Grün (nicht Neutral). Tailwind-`emerald-*`/`green-*` in Legacy-Code = Backlog Button-Migration, nicht neu. |
| Einordnung | Teil · WL-Fallback = Neuer Fund (siehe T-UI-06) |

---

### F-141 · T-UI-05 · ✅ Bestanden (mit Backlog-Hinweis) · —

| Feld | Inhalt |
|---|---|
| Beobachtet | Marketing Landing: Du („dein Vorhaben“, „dein Projekt“). Melde/Status/Portal-Login: Sie. Partner-Du-Altcopy = **Bekannt (Backlog)** — nicht neu. |
| Einordnung | Akzeptiertes Ist |

---

### F-142 · T-UI-06 · ⚠️ Teilweise · Wichtig

| Feld | Inhalt |
|---|---|
| Screenshot | `T-UI-06-melde-org-wl.png` |
| Erwartet | Org-Logo/Farbe; kein BW-CTA-Wortlaut; kein erzwungenes BW-Grün |
| Beobachtet | **Sofort-Fixes ok:** Bestätigungs-CTA → „Konto anlegen, um Ihre Meldungen zu verfolgen“; Inaktiv → „Meldung nicht mehr aktiv“; PWA `resolvePortalPwaApplicationName` / Manifest „Portal“. Live Melde: Org-Name + MN-Logo; CTA-Grün = Token-BW bei fehlender Org-Farbe (Etappe 5). Fußzeile BW-Technik erlaubt. |
| Einordnung | Teil · Farbe-Fallback neu; Sofort-Fixes = Akzeptiertes Ist |

---

### F-143 · T-UI-07 · ✅ Bestanden · —

| Feld | Inhalt |
|---|---|
| Beobachtet | CRM Empty: MockEmpty (Wartung, Leistungen „Noch keine Leistungen“). Melde-Fehler gestaltet. Token Website-`/projekt` 404 = **Bekannt (Etappe 4 / Backlog Statuswelten)**. |
| Einordnung | Akzeptiertes Ist |

---

### F-144 · T-UI-08 · ⚠️ Teilweise · —

| Feld | Inhalt |
|---|---|
| Beobachtet | Angebot/RE-Wizard = DocumentCanvas; Anlegen oft EditorSheet; destruktiv Confirm/Modal; ⋯ ActionSheet auf Details. Abweichler/Legacy laut `AUDIT.md` (alte Dialoge, gemischte Surfaces) → **Bekannt**, nicht neu aufgezählt. Dirty-Check Canvas = Etappe 6 F-132. |
| Einordnung | Teil · Legacy = Bekannt |

---

### F-145 · T-UI-09 · ✅ Bestanden · —

| Feld | Inhalt |
|---|---|
| Screenshot | `T-UI-09-vorgaenge-mobile-375.png` |
| Beobachtet | 375px Vorgänge: `scrollWidth=375`, kein H-Scroll; Bottom-Nav (Dashboard/Vorgänge/Kunden/Mehr) + FAB; Tabs/Filter dieselben IDs wie Desktop (Alle/Anfrage/…). Touch-Ziele Filter/FAB ausreichend. Chip-Zeile kann intern scrollen (nicht Document-Scroll). |
| Einordnung | Akzeptiertes Ist |

---

### F-146 · T-UI-10 · ⚠️ Teilweise · Kosmetik

| Feld | Inhalt |
|---|---|
| Beobachtet | Datum in Listen: `25.08.2026` ✅. Geld Dashboard: `0,00 €` ✅. Vorgänge-Ranges oft **ohne** 2 Nachkommastellen (`300 – 700 €`). Viele lokale `toLocaleString('de-DE')` parallel zu `formatDatum`/`formatEurBetrag` (Code). Kein $-Format gesehen. |
| Einordnung | Teil · Range-Kurzformat diskutabel |

---

## Teil B — Copy-Audit

### F-147 · T-CP-01/02 · ⚠️ Teilweise · Kosmetik

Ergebnis-Tabelle (Aufräum-Auftrag):

| Screen | Fundtext (gekürzt) | Klassifikation | Screenshot |
|---|---|---|---|
| Melde Objekt Schritt 1 | „Wasser, Heizung, Strom & Co. — Dringlichkeit setzen wir automatisch“ unter H1 | **→ i-Icon** (Info, Platz = Absatz) | `T-UI-06-melde-org-wl.png` |
| Melde-Status Timeline | Subtitle + Stepper-Text doppelt: „Ihre Meldung ist bei Ihrer Verwaltung eingegangen.“ | **Löschen** (redundant) | `T-UI-03-mieter-status-timeline.png` |
| Melde-Status | „Sobald Termine oder Arbeiten feststehen, erscheinen sie hier.“ | **Behalten** (Empty-ähnlich / nächster Schritt) | — |
| Melde-Bestätigung | `register_hint_de` / Register-Hinweis | **→ i-Icon** oder **Behalten** (Auth-Kontext) | Code |
| AngebotWizardComplete | erklärender Abschluss-Absatz | **→ i-Icon** / kürzen | Code |
| CRM Demo-Banner | Demo-/Test-Account-Hinweis | **Behalten** (Warnung Staging) | alle CRM |
| Anfrage Empty | „Noch keine Leistungen“ + CTA | **Behalten** (Empty-State) | `T-UI-01-…` |

Keine Treffer „Hier können Sie…“ / „In diesem Bereich…“ in Live-Stichprobe.

---

### F-148 · T-CP-03 · ⚠️ Teilweise · Kosmetik

| Feld | Inhalt |
|---|---|
| Erwartet | i-Icon/Tooltip 1–2 Sätze, einheitliches Muster |
| Beobachtet | Keine kanonische Tooltip-Komponente. Parallel: natives `title=`, `MockField hint=`, dekoratives `MockIcon info` oft ohne Hover-Text, Portal `disabledHint`. |
| Einordnung | Neuer Fund (uneinheitlich) |

---

### F-149 · T-CP-04 · ⚠️ Teilweise · Kosmetik

| Feld | Inhalt |
|---|---|
| Erwartet | Verb ≤2 Wörter; Speichern / Weiter / Senden |
| Beobachtet | **Ok:** Melde „Weiter →“. **Abweichler:** Primary „Warte auf HV / Hausmeister“ (Phrase, kein Verb≤2); Code „Übernehmen“ (Assistent/PosBoard/KI); „Fertig“ außerhalb Abnahme-Ende; Partner „Abschließen“. Button-Migration Backlog überdeckt teils Styling, nicht Copy. |
| Einordnung | Neuer Fund |

---

### F-150 · T-CP-05 · ⚠️ Teilweise (Code) · Kosmetik

| Feld | Inhalt |
|---|---|
| Erwartet | Toast kurz „Gespeichert“/„Gesendet“ |
| Beobachtet | Live wenig Toasts ausgelöst. Code-Beispiele Essay-Länge: Assistent-Übernahme, RE-Hinweise zu Abschlagsplan. Kanonisch `app-toast.tsx`. |
| Einordnung | Teil · Stichprobe Code |

---

## Funde — Übersicht

| ID | Kurz | Schwere |
|---|---|---|
| F-139 | Status-Wortlaut dreifach + CRM≠Mieter | Blocker |
| F-137 | Screens mit ≥2 Primaries | Wichtig |
| F-142 | WL-CTA-Farbe Fallback BW-Grün | Wichtig |
| F-147 | Copy: Melde-Absatz + doppelte Status-Zeile | Kosmetik |
| F-148 | Uneinheitliche Tooltips | Kosmetik |
| F-149 | Button-Copy zu lang / Übernehmen | Kosmetik |
| F-146 | Geld-Ranges ohne 2 NK | Kosmetik |

---

## Bekannt (Backlog) — nur Verweis

| Thema | Verweis |
|---|---|
| ui/Button vs MockBtn | TESTPLAN |
| Partner-Du-Altcopy | Leitfaden §16 |
| Portal-Systemfonts | Leitfaden §14 |
| `/portal-tools/rechner` Clone | INVENTAR |
| Legacy `/status/[id]` · Website `/projekt` 404 | Etappe 4 / TESTPLAN |

---

## Abdeckung vs. INVENTAR

**Live Stichprobe:** CRM Dashboard, Vorgänge (Desktop+Mobile), Anfrage-Detail, Melde Objekt, Melde-Status, Portal-Login, Marketing Landing.  
**Code/Prior-Etappen:** Token-Fehler, Empty-States, WL-Sofort-Fixes, Dashboard-Mapping, Primary-Hotspots.  
**Nicht einzeln visuell:** Partner-Dashboard (Du=Backlog), alle SEO-Landingpages, alle Einstellungs-Untertabs, HW-Token, Nachtrag-Token — Abweichungen dort über Code-Scan in Teil A/B mitgeführt, wo relevant.

---

## Viewport

Desktop 1440 und Mobile 375 (Vorgänge) geprüft. Weitere Screens überwiegend Desktop.
