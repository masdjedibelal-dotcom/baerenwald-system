# ABNAHME — Staging final (2026-08-26)

| Feld | Wert |
|---|---|
| Umgebung | CRM `staging--baerenwald-backend.netlify.app` · Website `staging--baerenwald.netlify.app` · Supabase Staging `soqownnkxmtfgvsbrgsl` |
| Methode | Playwright Smoke + Fix-Verify + E2E-Ansatz + SQL (`email_log`) · Confirms stets dismissed |
| Skripte | `npm run staging:smoke-aktionen` · `scripts/staging/abnahme-verify.mjs` · `scripts/staging/abnahme-e2e.mjs` |
| Artefakte | `AKTIONS-SMOKE-R3.md` / `…-STAFF2.md` · `abnahme-verify-results.json` · `abnahme-e2e-results.json` · `docs/test/screenshots/abnahme/` |
| Gesamturteil | **GELB** — Smoke 0 ❌/💥; A–D weitgehend grün; E2E .1–.2b ok, .3–.11 nicht voll durchgestochen (F-176 + Zeit); 1 neuer PDF-Fund |

---

## 1. Smoke-aktionen (admin + Staff2)

| Lauf | ✅ | 🔒 | ⏭️ | ❌ | 💥 | EXIT |
|---|---:|---:|---:|---:|---:|---|
| Admin (`admin@…`) | 54 | 1 | 27 | **0** | **0** | 0 |
| Staff2 (`staff2@…`) | 55 | 1 | 26 | **0** | **0** | 0 |

Erwartung **0 ❌/💥** erfüllt.

Hinweise Smoke:
- PRODSIM-Suche ✅ (3 Treffer).
- Admin-Smoke markierte RE-⋯ zunächst ⏭️ (Selector) — **Nachzug Verify: Overflow `aria-label="Weitere Aktionen"` mit PDF / Storno·Korrektur / Zahlungserinnerung / Löschen ✅**.
- Smoke-Selector in `smoke-aktions-matrix.mjs` auf `button[aria-label="Weitere Aktionen"]` korrigiert (nächster Lauf misst ✅/❌ statt Skip).

---

## 2. Fix-Verify Stichproben A–D

| ID | Thema | Ergebnis | Kurz |
|---|---|---|---|
| A1 | Gutschrift-PDF-Titel | ⚠️→**Fund A-01** | UI zeigt Gutschrift (`GS-RE2026-2069`). Code `rechnungDokumentTitel` → „Gutschrift“/„Stornorechnung zu …“. **PDF-Route** `/api/rechnungen/537d9dbf-…/pdf` → `{"message":"Rechnung nicht gefunden"}` |
| A3 | Notfall-Badge | ⚠️ | Kein `ist_notfall`-Datensatz live sichtbar; Badge-Logik Code vorhanden (`resolve-vorgang` / Liste) |
| A5 | Termin-Mail default aus | ✅ | `TerminModal`: bei HV-Kanal `mailOff` → Toggle **aus** (`isHvKanal`) |
| A7 | Suche findet HV/Org | ✅ | „Musterverwaltung“ → Treffer |
| A8 | Freigabe-Label | ✅ | Freigabe-Text am Lead |
| A9 | Abnahme-Karte Portal | ⚠️ | HV-Portal Login ✅ (Musterverwaltung Nord); **keine Abnahme-Karte** im aktuellen Seed-Vorgang |
| B1 | RE-Detail-⋯ alle Aktionen | ✅ | PDF, Storno/Korrektur, Zahlungserinnerung, Löschen |
| B1 | Mahnung-Modal | ✅ | Nach Reset LEGACY-RE `…023` auf `gesendet` öffnet Modal (vorher fail wegen Status `bezahlt` nach Smoke) |
| C1 | Empty-Hints | ✅ | Code-Verify + Listen laden |
| C3 | Login-Spinner | ⚠️ | Busy oft zu schnell für Automation; Code: Spinner+Overlay |
| C3 | Callback-Splash | ✅ | „Anmeldung wird abgeschlossen“ |
| C5 | Toasts nach Mutationen | ✅ | Staff2 „Als bezahlt“ + Smoke-Mutationen |

---

## 3. E2E .1–.11 (ZZTEST-HV >500 €)

| Schritt | Status | Kurz |
|---|---|---|
| .1 Melde → Confirm | ⚠️ **F-176** | Funnel inkl. Ort&Kontakt + Absenden ✅; Lead in DB (`cc565fe3-…`, soft-gelöscht). UI bleibt oft auf Funnel-URL mit „Meldung wird gesendet…“ — Confirm/CTA unzuverlässig |
| .1 Lead-DB | ✅ | Lead angelegt (`neu`) |
| .2 CRM-Kontext | ✅ | Lead im CRM öffnet |
| .2b HV-Übergabe-Sheet | ✅ | Primary „Warte auf HV / Hausmeister“ → Sheet mit Portal/Freigabe-Schritten |
| .3 Angebot >500 € | ⚠️ | Bestand-Angebot `40f62e2e` (`gesendet_kunde`) am Lead `6eba4479` öffnet; **kein frischer >500€-Durchstich** aus neuer Melde (Gate/Zeit) |
| .4 Partner / Zuweisung | ⚠️ | Seed-Auftrag `231716aa-…` (`in_arbeit`) CRM ✅; Partner-Portal-Login in Automation flaky (Landing statt App) |
| .5 Freigabe ablehnen→erneut→erteilen | ⚠️ | Freigabe-**Label** ✅; Live-Buttons ablehnen/erteilen am Seed-Lead nicht angeboten (Status) |
| .6 AG-Korrektur-Refreeze | ⏭️ | hängt an frischem >500€-Pfad |
| .7 HW-Tausch + BT | ⏭️ | hängt an .4/.6 |
| .8 Nachtrag | ⏭️ | hängt an Auftrag-Pfad |
| .9 Abnahme m. Mängeln → Mieter-Gate | ⏭️ | Auftrag-Tabs: Übersicht / Leistungen / Zahlung / Akte — kein Abnahme-Tab am Seed |
| .10 Mails `email_log` | ✅ Stichprobe | Inhalt geprüft (s. §3.1); **kein voller Mail-Satz dieses Durchstichs** |
| .11 Abschlag + Schluss | ⏭️ | hängt an Abnahme/RE-Pfad |

### 3.1 `email_log` Inhalts-Stichprobe

| typ | status | betreff / Inhalt |
|---|---|---|
| `website` | `gesendet` | „Neue Meldung: Wasser tritt aus in der Küche“ — Body mit Leopold/Staging |
| `website` | `gesendet` | „Wir kümmern uns um Ihren Vorgang — WEG Leopold 10“ |
| `crm_password_reset` | `caught_staging` | CRM-Reset Staff2 — Catcher greift |
| `update_hinweis` | `gesendet` | Portal-Link-Tests (älter) |

Website-Mails erscheinen als `gesendet` (nicht nur `caught_staging`) — Catcher-Lage gemischt; inhaltlich plausible Staging-Texte.

---

## 4. ALTDATEN (Staff2, Teil B/C/D)

| Teil | Prüfung | Ergebnis |
|---|---|---|
| B | PRODSIM-Kunden ≥1 + Detail Staff2 | ✅ `PRODSIM-Ralf Mörth` |
| B | LEGACY-fremd RE „Als bezahlt“ Staff2 | ✅ (nach Status-Reset `gesendet`) |
| C | Dead-Ref Orphan-Auftrag `…034` | ✅ lädt ohne Application-Error |
| D | Lead Alt-Status `in_bearbeitung` | ✅ Rohwert/Badge |
| D | Angebot Alt-Status `versendet` | ✅ (nicht fälschlich „Entwurf“) |
| D | Auftrag Alt-Status `wartend` | ✅ |
| D | RE Alt-Status `teilbezahlt` | ✅ |

---

## 5. Regressions-Kern R2-3 (12 Fälle, Schnell)

| ID | Ergebnis | Kurz |
|---|---|---|
| R-01 Melde | ✅ | Funnel startet |
| R-02 Cookie | ✅ | Consent-Buttons |
| R-03 Impressum | ✅ | Footer-Link |
| R-04 Notiz | ⚠️ | Textarea am Lead nicht zuverlässig gefunden |
| R-05 CSV | ✅ | Export-Control |
| R-06 Mobile | ✅ | 375px kein H-Scroll |
| R-07 Unauth | ✅ | `/anfragen` → `/login` |
| R-08 Wizard | ✅ | `/angebote/neu` lädt |
| R-09 HV-Portal | ✅ | Login → Dashboard Musterverwaltung Nord |
| R-10 Partner | ⚠️ | Automation landet auf Marketing/Login; historisch R2-3 ✅ mit Zuweisung |
| R-11 CTA | ⚠️ | hängt an stabilem Confirm (F-176) |
| R-12 Org-Farbe | ⏭️ | Seed `org_primary_color = null` |

---

## 6. Aufräumen

| Aktion | Ergebnis |
|---|---|
| ZZTEST-Abnahme-Lead `cc565fe3-…` | Soft-Delete (`geloescht_am`) |
| LEGACY-RE `…023` | Status wieder `gesendet` (Smoke hatte `bezahlt`) |
| Seed-Auftrag Notfall-Flag | unverändert/`false` (kein Dauer-Seed-Change) |
| Bestand-E2E-Lead `6eba4479` | **behalten** (Angebot `gesendet_kunde`) |
| LEGACY-/PRODSIM-Seeds | nicht gelöscht |

---

## 7. Abschlussbilanz Aufträge A–E

| Auftrag | Note | Begründung |
|---|---|---|
| **A** Parität / Fachlogik | **GELB** | Suche, Freigabe-Label, Termin-Mail-Default ✅; Gutschrift-PDF-API 404 (**A-01**); Notfall-Badge live ⚠️; Portal-Abnahme-Karte Seed-abhängig ⚠️ |
| **B** ⋯-Menus / Aktionen | **GRÜN** | RE-Overflow vollständig + Mahnung-Modal ✅; Smoke 0 ❌ |
| **C** UX Loading / Empty / Toasts | **GRÜN** | Callback-Splash, Empty-Hints, Toasts ✅; Login-Spinner nur Automation-Timing ⚠️ |
| **D** Sprache / InfoTips / Copy | **GRÜN** | Fundliste D1–D4 erledigt; Deploy vorausgesetzt |
| **E** Hygiene / Staging | **GELB** | Staging deployed + Smoke grün; voller E2E .3–.11 und Mail-Vollsatz offen |

---

## 8. Offene Funde (priorisiert)

| Prio | ID | Thema | Einordnung |
|---|---|---|---|
| **P1** | **A-01** | Gutschrift-PDF `/api/rechnungen/537d9dbf-…/pdf` → „Rechnung nicht gefunden“ trotz Detail-UI | Blocker für A1-Abnahme PDF |
| **P1** | **F-176** | Melde-Confirm-Redirect unzuverlässig nach Absenden (Lead trotzdem in DB) | Blocker E2E-.1 CTA / R-11 |
| **P2** | **E2E-Rest** | .3–.11 frischer HV→>500€→Freigabe→Partner→Abnahme→RE nicht in diesem Lauf | Nachzug-Session |
| **P2** | **R-10** | Partner-Portal-Login in Automation flaky | manuell/R2-3 historisch ok |
| **P3** | **A3** | Notfall-Badge ohne Live-Seed schwer zu sehen | Seed `ist_notfall` oder Akut-Pfad |
| **P3** | **A9** | Abnahme-Karte im HV-Portal am aktuellen Vorgang nicht sichtbar | braucht Abnahme-fähigen Auftrag |
| **P3** | **B-05** | Schwebender Text (C7) | Backlog, wartet auf Screenshot |

---

## 9. Commit-Vorlage (GitHub Desktop)

Geänderte / neue Dateien in `baerenwald-system`:

1. `scripts/staging/smoke-aktions-matrix.mjs` — RE-Overflow-Selector auf `Weitere Aktionen` (fail statt stiller Skip).
2. `scripts/staging/abnahme-verify.mjs` — Abnahme-Lauf A–D / ALTDATEN / R2-3 / Melde-Ansatz.
3. `scripts/staging/abnahme-e2e.mjs` — E2E-Nachzug Ort&Kontakt, Mahnung, Staff2, Cleanup.
4. `docs/test/AKTIONS-SMOKE-R3.md` + `aktions-matrix-r3-results.json` — Admin-Smoke.
5. `docs/test/AKTIONS-SMOKE-R3-STAFF2.md` + `aktions-matrix-r3-staff2-results.json` — Staff2-Smoke.
6. `docs/test/abnahme-verify-results.json` + `abnahme-e2e-results.json` — Rohdaten.
7. `docs/test/ABNAHME.md` — dieser Report.
8. `docs/test/screenshots/abnahme/` — Screenshots Melde/R2-3.

**Vorschlag Commit-Message:**  
`test(staging): Abnahme-Lauf Smoke+Verify+E2E-Ansatz, Report ABNAHME.md`
