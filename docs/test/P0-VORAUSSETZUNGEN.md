# P0 — Voraussetzungen (Mail-Catch, Echtdaten, Deploy, Seed)

| Feld | Wert |
|---|---|
| Datum | 2026-08-25 |
| Umgebung | Staging `soqownnkxmtfgvsbrgsl` |
| Bezug | Testdrehbuch P0 vor Runde 2 / Fix-Verify |

## Checklist

| ID | Maßnahme | Status | Hinweis |
|---|---|---|---|
| **P0-1** | Mail-Catcher CRM + Website + Cron-Skip | ✅ Code | **Deploy Staging nötig**, damit live wirksam |
| **P0-2** | Echtdaten `zafer.ozek@outllok.de` anonymisieren | ✅ DB | Kunde/Lead → `zztest.anonym@example.test`; Token rotiert; Foto gelöscht |
| **P0-3** | Staging deployen (aktueller Stand inkl. WL-Fixes + P0-1) | ⏳ Belal | Netlify Staging CRM + Website |
| **P0-4** | Automations-Regel in TESTPLAN-SETUP | ✅ | Confirms nie auto; destruktiv nur ZZTEST-Wegwerf |
| **P0-5** | Seed-Paket Runde 2 | ✅ DB | siehe IDs unten |

## Code-Dateien (P0-1)

- `baerenwald-system/src/lib/mail/mail-catcher.ts` (neu)
- `baerenwald-system/src/lib/mail-service.ts`
- `baerenwald-system/src/lib/copilot/telegram.ts`
- `baerenwald-system/netlify/functions/cron-dispatcher.mjs`
- `baerenwald/src/lib/email/send-branded-mail.ts`
- Docs: `docs/STAGING.md`, `docs/test/TESTPLAN-SETUP.md`

## Whitelabel-Fixes (P0-3 Verify nach Deploy)

Im Repo vorhanden (u. a. `mieter-wl.ts`: CTA „Konto anlegen, um Ihre Meldungen zu verfolgen“). Live Staging stand bei Etappe 3 noch auf altem CTA (F-042) → Deploy prüft Freigabe.

## Seed Runde 2 — IDs (2026-08-25)

| Entität | Wert |
|---|---|
| Auftrag | `231716aa-0215-4560-9253-1492632981de` |
| `/projekt/` | `zztest_projekt_FP0KUHTeK4bqFTzM5oFAig` |
| `/nachtrag/` | `zztest_nachtrag_L2tI-pibK1G-1prYPrPolw` |
| `/formular/` | `zztest_formular_rm45Ryhyh9msrSQ0j_Dnhw` |
| Rechnung | `STG-R2-0001` (`c770d2da-ce85-462a-859d-585c072906f8`) |
| Wartungs-Lead | `f90f71d0-7eb7-4a11-8065-d511694a4bed` |
| CRM Staff2 | `staff2@staging.baerenwald.test` / `StagingTest!2026` |
| Anonym Lead-Token | `zztest_anonym_VPIJs0WnMXlbOFMu` |

Enthalten: Partner-Zuweisung Elektro · Nachtrag gesendet · Baustopp aktiv · Abnahme mit Mangel · Terminslot · Compliance gültig+abgelaufen.

## Nach Deploy kurz prüfen

1. CRM Staging: irgendeine interne Test-Mail / Compose → Netlify Function Logs zeigen `[mail-catcher:…]`, Empfänger bekommt nichts.
2. Website Melde-Absenden → Catcher-Log, keine echte Mail.
3. Status-Token des anonymisierten Leads zeigt keinen Klarnamen mehr.
4. Seed-R2: `/projekt/{token}`, `/nachtrag/{token}`, `/formular/{token}` aus Skript-Ausgabe öffnen.
