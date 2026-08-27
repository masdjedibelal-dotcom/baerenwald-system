# F-P01 / F-P02 — Zahlplan-Abschlag Orphans (Prod)

**Status:** ✅ **ausgeführt 2026-08-26** (AUFTRAG F) — beide REs `zahlungsplan_abschlag_id → NULL`.  
**Skript:** `scripts/prod/repair-zahlplan-abschlag-orphans.mjs`  
**Symptom:** `rechnungen.zahlungsplan_abschlag_id` gesetzt, Auftrag ohne `zahlungsplan` (tote Bindung).

## Ziele

| ID | Rechnung | UUID |
|----|----------|------|
| F-P01 | RE2026-2111 (Abschlag) | `3778e0e3-6593-48f4-a098-f45583b1bb12` |
| F-P02 | Schluss-Entwurf | `fe47f58c-0959-431f-a56d-090f2089543a` |

## Release-Fenster

1. Backup Prod (Dashboard / Snapshot).
2. Dry-Run:  
   `node --env-file=.env.local scripts/prod/repair-zahlplan-abschlag-orphans.mjs`
3. Optional Discover:  
   `… --discover`
4. Apply nur mit Flag:  
   `ALLOW_PROD_ZAHLPLAN_REPAIR=1 node --env-file=.env.local scripts/prod/repair-zahlplan-abschlag-orphans.mjs --apply`
5. Smoke: beide REs öffnen, Zahlplan-UI ohne tote Ref.

Repair setzt `zahlungsplan_abschlag_id → NULL` (kein Delete der Rechnung).
