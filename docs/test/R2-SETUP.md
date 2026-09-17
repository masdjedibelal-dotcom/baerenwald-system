# R2-ETAPPE-0 — Setup-Update Runde 2

> Ergänzt [`TESTPLAN-SETUP.md`](./TESTPLAN-SETUP.md) — alle dortigen Regeln gelten weiter.

## Neue Vorbedingungen (VOR R2-Etappe 1 prüfen, sonst STOPP)

1. **Mail-Catcher-Verify (dreifach):** (a) Test-Mail auslösen → Log zeigt `[mail-catcher:…]` und `email_log` hat Fake-ID · (b) Resend-Dashboard zeigt KEINEN Versand · (c) einen Mail-Risk-Cron anstoßen → geskippt/gecatcht. Erst wenn alle drei belegt sind, dürfen Versand-Flows getestet werden.
2. **Migration angewendet:** `20260825160000_partner_ersetzt_sperre.sql` ist auf Staging-DB aktiv (prüfen: Policies existieren). Ohne sie ist R2-V-Block B ungültig.
3. **Deploy-Stand:** Beide Repos auf aktuellem main. Stichprobe: Melde-Bestätigungs-CTA ist neutral (kein „Bärenwald") — sonst ist Staging wieder veraltet → STOPP.
4. **Seed Runde 2 intakt:** Auftrag `231716aa-…`, RE `STG-R2-0001`, Tokens projekt/nachtrag/formular, Staff2-Login funktionieren.

## Neue Regeln (zusätzlich zu Runde 1)

- **Confirms NIEMALS automatisch bestätigen.** Destruktive Tests nur an frischen ZZTEST-Wegwerf-Entitäten, die in derselben Etappe angelegt wurden. Seed-Basisdaten (Auftrag 231716aa, Org Nord, Leopold) sind tabu für Löschtests.
- **Aufräum-Pflicht:** Am Ende jeder Etappe alle Wegwerf-ZZTEST-Entitäten löschen (über die neuen Confirm-Dialoge — das ist gleich ein Mini-Verify) und im Report listen.
- Fund-IDs fortlaufend ab **F-160**. Eigene Serie **B-xx** für Belals manuelle Frontend-Funde weiterführen (B-01 bis B-05 vergeben).
- Mails werden jetzt gecatcht: Bei Versand-Tests IMMER den Log-Inhalt der gecatchten Mail prüfen (Empfänger, Betreff, Kerninhalt) — der Catcher macht Mail-INHALTE erstmals testbar.

## Reihenfolge

R2-1 (Verify) → R2-2 (Nachholer + E2E) → R2-3 (Regression) → R2-4 (Erwartungs-Check) → R2-5 (Stress). Nach jeder Etappe Report + Freigabe abwarten. Wenn in R2-1 ein Fix nicht greift: Etappe zu Ende führen, aber melden — Fix-Nacharbeit hat Vorrang vor R2-2.

## Bekannte Backlogs Runde 2 (nicht als neue Funde melden)

Alles aus TESTPLAN-SETUP, plus:

- Kunden-Nachtrag Ablehnen (unverändert Backlog)
- org_kennung Redirect-Alias (Warnhinweis ist jetzt gebaut — der wird getestet; Redirect bleibt Backlog)
- Aktions-Matrix-Paket F-152/155/156/157 (Listen-⋯, Inline-Trash, Zahlplan-Frozen, Preislisten-Löschen) — nach Runde 2
- P3-4 Server-Idempotenz Melde-Submit · P3-9 CSV-Transaktion · P3-10 Gutschrift-PDF · P3-14 Status-Drift-Guard · P3-18 Termin-Mail-Default — nach Runde 2
- P4 Copy/Tooltips/Toasts — nach Runde 2
- „Partner: Bärenwald München" auf Aushang = bewusste Entscheidung, kein Fund
