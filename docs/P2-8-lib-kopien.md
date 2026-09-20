# P2-8: Lib-Kopien / Drift-Inventur

Ziel: **0 offene DRIFT** für Dateien, die Byte-paritätisch gehalten werden sollen.

## Aktiv sync (P2-4) — Drift = Build-Fehler Portal

| CRM-Quelle | Portal-Ziel | Status |
|------------|-------------|--------|
| `src/lib/status/status-map.ts` | `src/lib/shared-domain/status-map.ts` | SYNC |
| `src/lib/status/status-vokabular.ts` | `src/lib/shared-domain/status-vokabular.ts` | SYNC |
| `src/lib/format/geld-datum.ts` | `src/lib/shared-domain/geld-datum.ts` | SYNC |
| `src/lib/vorgang/resolve-vorgang.ts` | `src/lib/crm-vorgang/resolve-vorgang.ts` | SYNC (Import-Rewrite) |
| `src/lib/vorgang/types.ts` | `src/lib/crm-vorgang/types.ts` | SYNC |
| `src/lib/vorgang/vorgang-labels.ts` | `src/lib/crm-vorgang/vorgang-labels.ts` | SYNC |
| `src/lib/vorgang/vorgang-anzeige-titel.ts` | `src/lib/crm-vorgang/vorgang-anzeige-titel.ts` | SYNC |
| `src/lib/org/hv-lead-helpers.ts` | `src/lib/crm-vorgang/hv-lead-helpers.ts` | SYNC |
| `src/lib/anfragen/anfrage-akut-schwelle.ts` | `src/lib/crm-vorgang/anfrage-akut-schwelle.ts` | SYNC |

Guard: Portal `scripts/check-shared-domain-sync.mjs` · CRM `npm run test:shared-domain`.  
Fixtures: `resolve-vorgang.fixtures.json` CRM ↔ Portal byte-gleich (9 Fälle).

## Geplant / Archiv

| Paar | Status | Hinweis |
|------|--------|---------|
| `portal2/status-mapping.ts` | APP | E4 Portal-Flow — nicht syncen |
| `shared/crm-vorgang/resolve-vorgang.fixtures.json` | MANUELL | Paritätstest `test:resolver-parity` |

## App-spezifisch (kein Sync, kein DRIFT)

| Thema | Doc |
|-------|-----|
| Mail / Notify | `docs/P2-7-mail-notify.md` |
| `portal2/status-mapping.ts` | E4 portal-only |

**Messung P2-8:** Diese Liste hat **0 Einträge mit Status DRIFT**. FORK/SYNC/MANUELL/app-spezifisch zählen nicht als offen.
