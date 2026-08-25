# TESTREPORT — R2-Etappe 2 (Nachholer + E2E-Durchstich)

| Feld | Wert |
|---|---|
| Etappe | R2-2 — Nachholer + kompletter E2E |
| Datum | 2026-08-25 |
| Umgebung | Staging CRM · Website · Supabase `soqownnkxmtfgvsbrgsl` |
| Methode | Playwright (Confirms stets dismissed) + SQL |
| Automation | `scripts/r2-2-e2e-partial.mjs` · Hilfsmodul `scripts/lib/funnel-nav.mjs` (Option → Weiter) |
| Screenshots | `docs/test/screenshots/r2-2/` |
| Mail-Ablage | `docs/test/r2-2-mails/` (siehe Catcher-Hinweis) |
| PDF-Ablage | `docs/test/r2-2-pdfs/` (leer — Versand-/PDF-Schritte nicht erreicht) |
| Fund-IDs | fortlaufend ab **F-162** (F-160/F-161 aus R2-1) |

---

## Catcher-Status (kritisch)

| Prüfung | Ergebnis |
|---|---|
| `email_log` Zeilen gesamt | **0** (auch nach Melde-Submit) |
| CRM-Catcher-Code | schreibt bei Catcher `resend_id = staging-catch:…` + Log `[mail-catcher:crm-sendMail]` |
| Website-Catcher-Code | nur `console.info("[mail-catcher:website-sendBrandedMail]")` — **kein** `email_log`-Insert |
| Resend-Dashboard | hier nicht einsehbar |
| Folge | **Kein prüfbarer Mail-Inhalt in DB.** CRM-Versand-Flows (.3 Versand, .10 RE-Mails, N-19 Mahnung) in dieser Session **nicht** als „Catcher-Verify“ abgeschlossen. Auftrag laut Drehbuch erlaubt Versand — aber ohne Catcher-Beleg in `email_log` keine inhaltliche Mail-Prüfung möglich. |

---

## E2E-Rerun (2026-08-26) — Lauf abgebrochen

Der **Wiederholungslauf** (`e2e-partial-log.txt`: „stuck — no weiter“ bei **„Was ist das Problem?“**) ist **ungültig** — Bestätigungsseite nie erreicht.

| Log-Zeilen | Status | Einordnung |
|---|---|---|
| `CONFIRM CTA bw=…` / `CONFIRM ref=…` | **Lauf abgebrochen** | Kein Beweis gegen/for CTA-Fix (F-042) |
| `LEAD HV-Meldung=false` auf `/vorgaenge?tab=anfrage` | **Lauf abgebrochen** | Kein Lead geöffnet (`leadId=null`); kein Gegenbeweis zu E2E-.2 |

**Ursache (alt):** Skript klickte **Weiter** ohne vorherige Kachel-Auswahl. **Fix (2026-08-26):** `scripts/lib/funnel-nav.mjs` — an Options-Schritten erst `.funnel-tile` wählen, dann `funnel-footer-next`. Rerun kommt durch „Was ist das Problem?“ bis ABSCHLUSS/Absenden.

**Erste Session (Screenshots `e2e-01-*.png`)** bleibt maßgeblich für F-162/F-163 und E2E-.1/.2, sofern der abgebrochene Rerun-Lauf widerspricht.

---

## Seed-Auftrag 231716aa — SQL + Chip „Auftrag 0“

| Prüfung | Ergebnis (Staging `2026-08-26`) |
|---|---|
| Auftrag `231716aa-…` | ✅ `status=in_arbeit`, Titel „ZZTEST-R2 Elektro WE 12“, Lead `2e32060f-…` |
| Partner-Zuweisung | ✅ `auftrag_handwerker`: Elektro `6f9b423c-…`, `status=angenommen`, Preis 890 € |
| Lead | ✅ `status=auftrag`, nicht gelöscht |

**Warum Vorgänge-Chip „Auftrag 0“ trotzdem?** Kein Datenverlust — **Phasen-Auflösung**:

1. Pro Lead gewinnt **eine** Zeile in der Liste (`resolve-vorgang.ts`): aktive **Rechnung** vor **Auftrag**.
2. Seed-RE `STG-R2-0001` (`c770d2da-…`, `status=gesendet`, `auftrag_id=231716aa-…`) → Vorgang zählt als **`phase=rechnung`**.
3. Chip-Zähler (`VorgaengeListeClient.tsx` `counts`): `Auftrag` = Zeilen mit `phase === 'auftrag'` in `lifecycleRows` (Standard: nur **offen**). Seed erscheint unter **Rechnung 1**, nicht Auftrag.

→ **Kein Fund** (Design). Auftrag existiert in DB und Detail; Listen-Chip spiegelt **aktuelle Stamm-Phase** wider.

---

### ZZTEST-Artefakte (diese Etappe)

| Typ | Wert |
|---|---|
| Lead | `6eba4479-f520-4232-9e95-f3708fb0216c` |
| Melder | ZZTEST R2E2E · `zztest.r2.e2e@example.test` |
| Token | `dkMROqEiyrxnOHnLQuRjkOGNHNNxiA0-` |
| Status-URL | `/melden/status/dkMROqEiyrxnOHnLQuRjkOGNHNNxiA0-` |
| Org/Objekt | Musterverwaltung Nord · Leopold 10 |
| `kanal` | `hv_melder_link` |
| `org_freigabe_status` | `nicht_noetig` (noch kein Angebot) |
| `status` / `hv_meldung_status` | `neu` / `neu` |

---

### R2-E2E-.1 — Melde + Bestätigung · ⚠️ Teilweise · F-162 / F-163

| | |
|---|---|
| Screenshot | `e2e-01-confirm.png`, `e2e-01-status.png`, Funnel `ok-s*.png` |
| Erwartet | Funnel+Foto; Bestätigung mit **neutralem** CTA; Referenz sichtbar; Status-Link |
| Beobachtet | Funnel inkl. Foto + Absenden ✅. CTA: **„Konto anlegen, um Ihre Meldungen zu verfolgen“** (kein „Zu Bärenwald“) ✅ — F-042-Nachholer **grün**. Status-Link/Seite ✅ Timeline **„Eingegangen“**. **Keine Referenznummer** im UI. Registrieren-`next=` zeigt auf **`baerenwald.netlify.app`** (Prod-Hostname), nicht Staging. |
| Gleiche Geschichte | Mieter „Eingegangen“ ↔ CRM Lead `neu` / Badge „Neu“ — Wortlaut nicht 1:1, fachlich ok. |

### R2-E2E-.2 — CRM Kontext + Kanal-Badge · ✅

| | |
|---|---|
| Screenshot | `e2e-02-lead-direct.png` |
| Erwartet | Org/Objekt/Melder + Kanal-Badge |
| Beobachtet | Musterverwaltung Nord, Leopold, Melder ZZTEST R2E2E ✅. Badge **„HV-Meldung“** sichtbar ✅ (Nachholer zu F-043). Primary: **„Warte auf HV / Hausmeister“**. Phase Angebot disabled („noch nicht erstellt“). |

### R2-E2E-.3 — Angebot-Wizard + Senden · 🚫

| | |
|---|---|
| Beobachtet | Primary bleibt „Warte auf HV / Hausmeister“; Angebot-Phase-Button disabled. Wizard/Senden in dieser Session nicht erreicht. Zusätzlich: kein Catcher-Inhalt in `email_log`. |
| Einordnung | Gate HV-Warte + Catcher-Beleg fehlt |

### R2-E2E-.4–.11 · 🚫

Partner-Einholung, HV-Freigabe-Kreis (A3–A5), Kundenannahme, HW/Bautagebuch, Nachtrag, Abnahme/Mängel/Timeline-Gate, RE-Abschlag/Schluss, Abschluss-Konsistenz — **nicht ausgeführt** (blockiert durch .3).

**Kurzbilanz E2E:** 1 ✅ · 1 ⚠️ · 9 🚫

---

## Teil 2 — Nachholer

### Datenschutz-Reste

| ID | Status | Kurz |
|---|---|---|
| R2-N-01 | ⚠️ | Seed-Tokens gelesen: `/projekt/…` zeigt Tel + `hv-nord@…` + Adresse Leopold (`pii-projekt.txt`). `/nachtrag` + `/formular` ohne E-Mail/Tel in sichtbarem Text. **PII-Listen** als Dateien unter `screenshots/r2-2/pii-*.txt` — formale Tabelle unten. |
| R2-N-02 | ⚠️ | `GET /api/handwerker/anfrage/zztest_invalid_token_r2` → **404** `{"ok":false,"error":"ungueltig"}`. Gültiger HW-Token aus Durchstich fehlt (kein .4). |
| R2-N-03 | 🚫 | Partner sperren/entsperren nicht ausgeführt (destruktiv an Seed — nur mit frischem ZZTEST-Partner vorgesehen; Zeit) |
| R2-N-04 | 🚫 | hängt an Partner-B am Durchstich-Auftrag |
| R2-N-05 | 🚫 | Impersonation Eigentümer/Hausmeister nicht durchgespielt |
| R2-N-06 | 🚫 | `CRON_SECRET` hier nicht verfügbar — Datenschutz-Cron nicht ausgelöst |

### PII-Liste Seed-Tokens (R2-N-01)

| Token | Sichtbare PII (Ist) |
|---|---|
| `/projekt/zztest_projekt_…` | Titel ZZTEST-R2; Leopoldstraße 10 · 80802 München; Tel `089 8095 5726`; E-Mail `hv-nord@example.test`; Branding Bärenwald |
| `/nachtrag/zztest_nachtrag_…` | Kurztext ohne E-Mail/Tel in Body-Extrakt (len 96) |
| `/formular/zztest_formular_…` | Formular-Titel/Felder; Legal-Links; keine E-Mail/Tel im Body-Extrakt |

### Katalog-Reste (R2-N-10–N-22)

| ID | Status | Kurz |
|---|---|---|
| R2-N-10 … N-22 | 🚫 | Nicht in dieser Session — E2E-.3-Blockade + Catcher-Beleg; Priorität nach Freigabe Catcher/`email_log` + HV-Gate-Klärung |

*(Bekannte Backlogs aus R2-SETUP nicht als neue Funde.)*

---

## Funde

### F-162 · R2-E2E-.1 · Wichtig · F-042-Nachholer / Staging-URL
| | |
|---|---|
| Erwartet | Status-/Registrieren-Links auf **Staging**-Website |
| Beobachtet | Bestätigungs-CTA baut `next=` mit `https://baerenwald.netlify.app/melden/status/…` (Prod-Hostname) |
| Screenshot | `e2e-01-confirm.png` |
| Einordnung | Neuer Fund |

### F-163 · R2-E2E-.1 · Kosmetik/Wichtig · Referenz
| | |
|---|---|
| Erwartet | Referenznummer auf Bestätigung (F-042-Nachholer) |
| Beobachtet | Keine Referenz im UI (weiterhin) |
| Einordnung | Bekannt/anhaltend (Prop deprecated) — erneut belegt |

### F-164 · R2-2 Catcher · Blocker · P0-1
| | |
|---|---|
| Erwartet | Nach Versand: `email_log` mit Fake-ID + prüfbarer HTML; Website ebenfalls nachvollziehbar |
| Beobachtet | `email_log` = **0**; Website-Catcher loggt nur Console, schreibt nicht in `email_log`. Inhaltliche Mail-Prüfungen (.3/.10/N-19) nicht möglich. |
| Einordnung | Neuer Fund / Infrastruktur |

---

## Übernahme aus R2-1 (offen)

- **F-160** RE Bearbeiten ohne `title`-Grund  
- **F-161** Melde-Slug-Hinweis unsichtbar trotz `?hinweis=`

---

## Aufräumen

| Entität | Aktion |
|---|---|
| Lead `6eba4479-…` ZZTEST R2E2E | **behalten** für Fortsetzung E2E (nicht gelöscht) |
| Seed 231716aa / STG-R2-0001 / Nord | unberührt |
| Wegwerf-Löschungen | keine (keine Destruktion) |

---

## Freigabe R2-3

**Nein.** Zuerst:

1. Catcher so belegen, dass CRM-Mails in `email_log` landen (und Website-Mails prüfbar sind — Log oder DB).  
2. HV-Gate am Lead `6eba4479-…` klären (wie Staff „Warte auf HV“ überwindet → Angebot).  
3. E2E .3–.11 + priorisierte Nachholer nachziehen.  
4. F-162 (Prod-URL im Melde-next) fixen.

*Nichts gefixt — nur dokumentiert.*
