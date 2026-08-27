# AUFTRAG F — Prod-Release

**Datum:** 2026-08-26  
**CRM Prod:** https://baerenwald-backend.netlify.app  
**Website Prod:** https://baerenwald.netlify.app  
**Supabase Prod:** `wnotlydvhsmfkhexgeol`  
**Code-Deploy:** beide Repos (Belal) live  

**Gesamturteil: GELB** — Deploy-Gate + Env + F-P01/02 + Lese-Smoke + Mail ✅; Hydration `/projekt` und Zweit-Staff-Lauf unvollständig.

---

## 1. Deploy-Gate

### Kritische Migrationen → **Deploy safe** (Schema schon auf Prod)

| Migration | Nachweis |
|-----------|----------|
| `belegnummer_erst_bei_versand` | `rechnungen.rechnungsnummer` nullable=`YES`, Funktion `generate_beleg_nummer` vorhanden |
| `angebot_handwerker_rechnung_13b_flag` | Spalte `angebot_handwerker.hw_rechnung_reverse_charge_13b` |
| `partner_ersetzt_sperre` | Policies `auftraege_portal_handwerker_select`, BT select/insert, `auftrag_handwerker_portal_*` mit `ersetzt`-Filter |

### Apply-Liste → angewendet

| Datei | Warum |
|-------|--------|
| `20261009120000_portal_dokumente_visibility_fixes.sql` | RE-Portal-Policy ohne `bezahlt`; `portal_kunde_lead_ids` ohne Auftraggeber; BT-Kunde-Policy fehlte; `kunden_dokumente` noch `auth_all` |

**Ablauf:**
1. Backup: `docs/test/backups/prod-schema-2026-08-26T13-23-12-433Z.sql` + `prod-rechnungen-einstellungen-…sql`
2. Apply + Tracking: `scripts/prod/apply-deploy-gate.mjs --apply`
3. Post-Verify: BT-Kunde-Policy=1 · RE-Qual enthält `bezahlt` · Lead-Fn mit `auftraggeber_kunde_id` · `schema_migrations` `20261009120000`

---

## 2. Env-Precheck ✅

| Check | Ergebnis |
|-------|----------|
| Kein `ALLOW_STAGING_REAL_MAIL` / `MAIL_CATCHER=1` in Prod-Chunks | ✅ |
| Supabase-URL Prod-Ref | ✅ `wnotlydvhsmfkhexgeol` (CRM + Website) |
| Steuernummern Firmen-Konfig | ✅ USt `DE362198001` · Steuer `14417721070` |

Hinweis: Default-From `info@baerenwald-muenchen.de` (Bindestrich) ist bei Resend **nicht** verifiziert — Versand gelingt mit `anfragen@baerenwaldmuenchen.de`. Empfohlen: Netlify `RESEND_FROM_EMAIL` auf verifizierte Domain setzen.

---

## 3. F-P01 / F-P02 ✅

| ID | RE | Aktion |
|----|-----|--------|
| F-P01 | RE2026-2111 `3778e0e3-…` | `zahlungsplan_abschlag_id → NULL` |
| F-P02 | Entwurf `fe47f58c-…` | `zahlungsplan_abschlag_id → NULL` |

Skript: `ALLOW_PROD_ZAHLPLAN_REPAIR=1 node --env-file=.env.local scripts/prod/repair-zahlplan-abschlag-orphans.mjs --apply`

---

## 4. Verify

Rohdaten: `docs/test/AUFTRAG-F-VERIFY.json` · Skript: `scripts/prod/verify-release.mjs`

| Check | Ergebnis |
|-------|----------|
| RE-Parity **info@** (RE2111, Modal) | ✅ geladen · Modal geöffnet |
| RE-Parity **Zweit-Staff** (`info@baerenwald.de`) | ❌ Lauf abgebrochen (CRM `page.goto` Timeout 90s nach Hydration-Block) — **nicht erneut belegt** |
| Lese-Smoke 5 Vorgänge / 5 Kunden / 3 Objekte / 3 REs | ✅ Console/Network sauber |
| Hydration `/projekt` | ❌ **F-P03** — 2/3 Tokens (#422/#425); 1/3 clean (`bb0ac8f3`) |
| Prod-Mail Empfangsbeweis | ✅ an `belal.masdjedi@gmail.com` via Resend `anfragen@baerenwaldmuenchen.de` (Lauf zuvor) |

---

## 5. Offene Funde

| Prio | ID | Thema |
|------|-----|--------|
| **P2** | **F-P03** | Hydration #422/#425 auf `/projekt/{token}` (v. a. abgeschlossene Aufträge) |
| **P2** | **F-Staff2** | Zweit-Staff-UI-Parity einmalig nachziehen (Timeout in diesem Lauf) |
| P3 | Tracking-Backlog | Weitere Repo-Migrationen schema-safe, aber ohne Prod-Tracking-Zeile |
| P3 | Resend FROM | Prod-Env auf `baerenwaldmuenchen.de` (ohne Bindestrich) vereinheitlichen |

---

## 6. Abschlussmeldung

| Aussage | Status |
|---------|--------|
| Code Prod ≈ Staging (Deploy Belal) | ✅ angenommen |
| Schema-kritische Diffs geschlossen | ✅ Apply `portal_dokumente_visibility_fixes` |
| Env Prod sauber | ✅ |
| F-P01/02 repariert | ✅ |
| **Alle Checks grün** | ❌ wegen F-P03 (+ Zweit-Staff Timeout) |

**Prod-Release AUFTRAG F: bedingt freigegeben (GELB).** Kernpfade CRM/Env/Mail/Zahlplan OK; Hydration-Bug und Staff2-Nachweis offen.

---

## Commit-Vorlage (GitHub Desktop · `baerenwald-system`)

1. `scripts/prod/apply-deploy-gate.mjs` — Backup + Apply nur für Schema-Diff-Migrationen  
2. `scripts/prod/verify-release.mjs` — Env/Parity/Smoke/Hydration/Mail-Verify  
3. `scripts/prod/repair-zahlplan-abschlag-orphans.mjs` — unverändert genutzt (F-P01/02)  
4. `docs/test/AUFTRAG-F.md` — dieser Report  
5. `docs/test/AUFTRAG-F-VERIFY.json` — Verify-Rohdaten  
6. `docs/test/backups/prod-schema-*.sql` + `prod-rechnungen-einstellungen-*.sql` — Prod-Backup vor Apply  
7. `docs/test/F-P01-P02-ZAHLPLAN-REPAIR.md` — Status auf ausgeführt setzen (falls mitgezogen)  
8. `docs/test/screenshots/auftrag-f/` — Projekt-Screenshots  

**Message:** `release(prod): AUFTRAG F Deploy-Gate Apply, Zahlplan-Repair, Verify-Report`
