# TESTREPORT — R2-Etappe 1B (Nachtest: Verify + E2E-Reste)

| Feld | Wert |
|---|---|
| Etappe | R2-1B — Nachtest aller offenen Verify-/E2E-Fälle |
| Datum | 2026-08-26 |
| Umgebung | Staging CRM `staging--baerenwald-backend.netlify.app` · Website `staging--baerenwald.netlify.app` · Supabase `soqownnkxmtfgvsbrgsl` |
| Methode | Playwright (Confirms stets dismissed) + SQL + `trigger-portal-mail-catch.mjs` |
| Automation | `scripts/r2-1b-verify.mjs` · Hilfsmodul `scripts/lib/funnel-nav.mjs` |
| Screenshots | `docs/test/screenshots/r2-1b/` |
| Log / JSON | `docs/test/r2-1b-log.txt` · `docs/test/r2-1b-results.json` |
| Fund-IDs | ab **F-170** |
| Ergebnis | **Teilweise** — CRM-Fixes F-160/F-165/F-166/P3-8 greifen live; Website-Fixes F-161/F-163/F-167 und Website-Catcher fehlen noch auf Staging. Voller E2E .3–.11 / Block A/B/C / Teil 4 nicht durchgespielt. |

**Kurzbilanz:** 11 ✅ · 5 ❌ · 6 ⚠️ · 38 🚫 (Vorbedingung/Zeit/Abhängigkeit) — von 60 geplanten Prüfpunkten in dieser Session.

---

## Vorbedingungen (R2-SETUP)

| # | Prüfung | Ergebnis |
|---|---|---|
| 1 | Mail-Catcher-Triple | ⚠️ **Teilweise.** CRM: ✅ `email_log` mit `staging-catch:…` (2 Einträge nach Test-Lauf: `220ee640-…`, `58bf025d-…` via `trigger-portal-mail-catch.mjs`). Website: ❌ **kein** `staging-catch:website-…` in `email_log` → **F-170**. Resend-Dashboard hier nicht einsehbar. Cron-Skip weiterhin nur code-seitig (`staging-mail-guard`). **→ Versand-Inhaltsprüfungen (.3/.10/N-19) weiterhin nicht freigegeben.** |
| 2 | Deploy-Stichprobe Meldungsdetails | ✅ Lead `6eba4479-…` (R2-2-E2E): Karte **„Meldungsdetails“** im Übersicht-Tab mit Situation/Bereich/Freitext. Screenshot `pre2-lead-6eba.png`. |
| 3 | Seed Runde 2 | ✅ Auftrag `231716aa-…` (`in_arbeit`) · RE `STG-R2-0001` (`gesendet`, `c770d2da-…`) · Partner Elektro `angenommen`. |

---

## Teil 1 — E2E-Durchstich (> 500 €, HV-Gate)

> Neuer ZZTEST-HV-Durchstich in dieser Session **nicht bis Angebot>500 €** durchgespielt. Melde-Submit legt Leads an, Bestätigungsseite bleibt aber unzuverlässig (siehe **F-176**). Stattdessen: frische Melde-Leads + bestehender E2E-Lead `6eba4479-…` für CRM-Schritte .2/.2b.

### R2-E2E-.1 — Melde + Bestätigung

| ID | Status | Fund | Kurz |
|---|---|---|---|
| T1-.1 | ⚠️ | **F-176** | Funnel inkl. Foto + Absenden erreicht ✅ (DB: neue Leads `23547a2c-…`, `130d4aa3-…`). UI navigiert **nicht** zuverlässig auf Bestätigung — kurz „Meldung wird gesendet…“, dann wieder Funnel-URL ohne Referenz/CTA. |
| T1-.1-F163 | ❌ | **F-173** | Referenznummer auf Bestätigung **nicht** sichtbar (Confirm nie stabil erreicht; Fix lokal, Staging alt). |
| T1-.1-F162 | ⚠️ | — | HTML-Stichprobe ohne Prod-`next=` hardcoded ✅; live Bestätigungs-Redirect nicht belastbar ohne F-176-Fix. |
| T1-.1-CTA | ⚠️ | — | R2-2/R2-3: neutraler „Konto anlegen…“-CTA ✅ historisch belegt. In **diesem** Lauf Confirm nicht erreicht → nicht erneut verifiziert. |

### R2-E2E-.2 — CRM Kontext

| ID | Status | Fund | Kurz |
|---|---|---|---|
| T1-.2 | ✅ | — | Lead `6eba4479-…`: Org Nord, Leopold, Melder ZZTEST R2E2E, Kanal HV-Meldung. |
| T1-.2-F165 | ✅ | — | **Meldungsdetails-Karte** mit Situation/Bereich/Freitext ✅ (`pre2-lead-6eba.png`). |
| T1-.2-badge | ✅ | — | Badge **„HV-Meldung“** sichtbar. |

### R2-E2E-.2b — HV-Warte-Sheet + Portal-Übergabe

| ID | Status | Fund | Kurz |
|---|---|---|---|
| T1-.2b-F166 | ✅ | — | Primary „Warte auf HV / Hausmeister“ → **HvWarteFreigabeSheet** (Status, nächste Schritte, Portal-Hinweis) ✅. |
| T1-.2b-HV | 🚫 | — | HV-Portal „An Bärenwald übergeben“ + CRM „Angebot erstellen“ in dieser Session **nicht** durchgespielt (Zeit/Abhängigkeit). |

### R2-E2E-.3 – .11 · Block A · Block B · D2–D6

| Bereich | Status | Kurz |
|---|---|---|
| .3 Angebot>500 € + Mail | 🚫 | HV-Gate + Website-Catcher + F-176 blockieren |
| .4 – .7 Partner/Freigabe/BT | 🚫 | hängt an .3 |
| Block A (A1–A8) | 🚫 | Kein frischer Vorgang mit `org_freigabe_status=ausstehend` |
| Block B (B1–B6) | 🚫 | Kein ZZTEST-Auftrag mit BT vor Redisposition |
| .8 – .11 Abnahme/RE/Abschluss | 🚫 | hängt an Vorgang |
| D2–D6 Mieter-Timeline | 🚫 | Vollpfad nicht durchgespielt; Status-Seite E7 separat ✅ |

---

## Teil 2 — Block C (Lösch-Sicherheit)

| ID | Status | Kurz |
|---|---|---|
| C1–C6 | 🚫 | Keine frischen Wegwerf-Entitäten für Lösch-Modal-/Mobil-/Wizard-Confirms angelegt. Seeds (231716aa, Nord, Leopold, STG-R2-0001) **nicht** angefasst. |

---

## Teil 3 — Verify-Reste E/F

| ID | Status | Fund | Kurz |
|---|---|---|---|
| E7 | ✅ | — | Status-Token `dkMROqEiyrxnOHnLQuRjkOGNHNNxiA0-`: Vorname/Kurzobjekt, **kein** Nachname/E-Mail im sichtbaren Kopf; Details mit Situation; Foto-Bereich vorhanden. |
| E8 | 🚫 | — | Staff2 fremde Notiz löschen nicht durchgespielt |
| E9 | 🚫 | — | 6× Falschpasswort bewusst nicht ausgereizt (Account-Sperre) |
| R2-V-F1 / F-160 | ✅ | — | Gesendete RE: „Rechnung bearbeiten“ disabled + **`title=Gesendet — Korrektur über Storno`** ✅ (`f160-re.png`) |
| R2-V-F6 / F-161 | ❌ | **F-171** | `?hinweis=objekt_nicht_gefunden` auf Org- und Objekt-Pfad: **kein** Amber-Banner „Objekt nicht gefunden…“ (`f161-hint.png`). Fix lokal, Website-Staging alt. |
| R2-V-F8 / P3-8 | ✅ | — | Org ohne Farbe: Primary-Button **`rgb(54, 59, 65)`** (Anthrazit) ✅ (`f8-color.png`) |
| R2-V-F12 / F-167·168 | ⚠️ | **F-172** | 9-MB-Datei am Foto-Schritt: **kein** sichtbarer Toast „max. 8 MB“ in Automation (`f167-9mb.png`). Staging vermutlich noch 10-MB-Limit / Fix nicht deployed. |
| F7 | 🚫 | — | Wegwerf-Org Kennung-Änderung nicht durchgespielt |
| F9 | 🚫 | — | Angebot-PDF Datum TT.MM.JJJJ nicht geöffnet |

---

## Teil 4 — Nachholer & Reste

| Bereich | Status |
|---|---|
| N-03 – N-22, Roundtrip C1–C3, Stress-Reste | 🚫 In dieser Etappe nicht angegangen (nach Teil 1–3 priorisiert; Blocker F-164 Website + F-176) |

---

## Funde (ab F-170)

### F-170 — PRE-1 · Blocker · Website Mail-Catcher
| | |
|---|---|
| Erwartet | `email_log.resend_id` mit Präfix `staging-catch:website-…` |
| Beobachtet | Nur CRM-IDs (`staging-catch:220ee640-…`, `58bf025d-…`); **0** Website-Einträge |
| Einordnung | Fix `insert-email-log.ts` / `send-branded-mail.ts` lokal — **Staging-Deploy Website ausstehend** |

### F-171 — R2-V-F6 / F-161 · Wichtig · Website
| | |
|---|---|
| URL | `/melden/staging-muster-nord?hinweis=objekt_nicht_gefunden` und Objekt-Direktpfad mit gleichem Query |
| Erwartet | Amber-Banner sichtbar |
| Beobachtet | Funnel startet ohne Hinweistext |
| Einordnung | `MeldeHinweisBanner.tsx` lokal — **GREIFT NICHT** auf Staging |

### F-172 — R2-V-F12 / F-167 · Mittel · Website
| | |
|---|---|
| Erwartet | 9-MB-Upload → Toast „max. 8 MB“ |
| Beobachtet | Kein sichtbarer Fehlerhinweis in UI-Text/Automation |
| Einordnung | Lokaler Fix 8 MB in `PhotoUpload.tsx` — **GREIFT NICHT** auf Staging |

### F-173 — T1-.1-F163 · Kosmetik/Wichtig · Website
| | |
|---|---|
| Erwartet | Referenznummer auf Melde-Bestätigung |
| Beobachtet | Confirm-Seite nicht stabil; keine Referenz |
| Einordnung | Lokaler Fix `PortalFunnelHost`/`MeldenBestaetigungClient` — **GREIFT NICHT** (+ F-176 überlagert Verify) |

### F-176 — T1-.1 · Wichtig · Website Melde-Submit
| | |
|---|---|
| Erwartet | Nach Absenden Redirect auf Bestätigung mit CTA + Referenz |
| Beobachtet | Kurz „Meldung wird gesendet…“, danach Funnel-URL ohne Bestätigung; Lead **wird** in DB angelegt (`130d4aa3-…`, `23547a2c-…`) |
| Screenshot | `e2e-01-confirm.png`, R2-2-Log „after absenden“ |
| Einordnung | **Neuer Fund** — Frontend-Redirect/Confirm-Flow defekt oder hängt (unabhängig von Fix-Deploy) |

---

## Fix-Matrix (R2-1-Nacharbeit → Live)

| Fix | Ziel | Live-Staging | Zeile |
|---|---|---|---|
| F-160 RE-Tooltip | `title` am disabled Secondary | **GREIFT** | ✅ |
| F-161 Amber-Banner | `?hinweis=objekt_nicht_gefunden` | **GREIFT NICHT** | ❌ Website deploy |
| F-162 relative `next=` | Kein Prod-Hostname | **TEILWEISE** | HTML ok; Confirm wegen F-176 nicht belastbar |
| F-163 Referenznummer | Bestätigungsseite | **GREIFT NICHT** | ❌ + F-176 |
| F-164 CRM-Catcher | `email_log staging-catch:` | **GREIFT** | ✅ |
| F-164 Website-Catcher | `staging-catch:website-` | **GREIFT NICHT** | ❌ Website deploy |
| F-165 Meldungsdetails | CRM Übersicht-Tab | **GREIFT** | ✅ |
| F-166 HvWarteFreigabeSheet | CRM Primary-Button | **GREIFT** | ✅ |
| F-167/F-168 8 MB + Toast | Melde/Portal Upload | **GREIFT NICHT** | ❌ Website deploy |
| P3-8 Anthrazit-Fallback | Melde ohne Org-Farbe | **GREIFT** | ✅ |

---

## Gesamtbilanz R2-1-Fälle (Stand nach R2-1B)

| Block / ID | R2-1 | R2-1B Update | Jetzt-Status |
|---|---|---|---|
| Vorbed. Mail-Catcher | 🚫 leer | ⚠️ CRM ✅ / Website ❌ | **Teilweise** |
| Block A A1–A8 | 🚫 | 🚫 | **Offen** (ZZTEST>500 €) |
| Block B B1–B6 | 🚫 | 🚫 | **Offen** |
| Block C C1–C6 | 🚫 | 🚫 | **Offen** |
| Block D D1 | ✅ | — | **Ok** |
| Block D D2–D6 | 🚫 | 🚫 | **Offen** |
| E1–E6 | ✅ | — | **Ok** |
| E7 Status-Token | 🚫 | ✅ | **Ok** |
| E8–E9 | 🚫 | 🚫 | **Offen** |
| E10 Token-Invalid | ✅ | — | **Ok** |
| F-160 / F1 | ❌ | ✅ | **Behoben live** |
| F-161 / F6 | ❌ | ❌ | **Offen** (Deploy) |
| F-162 | — | ⚠️ | **Teilweise** |
| F-163 | — | ❌ | **Offen** (Deploy + F-176) |
| F-164 CRM | 🚫 | ✅ | **Behoben live** |
| F-164 Website | 🚫 | ❌ | **Offen** (Deploy) |
| F-165 | — | ✅ | **Behoben live** |
| F-166 | — | ✅ | **Behoben live** |
| F-167/168 / F12 | 🚫 | ⚠️ | **Offen** (Deploy) |
| F-11 HV-Badge | ✅ | ✅ | **Ok** |
| P3-8 / F8 | 🚫 | ✅ | **Behoben live** |
| F7, F9 | 🚫 | 🚫 | **Offen** |

---

## Aufräum-Liste

| Entität | ID / Merkmal | Aktion | Status |
|---|---|---|---|
| Melde-Lead (Session R2-1B) | `23547a2c-…` · `hv_melder_link` · neu | CRM Löschen mit Confirm | ⏳ offen |
| Melde-Lead (R2-2-Rerun) | `130d4aa3-…` · `hv_melder_link` · neu | CRM Löschen mit Confirm | ⏳ offen |
| Melde-Lead (R2-2 früher) | `ba1c9ef5-…` · neu | optional löschen | ⏳ offen |
| E2E-Fortsetzungs-Lead | `6eba4479-…` ZZTEST R2E2E | **behalten** (E2E .3+) | ✅ |
| Seed Auftrag/RE/Org | `231716aa`, STG-R2-0001, Nord | tabu | ✅ unberührt |
| Stress-Test-Mail-Log | `58bf025d-…` | harmlos (Testzeile) | — |

*Confirms beim Löschen manuell bestätigen (TESTPLAN-Regel). In dieser Session keine Confirms akzeptiert.*

---

## Freigabe / Nächste Schritte

**Nein** — vor R2-2-Fortsetzung bzw. vollem E2E:

1. **Website deployen** (baerenwald): F-161, F-163, F-167/168, Website-Mail-Catcher (F-170).
2. **F-176** untersuchen: Melde-Absenden → Bestätigungs-Redirect (Lead wird angelegt, UI bleibt hängen).
3. Website-Catcher-Triple belegen → dann .3/.10 Mail-Inhaltsprüfung.
4. HV-Übergabe am Lead `6eba4479-…` → Angebot>500 € → Block A/B.
5. Block C an frischen Wegwerf-Entitäten nachziehen.

*Nichts in dieser Etappe gefixt — nur dokumentiert.*

---

## Commit-Vorlage (GitHub Desktop)

**Geändert / neu**

- `docs/test/TESTREPORT-R2-1B.md` — Nachtest-Report, Fix-Matrix, Gesamtbilanz R2-1, Funde F-170–F-176  
- `scripts/r2-1b-verify.mjs` — Playwright-Nachtest (Vorbedingungen, E/F-Verify, E2E-Stichprobe)  
- `docs/test/r2-1b-log.txt` · `docs/test/r2-1b-results.json` — Laufprotokoll  
- `docs/test/screenshots/r2-1b/*` — Screenshots (f160, f161, f8, f167, pre2-lead, e2e-*)  
- `docs/test/r2-5-data/nine_mb.jpg` — 9-MB-Testdatei (Upload-Limit)

**Vorschlag Commit-Message:** `test(r2-1b): Nachtest-Report — CRM-Fixes live, Website-Deploy + F-176 offen`

---

# Teil 2 — Nach Website-Deploy (2026-08-26)

| Feld | Wert |
|---|---|
| Fortsetzung | Deploy-Verify · F-176 · Aufräumen · E2E-Rest (Teil 4 soweit möglich) |
| Automation | `scripts/r2-1b-part2.mjs` |
| Screenshots | `docs/test/screenshots/r2-1b/p2/` |
| Log / JSON | `docs/test/r2-1b-p2-log.txt` · `docs/test/r2-1b-p2-results.json` |
| Fund-IDs | ab **F-177** |
| Ergebnis | **Deploy-Verify größtenteils grün** · F-176 geschlossen · Aufräumen mit Vorfall · Block A/B/C/E2E-.3+ nicht durchgespielt |

**Kurzbilanz Teil 2:** 12 ✅ · 1 ❌ (F-167 Ersttest) · 2 ⚠️ · 28 🚫

---

## Schritt 1 — Deploy-Verify (5 Website-Fixes)

| Fix | ID | Status | Beobachtet |
|---|---|---|---|
| F-163 Referenznummer | P2-F163 | ✅ | Bestätigung `ref=024EEEAF` (8 Zeichen) + UI „Referenznummer“ sichtbar. Screenshot `p2/confirm-deploy1.png` |
| F-162 relative `next=` | P2-F162 | ✅ | Kein Prod-`baerenwald.netlify.app` in Confirm-HTML; Staging-Domains |
| F-167/168 8-MB-Toast | P2-F167 | ✅ | Am **FOTOS**-Schritt: `"nine_mb.pdf" ist zu groß (max. 8 MB).` (Retest nach Ersttest; Ersttest scheiterte an Funnel-Navigation vor FOTOS → ⚠️ Automation) |
| F-161 Amber-Banner | P2-F161 | ✅ | `/melden/staging-muster-nord?hinweis=objekt_nicht_gefunden` — Hinweis sichtbar. `p2/f161-banner.png` |
| F-170 / F-164 Website-Catcher | P2-F170 | ✅ | Nach Melde-Submit: **4×** `staging-catch:website-…` in `email_log` (z. B. `fc5f5f6c-…`, Betreff „Neue Meldung: Wasser tritt aus in der Küche“). Skript-First-Check zu früh → initial falsch ❌, DB-Nachzug ✅ |
| Neutraler CTA | P2-CTA | ✅ | „Konto anlegen, um Ihre Meldungen zu verfolgen“ |

---

## Schritt 2 — F-176 neu bewertet (3× Melde-Submit)

| Lauf | Redirect `/melden/bestaetigung` | Referenz in URL |
|---|---|---|
| #1 | ✅ ~10 s | `ref=355FED3F` |
| #2 | ✅ ~9 s (ohne Foto) | `ref=DE09F527` |
| #3 | ✅ ~8 s | `ref=7F02C45C` |

**Ergebnis:** **F-176 geschlossen** — Redirect stabil (3/3). Ursache Teil 1: Automation wartete nicht auf Navigation (`waitForURL` fehlte / zu kurzer Timeout nach „Meldung wird gesendet…“). Kein reproduzierbarer Produkt-Defekt nach Deploy; **Verwandtschaft F-128** (Race/`busy` ohne Early-Return) weiterhin code-seitig möglich, aber in 3×-Lauf nicht ausgelöst.

---

## Schritt 3 — Aufräumen (Wegwerf-Leads)

| Lead | Ziel | MockModal | `geloescht_am` | Status |
|---|---|---|---|---|
| `23547a2c-…` | löschen | ✅ „Vorgang löschen?“ | gesetzt | ✅ |
| `130d4aa3-…` | löschen | ✅ | gesetzt | ✅ |
| `6eba4479-…` | **behalten** | — | ⚠️ kurz mitgesetzt → **restored** | ✅ wieder aktiv |
| `2e32060f-…` (Seed-Lead Auftrag) | tabu | — | ⚠️ kurz mitgesetzt → **restored** | ✅ wieder aktiv |

### F-177 — Aufräum-Vorfall · Wichtig

| | |
|---|---|
| Beobachtet | Beim Löschen über Vorgänge-Liste (Bulk-Modal) wurden **mehrere** Leads in ~5 s soft-gelöscht (u. a. E2E-Lead `6eba4479`, Seed-Lead `2e32060f`, F-176-Test-Leads, ältere ZZTEST-Melder) — vermutlich Mehrfachselektion / Listensuche `23547a2c` ungenau |
| Maßnahme | `geloescht_am=null` für **geschützte** Entitäten `6eba4479` + `2e32060f` per Staging-DB (Test-Korrektur, kein Produkt-Fix) |
| Auftrag `231716aa` / RE `STG-R2-0001` | ✅ weiterhin in DB (`in_arbeit` / `gesendet`) |
| Einordnung | Automation-Risiko bei Bulk-Löschen — künftig Lead-UUID vollständig suchen + Auswahl verifizieren |

---

## Schritt 4 — Großer Rest (Stand)

| Block | Status | Kurz |
|---|---|---|
| 4a HV-Übergabe → Angebot >500 € | 🚫 | HV-Portal: AV-Vertrag-Gate + ZZTEST-Meldung `6eba4479` nach Vorfall kurz unsichtbar; „An Bärenwald übergeben“ in Automation nicht erreicht. Lead restored — **Nachlauf nötig** |
| 4b Block A (A1–A8) | 🚫 | Kein Vorgang mit `org_freigabe_status=ausstehend` erzeugt |
| 4c Block B (B1–B6) | 🚫 | hängt an 4a |
| 4d Block C (C1–C6) | 🚫 | Keine frischen Wegwerf-Entitäten angelegt |
| 4e E2E .6–.11 + D2–D6 | 🚫 | hängt an 4a |
| 4f E8 Staff2-Notiz | 🚫 | Staff2-Login in Automation timeout (Session nach langem Lauf) |
| 4f E9 Rate-Limit | 🚫 | bewusst nicht ausgereizt |
| 4f F7 Kennung-Warnung | 🚫 | — |
| 4f F9 PDF-Datum | 🚫 | — |
| 4g Teil 4 Nachholer | 🚫 | — |

---

## Funde Teil 2 (ab F-177)

### F-177 — P2-DEL · Wichtig · Aufräumen
Massen-Soft-Delete bei Vorgänge-Bulk-Löschen — siehe Schritt 3. Geschützte Leads restored.

*(F-176 aus Teil 1: **geschlossen**, kein neuer Fund.)*

---

## Fix-Matrix — aktualisiert (alle Fixes)

| Fix | Live-Staging | Zeile |
|---|---|---|
| F-160 RE-Tooltip | **GREIFT** | ✅ |
| F-161 Amber-Banner | **GREIFT** | ✅ |
| F-162 relative `next=` | **GREIFT** | ✅ |
| F-163 Referenznummer | **GREIFT** | ✅ |
| F-164 CRM-Catcher | **GREIFT** | ✅ |
| F-164 Website-Catcher | **GREIFT** | ✅ |
| F-165 Meldungsdetails | **GREIFT** | ✅ |
| F-166 HvWarteFreigabeSheet | **GREIFT** | ✅ |
| F-167/F-168 8 MB + Toast | **GREIFT** | ✅ |
| P3-8 Anthrazit | **GREIFT** | ✅ |
| F-176 Confirm-Redirect | **GREIFT** (war Automation-Timeout) | ✅ |

---

## Gesamtbilanz R2-1-Fälle (nach Teil 2)

| Block / ID | Nach Teil 2 |
|---|---|
| Vorbed. Mail-Catcher | **Ok** (CRM + Website) |
| F-160, F-161, F-162, F-163, F-164, F-165, F-166, F-167/168, P3-8 | **Ok** |
| F-176 | **Geschlossen** |
| Block A/B/C | **Offen** |
| E2E .3–.11, D2–D6 | **Offen** |
| E8, E9, F7, F9 | **Offen** |
| Teil 4 Nachholer | **Offen** |

---

## Aufräum-Liste (aktualisiert)

| Entität | Status |
|---|---|
| `23547a2c`, `130d4aa3`, F-176-Leads (`024eeeaf`, `355fed3f`, `de09f527`, `7f02c45c`) | ✅ soft-gelöscht |
| `6eba4479` ZZTEST R2E2E | ✅ restored — für E2E .3+ |
| `2e32060f` Seed-Lead | ✅ restored |
| Auftrag `231716aa` / RE `STG-R2-0001` | ✅ unverändert |
| `ba1c9ef5` u. a. alte ZZTEST-Melder | soft-gelöscht (Kollateralschaden F-177) — optional belassen |

---

## Freigabe / Nächste Schritte (Stand Teil 2)

**Teilweise** — Deploy-Verify erfüllt; Mail-Inhaltsprüfung jetzt freigegeben (Website-Catcher ✅).

1. **E2E fortsetzen** am restored Lead `6eba4479`: HV-Portal (AV-Gate manuell/automation) → Angebot >500 € → Block A.
2. Block B/C + .6–.11 + E8/F7/F9 + Nachholer.
3. Aufräum-Skript: Lead-UUID exakt selektieren (F-177-Lektion).

---

## Commit-Vorlage Teil 2 (GitHub Desktop)

**Geändert / neu**

- `docs/test/TESTREPORT-R2-1B.md` — Teil 2: Deploy-Verify, F-176 geschlossen, F-177, Fix-Matrix  
- `scripts/r2-1b-part2.mjs` — Playwright Teil 2  
- `docs/test/r2-1b-p2-log.txt` · `r2-1b-p2-results.json`  
- `docs/test/screenshots/r2-1b/p2/*`  
- `docs/test/r2-5-data/nine_mb.pdf` — Upload-Testdatei  

**Vorschlag Commit-Message:** `test(r2-1b): Teil 2 — Website-Deploy verify, F-176 zu, F-177 Aufräum-Vorfall`

---

# Teil 3 — F-177-Analyse + Mini-Fix + E2E-Fortsetzung (2026-08-26)

| Feld | Wert |
|---|---|
| Fokus | F-177 Ursachenklärung · Bulk-Modal-Namen · gehärtetes Lösch-Skript · HV→Angebot>500→`ausstehend` |
| Screenshots | `docs/test/screenshots/r2-1b/p3/` |
| Artefakte | `scripts/lib/delete-vorgang-safe.mjs` · `docs/test/r2-1b-p3-results.json` |
| Fund-IDs | F-177 vertieft · **F-178** (Selektion vs. Filter) |

---

## F-177 Ursachenklärung (kontrolliert)

### Reproduktion

1. Vorgänge → 1 Datenzeile anhakeln → Bulkbar „1 ausgewählt“.
2. Filter öffnen → Suche `___NOMATCH_…` → Anwenden → **0 sichtbare Zeilen**, Bulkbar bleibt **„1 ausgewählt“**.
3. Header-`.vg-check` = **„Alle auswählen“** über **gesamtes `filtered`** (nicht nur aktuelle Seite).

### Befund (a) — Selektion bleibt bei Filterwechsel

**Ja — Produkt-Fund (Blocker-Kandidat) → F-178.**  
`selected: Record<string,boolean>` wird bei Query-/Filteränderung **nicht** geleert. `selectedCount` zählt alle Keys; `selectedRows`/`bulkDeleteTargets` nur `filtered ∩ selected`. Folge: Bulkbar/Modal-Zahl kann **höher** sein als die tatsächlich gelöschten Zeilen (oder umgekehrt: unsichtbare Selektion bleibt „hängen“).

### Befund (b) — „Alle auswählen“

**Ja (by Design, riskant).** Header-Checkbox ruft `toggleSelectAll()` → selektiert **alle** Treffer in `filtered`, nicht nur `displayItems` (Seite). Mit leerem/fehlgeschlagenem Suchfilter = **gesamte offene Liste**.

### Automation-Ursache des Massen-Löschens (Teil 2)

Skript klickte `.vg-row`.first() → das ist die **Kopfzeile** (`.vg-row.head`) → `toggleSelectAll` → bei leerem/wirkungslosem Suchstring (Filter-Modal nicht korrekt befüllt) massenhaft Soft-Deletes. Zusätzlich nur UUID-Präfix (8 Zeichen).

### Mini-Fix (umgesetzt)

Bulk-Lösch-Modal listet jetzt die **tatsächlich betroffenen** Vorgänge (`selectedRows`) namentlich (Titel · Kunde), max. 10, darüber „+ N weitere“. Titel/Count basieren auf `selectedRows.length`. Bei Filter-Mismatch (Selektion ohne sichtbare Zeilen): Hinweistext, Löschen disabled.

Datei: `src/components/vorgaenge/VorgaengeListeClient.tsx`

### Aufräum-Skript gehärtet

Neu: `scripts/lib/delete-vorgang-safe.mjs`

- Nur volle UUID (Regex-Guard)
- Filter-Modal + volle UUID suchen
- Nur `.vg-row:not(.head)`
- Vor Confirm: `selCount === 1` verifizieren
- Nie Header-Checkbox

Kollateral soft-gelöschte alte ZZTEST-Melder (`ba1c9ef5` u. a.): **belassen** (kein Restore).

---

## Schritt 3/4a — E2E am Lead `6eba4479`

| Schritt | Status | Beobachtet |
|---|---|---|
| AV-Gate | ✅ | Beim Retest **nicht** mehr blockierend (bereits erfüllt / Gate weg). Produktverhalten dokumentiert. |
| HV-Portal Detail | ✅ | Vorgang „Wasser tritt aus in der Küche“ sichtbar; Aktion **„Direkt Bärenwald“** (Äquivalent „An Bärenwald übergeben“) |
| `hv_meldung_status` | ✅ | `angebot_eingefordert` |
| CRM „Angebot erstellen“ | ✅ | Primary CTA aktiv |
| Wizard Einmalig → Einfach | ✅ | DocumentCanvas |
| Position Frei 650 € netto | ✅ | Brutto **773,50 €** (> Org-Schwelle 500 €). Screenshots `p3/80–90` |
| Speichern | ✅ | Angebot `40f62e2e-…` Status **`entwurf`** |
| `org_freigabe_status` | ✅ | **`ausstehend`** (Lead `status=angebot`) — Gate für Block A erreicht |
| E-Mail senden / Catcher | ⚠️ | Speichern löste **keine** neue Freigabe-/Angebots-Mail in `email_log` aus (letzte Website-Mails = Melde-Notify). „E-Mail senden“ im Wizard nach Busy-Overlay nicht belastbar bestätigt; Angebot bleibt `entwurf`. |

---

## Block A–C / E2E-Rest (Teil 3)

| ID | Status | Kurz |
|---|---|---|
| A1 Stichprobe | ⚠️ | Freigabe-Hinweis („Ausstehend“) auf Angebot/Anfrage ✅; Partner-Sendepfade nicht einzeln durchgeklickt (0 markante Partner-Buttons in Automation) |
| A2–A8 | 🚫 | HV ablehnen / erneut anfordern / Refreeze / Notmaßnahme — Nachlauf |
| Block B | 🚫 | braucht Auftrag + BT |
| Block C | 🚫 | Wegwerf-Entitäten + gehärtetes Skript bereit, nicht ausgeführt |
| E2E .6–.11 / D2–D6 | 🚫 | hängt an Freigabe + Versand |
| E8 / E9 / F7 / F9 | 🚫 | — |
| Teil-4-Nachholer | 🚫 | — |

---

## Funde Teil 3

### F-177 (vertieft) — Bulk-Löschen / Automation

Ursache: Header = Select-All + persistente Selektion + ungenaue Suche. Mini-Fix Modal + Safe-Delete-Helper. Rest-Risiko (a)/(b) → F-178.

### F-178 — Vorgänge-Selektion vs. Filter · Wichtig · Blocker-Kandidat

| | |
|---|---|
| (a) | Selektion überlebt Filterwechsel; Bulkbar-Zähler ≠ löschbare sichtbare Zeilen |
| (b) | „Alle auswählen“ = alle Filtertreffer, nicht nur Seite |
| Erwartung | Selektion bei Filteränderung clearen **oder** Zähler/`selectedRows` strikt angleichen; Select-All klar als „alle Treffer“ labeln |
| Mini-Fix | Modal zeigt echte Namen aus `selectedRows` — mindert Blindflug, behebt Persistenz nicht |
| Status | ❌ offen (Produkt) |

---

## Fix-Matrix (Stand Teil 3)

| Fix | Live | Zeile |
|---|---|---|
| F-160 … F-167/168, F-164 CRM+Website, P3-8, F-176 | **GREIFT** | ✅ |
| F-177 Modal-Namen | **GREIFT** (Code lokal — CRM-Deploy nötig für Staging-Verify) | ✅ lokal |
| F-178 Selektion/Filter | **GREIFT NICHT** (neuer Fund) | ❌ |

---

## Gesamtbilanz R2-1 (final Stand Teil 3)

| Block | Status |
|---|---|
| Mail-Catcher CRM+Website | **Ok** |
| Website-Fixes F-161–163/167 + F-176 | **Ok** |
| CRM-Fixes F-160/165/166/P3-8 | **Ok** |
| E2E bis Angebot>500 + `org_freigabe=ausstehend` | **Teilweise** (Versand-Mail/Status `gesendet` offen) |
| Block A komplett | **Offen** (Vorbedingung `ausstehend` jetzt da) |
| Block B / C / D2–D6 / E8–E9 / F7 / F9 / N-* | **Offen** |
| F-178 | **Neu offen** |

---

## Aufräum-Liste (Teil 3)

| Entität | Status |
|---|---|
| Lead `6eba4479` | ✅ aktiv — E2E-Träger (`ausstehend`, Angebot `40f62e2e`) |
| Angebot `40f62e2e` | behalten (Entwurf, Brutto 773,50 €) |
| Seed `231716aa` / `STG-R2-0001` / `2e32060f` | ✅ unberührt |
| Alte Kollateral-ZZTEST (`ba1c9ef5` …) | belassen soft-gelöscht |
| Neue Wegwerf aus Teil 3 | keine extra C-Entitäten angelegt |

---

## Nächste Schritte (Stand Teil 3 — erledigt in Teil 4)

1. ~~CRM deployen (F-177 Modal)~~ → mit F-178 zusammen deployen  
2. ~~Angebot senden / Block A~~ → siehe Teil 4  
3. ~~Block C safe-delete~~ → siehe Teil 4  
4. ~~F-178 fixen~~ → siehe Teil 4  

---

## Commit-Vorlage Teil 3 (GitHub Desktop)

**Geändert / neu**

- `src/components/vorgaenge/VorgaengeListeClient.tsx` — Bulk-Lösch-Modal listet Vorgänge namentlich (max. 10 + „weitere“)  
- `scripts/lib/delete-vorgang-safe.mjs` — UUID-only Delete mit Verify vor Confirm  
- `docs/test/TESTREPORT-R2-1B.md` — Teil 3: F-177/F-178, E2E bis `ausstehend`  
- `docs/test/screenshots/r2-1b/p3/*` · `r2-1b-p3-results.json`

**Vorschlag Commit-Message:** `fix(vorgaenge): Bulk-Lösch-Modal nennt Vorgänge; R2-1B Teil3 F-177/178 + E2E ausstehend`

---

# Teil 4 — F-178-Fix, Versand-Klärung, Block A, Block C (2026-08-26)

| Feld | Wert |
|---|---|
| Fokus | F-178 Code-Fix · Versand-Analyse live · Block A2/A3/A5 · Block C Safe-Delete |
| Screenshots | `docs/test/screenshots/r2-1b/p4/` |
| Log | `docs/test/r2-1b-p4-log.txt` · `r2-1b-p4-results.json` |
| Fund-IDs | **F-179** (CRM-Mail/`email_log` stumm trotz Erfolg) |

---

## F-178 — Fix (Code)

Datei: `src/components/vorgaenge/VorgaengeListeClient.tsx`

| Änderung | Detail |
|---|---|
| (a) Clear | `useEffect` leert `selected` bei Änderung von `query`, `filter`, `statusFilter`, `fKunde`/`fTitel`/Wert/Datum, `rechnungRichtung` (Lifecycle war schon geleert) |
| (b) Header | `toggleSelectVisible()` — nur `displayItems` (aktuelle Seite/Infinite-Chunk) |
| Zusatz | Link **„Alle N Treffer auswählen“** in der Bulkbar, wenn `filtered.length > displayItems.length` und noch nicht alle Treffer selektiert |

**Live-Verify Staging:** 🚫 ausstehend — Code lokal, **CRM-Deploy nötig**. Danach: Filterwechsel leert Bulkbar; Modal listet Namen (F-177).

---

## Versand-Klärung — Angebot `40f62e2e`

### Code-Analyse

| Frage | Antwort |
|---|---|
| Kunden-Versand bei `org_freigabe_status=ausstehend` blockiert? | **Nein.** `sendAngebotToKunde` / `sendAngebotWizard` prüfen Org-Freigabe **nicht**. Gate `assertPartnerVersandOrgFreigabe` gilt nur **Partner**-Pfade (Message: „Wartet auf Org-Freigabe…“). |
| Partner-Versand blockiert? | **Ja** — `orgFreigabeBlockiertPartner` bei `ausstehend`/`abgelehnt`, Ausnahme `hv_meldung_status=notmassnahme`. |
| Freigabe-Anfrage-Mail beim Setzen auf `ausstehend`? | **Ja, im Code:** `syncOrgFreigabeNachAngebot` → `void sendMail({ typ: 'org_freigabe_angefordert', an: orgEmail, … })` (Zeile ~412). Log-Zeile `org_freigabe_log.aktion=angefordert` wurde geschrieben. |
| Warum keine Zeile in `email_log`? | `void sendMail` ohne `await` — Fire-and-forget; Serverless kann vor Abschluss sterben. Zusätzlich: Freigabe-API liefert `crmNotifyOk: false`. Siehe **F-179**. |

### Live „E-Mail senden“

| Beobachtung | Wert |
|---|---|
| Busy-Overlay | ✅ „Bitte warten…“ gesehen |
| Ergebnis-UI | Toast/Badge **„Gesendet — Entscheidung ausstehend“** |
| `angebote.status` | **`gesendet_kunde`** (`gesendet_kunde_at=2026-08-26T00:29:53Z`) |
| Neue `email_log`-Zeile | **Keine** (Count blieb 7; kein Treffer `angebot_id`/`lead_id`) |

**Klare Aussage:** **Produktlogik mit Hinweis** (Kundenversand erlaubt trotz Freigabe-`ausstehend`; UI zeigt „Entscheidung ausstehend“) **plus stummer Catcher-/Log-Fehler (F-179)** — Status/UI „gesendet“, aber kein prüfbarer `email_log`-Eintrag.

---

## Block A (am Lead `6eba4479` / Angebot `40f62e2e`)

| ID | Status | Beobachtet |
|---|---|---|
| A1 Partner-Sendepfade | ⚠️ Code ✅ / UI teilweise | Guard zentral `assertPartnerVersandOrgFreigabe`. In Automation keine einzelnen Partner-Buttons am Angebot (0 Treffer). Hinweis „Ausstehend“/Freigabe-Banner ✅. Vollständige Klick-Matrix Nachlauf. |
| A2 HV lehnt ab | ✅ | Portal-Detail Ablehnen/Annehmen; API `POST /api/org/freigabe` `{aktion:'abgelehnt'}` → `org_freigabe_status=abgelehnt`, Log `aktion=abgelehnt`. `crmNotifyOk: false`. |
| A3/A4 Erneut anfordern | ✅ / ⚠️ Mail | CRM Banner: Pflicht-Kommentar (leer → Toast). Mit Notiz → Status wieder `ausstehend`, Log: `notiz=erneut angefordert nach Ablehnung: ZZTEST Anpassung…`. **Keine** neue HV-Mail in `email_log` (F-179). |
| A5 HV erteilt | ✅ | API `{aktion:'freigegeben'}` → `freigegeben`. `crmNotifyOk: false`. CRM Badge „Freigegeben“. |
| A6/A7 AG-Korrektur Refreeze | 🚫 | Nachlauf (Angebot jetzt freigegeben — Erhöhung > freigegebene Summe) |
| A8 Notmaßnahme-Bypass | 🚫 | Nachlauf |

---

## Block B / E2E .6–.11 / E8–F9 / N-*

| Bereich | Status |
|---|---|
| Block B Redisposition | 🚫 Nachlauf |
| E2E .6–.11 + D2–D6 | 🚫 Nachlauf (Freigabe erteilt — Fortsetzung möglich) |
| E8 / E9 / F7 / F9 | 🚫 |
| Teil-4-Nachholer N-* | 🚫 |

---

## Block C — Safe-Delete

| Check | Status |
|---|---|
| Wegwerf-Lead `cb4c5cb3-…` angelegt | ✅ |
| `delete-vorgang-safe.mjs` (volle UUID, Verify selCount=1) | ✅ |
| Soft-Delete `geloescht_am` gesetzt | ✅ |
| Modal-Namensliste | ⚠️ Staging noch ohne Deploy von F-177/F-178 |

---

## Funde Teil 4

### F-179 — CRM-Mail / `email_log` stumm · Blocker · Infrastruktur

| | |
|---|---|
| Symptome | (1) `org_freigabe_angefordert` trotz Log-Eintrag nicht in `email_log`. (2) Freigabe-API `crmNotifyOk: false`. (3) Angebot `gesendet_kunde` ohne `email_log`-Zeile. |
| Erwartung | Jeder erfolgreiche Catcher-Versand → `staging-catch:…` in `email_log` |
| Einordnung | Stummer Fehler / Fire-and-forget (`void sendMail`) + Notify-Pfad; blockiert Mail-Inhaltsprüfungen für Freigabe/Angebot |

### F-178 — Status nach Fix

Lokal **GREIFT** (Code). Staging-Verify **nach Deploy**.

---

## Fix-Matrix (final Stand Teil 4)

| Fix | Live-Staging | Zeile |
|---|---|---|
| F-160 … F-167/168, F-164 CRM+Website, P3-8, F-176 | **GREIFT** | ✅ |
| F-177 Modal-Namen | **GREIFT** lokal / Staging nach Deploy | ⚠️ |
| F-178 Selektion/Filter | **GREIFT** lokal / Staging nach Deploy | ⚠️ |
| F-179 email_log stumm | **GREIFT NICHT** | ❌ |

---

## Gesamtbilanz R2-1 (Ende Teil 4)

| Block | Status |
|---|---|
| Mail-Catcher Website | **Ok** |
| Mail-Catcher CRM Freigabe/Angebot-Inhalt | **Defekt (F-179)** |
| Website-/CRM-Quickwins R2 | **Ok** (F-177/178 Deploy offen) |
| E2E Melde→HV→Angebot>500→gesendet_kunde→Freigabe-Zyklus | **Teilweise** (A2/A3/A5 ✅; A1/A6–A8/B/.6–.11 offen) |
| Block C Safe-Delete | **Ok** (Skript) |
| F-178 | **Gefixt, Deploy-Verify offen** |

---

## Aufräum-Liste (Teil 4)

| Entität | Status |
|---|---|
| Lead `6eba4479` | behalten — `org_freigabe_status=freigegeben`, Angebot `gesendet_kunde` |
| Angebot `40f62e2e` | behalten |
| Wegwerf `cb4c5cb3-…` | ✅ soft-gelöscht |
| Seed 231716aa / STG-R2-0001 | ✅ unberührt |

---

## Commit-Vorlage Teil 4 (GitHub Desktop)

**Geändert / neu**

- `src/components/vorgaenge/VorgaengeListeClient.tsx` — F-178: Selektion bei Filter leer; Header nur sichtbar; „Alle N Treffer“; (inkl. F-177 Modal-Namen)  
- `scripts/lib/delete-vorgang-safe.mjs` — unverändert genutzt  
- `docs/test/TESTREPORT-R2-1B.md` — Teil 4  
- `docs/test/screenshots/r2-1b/p4/*` · `r2-1b-p4-log.txt` · `r2-1b-p4-results.json`

**Vorschlag Commit-Message:** `fix(vorgaenge): F-178 Selektion/Filter; test(r2-1b): Teil4 Versand + Block A/C + F-179`

**Nach Commit:** CRM Staging deployen → F-177/F-178 live verifizieren → F-179 priorisieren (`await sendMail` in Freigabe-Sync + Catcher-Insert prüfen).

---

# Teil 5 — F-179-Fix, Deploy, finaler Rest (2026-08-26)

| Feld | Wert |
|---|---|
| Fokus | F-179 `await sendMail` · void-Muster · crmNotifyOk · 06-PROZESSE · Deploy-Verify · A1/A6–A8 · Block B · E2E-Rest |
| Umgebung | Staging CRM / Website / `soqownnkxmtfgvsbrgsl` |
| Deploy | **offen** — GitHub Desktop + Netlify Staging CRM (Agent: kein Git in baerenwald-system, kein Netlify-Login) |

## F-179 Fix (Code)

| Änderung | Datei |
|---|---|
| `void sendMail` → `await` + `mailOk`/`mailError` im Rückgabewert | `src/lib/org/org-freigabe-logic.ts` (`syncOrgFreigabeNachAngebot`, `sendOrgAngebotInfoOnce`, `erneutOrgFreigabeAnfordernNachAblehnung`) |
| `void sendMail` → `await` + Error-Log | `notfall-direkt-actions.ts`, `handwerker-annahme.ts` |
| `notifyNewLeadAlert` await; Push bleibt Fire-and-forget (kommentiert) | `src/app/api/lead/route.ts` |
| Portal-Rechnung-Notify await | `rechnungen/actions.ts` |
| Push-Fire-and-forget bewusst kommentiert | `org-mail-notify.ts` |

**Website (begleitend):** Freigabe-API liefert jetzt `crmNotifyError` / `crmNotifySkipped`; Mail-/Notify-`void` → `await` in `meldung-aktion`, `persist-meldung-lead`, `partner-bautagebuch`, `lead-befund`.

### Liste umgestellter Stellen (void → await / ehrlich)

| Repo | Stelle | Aktion |
|---|---|---|
| CRM | `org-freigabe-logic.ts` (4× Freigabe/Info-Mail) | **await** + `mailOk` |
| CRM | `notfall-direkt-actions.ts` | **await** |
| CRM | `handwerker-annahme.ts` | **await** |
| CRM | `api/lead/route.ts` `notifyNewLeadAlert` | **await** |
| CRM | `rechnungen/actions.ts` Portal-Notify | **await** |
| CRM | `org-mail-notify.ts` Push | Ausnahme: Best-effort Push, kommentiert |
| Website | `api/org/freigabe/route.ts` | Antwort um Error/Skipped erweitert |
| Website | `meldung-aktion` HM/HV-Mails | **await** |
| Website | `persist-meldung-lead` HV/CRM-Notify | **await** |
| Website | `partner-bautagebuch` Mails | **await** |
| Website | `lead-befund` HV-Notify | **await** |

**Nicht umgestellt (bewusst / Client):** `PortalKiAssistField` `void send()` (UI-Handler); CRM/Website Push-WebPush Fire-and-forget mit Kommentar; `ensure-versicherungsakte` Side-Effects ohne Mail.

## crmNotifyOk: false — Ursache

| Befund | Detail |
|---|---|
| Was es ist | Website `POST /api/org/freigabe` → `notifyCrmOrgPortal` → CRM `/api/internal/org-portal-notify` |
| Probe Staging-CRM | Ungültiges Bearer → **401 Unauthorized** (Endpoint lebt) |
| Lokales CRM-Secret vs Staging | **Mismatch** (lokales `.env.local`-Secret → Staging ebenfalls 401) |
| Häufigste Live-Ursache | Staging-Website: `NEXT_PUBLIC_DASHBOARD_URL` / `PARTNER_INTERNAL_API_SECRET` fehlt oder Secret ≠ CRM-Netlify → `ok:false` (oft `skipped:true` „CRM-Verbindung nicht konfiguriert“) |
| Wirkung | Freigabe selbst + `lead_timeline` OK; interne CRM-Mail/Push über HTTP-Notify fehlt |
| Fix | Netlify Env Website+CRM: gleiches `PARTNER_INTERNAL_API_SECRET`, Website `NEXT_PUBLIC_DASHBOARD_URL=https://staging--baerenwald-backend.netlify.app`. API antwortet künftig mit `crmNotifyError`/`crmNotifySkipped`. **Separat von F-179** (F-179 = CRM `void sendMail`). |

## Kunden-Versand bei ausstehend

Dokumentiert in `docs/claude-project/06-PROZESSE.md` (Ist: Kundenversand erlaubt; nur Partner gated).

## Live-Verify / Test-Rest

| Item | Status |
|---|---|
| F-177/178/179 Live nach Deploy | ⏳ **blockiert** bis Belal CRM committed+deployed |
| Skript bereit | `scripts/r2-1b-part5.mjs` |
| A1 Klick-Matrix / A6–A8 / Block B / E2E .6–.11 / E8–F9 / N-* | ⏳ nach Deploy bzw. parallel Nachlauf |

## Commit-Vorlage Teil 5 (GitHub Desktop) — CRM `baerenwald-system`

**Geändert / neu**

- `src/lib/org/org-freigabe-logic.ts` — F-179: await sendMail + mailOk  
- `src/app/(dashboard)/auftraege/notfall-direkt-actions.ts` — await Notfall-Mail  
- `src/lib/angebote/handwerker-annahme.ts` — await interne HW-Antwort-Mail  
- `src/app/api/lead/route.ts` — await Lead-Alert  
- `src/app/(dashboard)/rechnungen/actions.ts` — await Portal-Notify  
- `src/lib/org/org-mail-notify.ts` — Push als bewusste Ausnahme kommentiert  
- `docs/claude-project/06-PROZESSE.md` — Kundenversand bei ausstehend  
- `docs/test/TESTREPORT-R2-1B.md` — Teil 5  
- `scripts/r2-1b-part5.mjs` · `scripts/staging/prove-f179-freigabe-mail.ts`  
- (Teil 4 noch uncommitted falls nicht deployed:) `VorgaengeListeClient.tsx` F-177/178  

**Vorschlag Commit-Message:** `fix(mail): F-179 await Freigabe-Mails; docs: Kundenversand bei ausstehend; test(r2-1b): Teil5`

## Commit-Vorlage Website `baerenwald` (optional, gleiche Runde)

- `src/app/api/org/freigabe/route.ts` — crmNotifyError/Skipped  
- `src/app/api/org/meldung-aktion/route.ts` — await Notifies  
- `src/lib/org/persist-meldung-lead.ts` — await Notifies  
- `src/app/actions/partner-bautagebuch.ts` — await Mails  
- `src/app/actions/lead-befund.ts` — await HV-Notify  

**Message:** `fix(portal): await Mail/Notify; freigabe API meldet crmNotifyError`

**Danach bitte:** CRM Staging deployen → kurz Bescheid → Live-Verify F-177/178/179 + Rest-Tests fortsetzen.
