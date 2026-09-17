# TESTREPORT — Etappe 0 (Setup / STOPP-Check)

| Feld | Wert |
|---|---|
| Etappe | 0 — Setup |
| Datum | 2026-08-25 |
| Umgebung | Staging CRM `staging--baerenwald-backend.netlify.app` · Website `staging--baerenwald.netlify.app` · Supabase `soqownnkxmtfgvsbrgsl` |
| Ergebnis | **STOPP — kein Freigabe für Etappe 1** |

## Mail-Versand-Check

| Prüfung | Ergebnis |
|---|---|
| Dummy/Catcher/Log-Modus im Code | ❌ **fehlt** |
| Staging-Guard in `sendMail` / Website-Mail | ❌ **fehlt** |
| Cron kann echte Mails auslösen | ⚠️ **ja, wenn Env gesetzt** |
| Netlify Staging: `RESEND_API_KEY` gesetzt? | 🚫 **nicht verifizierbar** (kein Netlify-CLI/Token lokal) — laut Docs üblich gesetzt |
| `docs/STAGING.md` Mail-Catch | ausdrücklich **noch nicht** umgesetzt („Phase A–E … ist nicht Teil dieses Schritts“) |

### Code-Befunde (Belege)

1. **CRM** `src/lib/mail-service.ts`: Bei gesetztem `RESEND_API_KEY` ruft `sendMail` direkt `resend.emails.send(...)` auf. Kein Staging-Skip, kein Catcher, kein Dry-Run.
2. **Website** `src/lib/email/send-branded-mail.ts` und weitere Pfade (`persist-lead`, Partner-/HV-Notify): ebenfalls Resend ohne Staging-Abbruch.
3. **Cron** (`netlify/functions/cron-dispatcher.mjs` → CRM-API):
   - `/api/cron/rechnungen` → Zahlungserinnerungen / Mahnungen
   - `/api/cron/angebot-nachfass` → Angebots-Nachfass
   - `/api/cron/einbehalte` → Reminder an interne Warn-Adresse
   - `/api/cron/datenschutz` → Datenschutz-Mails
4. Deploy-Doku (`docs/NETLIFY-DEPLOY.md`) listet `RESEND_API_KEY` als Functions-Pflichtvariable — ohne Hinweis auf Staging-Ausnahme.

**STOPP-Regel aus TESTPLAN-SETUP:** *Falls echter Versand möglich ist: STOPP, melden, nicht testen.*  
→ Erfüllt. Etappe 1+ nicht starten, bis Mail auf Staging sicher abgefangen oder Key/Cron für Staging deaktiviert sind.

## Echtdaten-Check (Staging-DB, nur SELECT)

| Quelle | Befund |
|---|---|
| Seed-Mails (`@example.test`, `@staging.baerenwald.test`) | Mehrheit der Datensätze |
| Nicht-Test-Domain | **1×** Kunde + **1×** Lead mit Domain `outllok.de` (Privatkunde, Name in DB vorhanden) |
| Handwerker | nur `@example.test` |

**Einordnung:** Schwere **Wichtig** — Staging enthält mindestens einen real wirkenden Kontakt. Vor Screenshots mit Personenbezug: Datensatz anonymisieren/entfernen oder Screenshots nur auf ZZTEST-/Seed-Daten beschränken.

## Erreichbarkeit Staging

| URL | HTTP |
|---|---|
| CRM Login | 200 |
| Website | 200 |

## Freigabe Etappe 1

**Nein.** Warte auf:

1. Bestätigung, dass Staging **keinen** echten Resend-Versand machen kann (Key entfernt / Catcher / Code-Guard), **und**
2. Cron auf Staging deaktiviert **oder** ebenfalls nur Catcher, **und**
3. Umgang mit dem `outllok.de`-Datensatz entschieden.

## ZZTEST-Entitäten

Keine angelegt (nur Setup/Checks).
