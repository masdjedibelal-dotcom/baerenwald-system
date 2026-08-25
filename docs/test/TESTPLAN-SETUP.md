# TESTPLAN-SETUP — Regeln für alle Etappen

> **An Cursor:** Speichere diese Datei als `docs/test/TESTPLAN-SETUP.md` im Repo.
> Jede folgende Test-Etappe verweist auf dieses Dokument. Lies es vor jeder Etappe erneut.

## Umgebung

- **Nur Staging.** CRM: `staging--baerenwald-backend.netlify.app` · Website/Portale: `staging--baerenwald.netlify.app`
- **Niemals** gegen Produktion testen. Prod ist tabu.
- Browser-Steuerung über Playwright. Jeder Testfall in **zwei Viewports**: Desktop 1440px und Mobile 375px (sofern die Fläche mobil erreichbar ist).

## STOPP-Bedingungen (vor Etappe 1 einmalig prüfen, danach gilt dauerhaft)

1. **Mail-Versand:** Bestätige in Code/Konfiguration, dass Staging KEINE echten Mails über den Provider versendet (Dummy/Catcher/Log-Modus). Denke an zeitversetzte Cron-Automatiken (Angebots-Nachfass, Mahnungen, Einbehalte). Falls echter Versand möglich ist: **STOPP, melden, nicht testen.**
   - **Ist (P0-1):** Catcher in CRM `mail-service.ts` + Website `send-branded-mail.ts` (Staging-Supabase/Deploy → nur Log + `email_log` / Fake-Resend-ID). Mail-Risk-Crons im Netlify-Dispatcher auf Staging übersprungen. Notfall-Override: `ALLOW_STAGING_REAL_MAIL=1`.
2. **Echtdaten:** Falls Staging Kopien echter Kunden-/Mieterdaten enthält: als eigenen Fund dokumentieren (Schwere: Wichtig) und melden, bevor Screenshots mit Echtdaten erstellt werden.

## Automations-Regel (Browser / Agent)

1. **Browser-Confirms und native Dialoge (`confirm` / `alert` / `beforeunload`) NIEMALS automatisch bestätigen.** Dialoge abbrechen oder dem Tester überlassen. Lehre aus F-121 (Cascade-Löschung ZZTEST-Privat Berger durch Auto-Accept).
2. **Destruktive Aktionen** (Löschen, Cascade, Hard-Delete, Storno mit Seiteneffekt) nur an **frischen ZZTEST-Wegwerf-Entitäten**, die in derselben Session angelegt wurden — nie an Seed-Kunden (HV Nord/Süd, Leopold, Mia Muster, Berger-Seed, Partner) und nie an Etappen-Artefakten, die noch für spätere Fälle gebraucht werden.
3. Bei unvermeidbarer Destruktion: vorher ID + Screenshot dokumentieren; Confirm-Text wörtlich in den Report; Aktion nur nach sichtbarem Verb+Objekt im Modal.

## Zugänge & Rollen

- CRM-Staff: Seed-Login (bekannt).
- Alle Portal-Rollen (HV, Privatkunde, Mieter, Eigentümer, Hausmeister, Partner): über Seed-Logins ODER Impersonation / „Portal öffnen" aus dem CRM.
- Token-Links (Status, Projekt, HW-Anfrage, Nachtrag, Formular): aus dem CRM heraus erzeugen.
- Fehlt ein Zugang für Eigentümer/Hausmeister: über Impersonation lösen; falls auch das nicht geht → Testfall als 🚫 Nicht testbar mit Grund markieren, nicht überspringen ohne Vermerk.

## Testdaten

- **Alle** angelegten Entitäten (Kunden, Anfragen, Angebote, Aufträge, Rechnungen, Objekte, Handwerker, Termine) bekommen das Präfix **`ZZTEST-`** im Titel/Namen.
- Am Ende jeder Etappe: Liste aller angelegten ZZTEST-Entitäten in den Report.
- Bestehende Seed-Daten nicht löschen oder umbenennen.

## Referenz-Maßstäbe

- **Funktional:** die Gegeben/Wenn/Dann-Kriterien der jeweiligen Etappe.
- **Design/Copy:** `PATTERN-LEITFADEN.md` (eingefroren) — inkl. kanonischer Status-Map, Anrede-Regeln, Microcopy-Regel, Card-Aktions-Regel (⋯-Menü, destruktiv mit Confirm, deaktiviert-mit-Grund statt verstecken).
- Bei Widerspruch zwischen einem Testfall und dem Leitfaden: Leitfaden gewinnt, Widerspruch im Report vermerken.

## Kernprüfung überall: „Gleiche Geschichte"

Bei jedem Testfall, der einen Status ändert, zusätzlich prüfen: Zeigen **alle** betroffenen Oberflächen (CRM-Liste, CRM-Detail, Kunden-/HV-Portal, Partner-Portal, Mieter-Timeline, Token-Seiten) denselben Zustand mit dem **kanonischen Wortlaut** aus der Status-Map? Jede Abweichung = eigener Fund.

## Bekannte Backlogs — NICHT als neue Funde melden

Diese Punkte sind bekannt und bewusst zurückgestellt. Im Report nur als „Bekannt (Backlog)" führen, falls sie einem Testfall im Weg stehen:

- ui/Button vs. MockBtn-Migration (~190 Dateien) — läuft als Daueraufgabe
- Du-Altcopy im Partner-Portal (neue Copy = Sie; Altbestand migriert bei Berührung)
- `/portal-tools/rechner` als Clone von `/rechner`
- Legacy-Statuswelt `/status/[id]`
- Kunden-Nachtrag: Ablehnen-Button fehlt (bewusstes Ist, siehe Etappe 4)
- org_kennung: Redirect-Alias fehlt (Warnhinweis ggf. schon da — prüfen, siehe Etappe 5)
- Portal-Systemfonts ≠ Marketing-Fonts — **bewusste Ausnahme, kein Fund**

## Report-Format (pro Etappe eine Datei `TESTREPORT-ETAPPE-<n>.md`)

Kopf: Etappe, Datum, Umgebung, X von Y Testfällen bestanden.

**Jeder Testfall bekommt ein Ergebnis** — auch bestandene:

| Feld | Inhalt |
|---|---|
| Fund-ID | fortlaufend F-001, F-002, … (etappenübergreifend) |
| Testfall | z. B. T-B04 |
| Status | ✅ Bestanden · ❌ Fehlgeschlagen · ⚠️ Teilweise · 🚫 Nicht testbar (Grund) |
| Schwere | Blocker (Nutzer blockiert / Datenleck / rechtlich) · Wichtig · Kosmetik |
| Rolle + URL | wo es passierte |
| Screenshot | Datei im Ordner `screenshots/etappe-<n>/` |
| Erwartet vs. Beobachtet | je ein Satz |
| Einordnung | Neuer Fund · Bekannt (Backlog-Verweis) · Akzeptiertes Ist |

Datenschutz-Funde (Etappe 1) zusätzlich in eine separate Liste „Für den Datenschutzberater" am Reportende.

## Arbeitsweise

- Etappen strikt in Reihenfolge (1 → 2 → 3 → …), nach jeder Etappe Report abliefern und auf Freigabe warten.
- Nichts fixen, nur dokumentieren — auch wenn der Fix trivial wäre.
- Wenn ein Testfall unklar formuliert ist: als ⚠️ mit Rückfrage dokumentieren, nicht raten.
- Wenn ein Flow mittendrin blockiert (Captcha, fehlender Zugang, kaputte Vorbedingung): 🚫 mit Grund, weiter mit dem nächsten Fall.
