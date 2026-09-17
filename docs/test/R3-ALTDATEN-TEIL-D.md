# R3-ALTDATEN — Teil D Alt-Status-Rendering

Stand: 2026-08-26

## Anforderung

LEGACY-Zeilen mit unbekannten Status-Strings: kanonische Map mit Fallback (Anzeige **Rohwert** bzw. **„Unbekannt“** bei leerem String, **neutrales Badge**) statt leer/Crash.

## Fund (vor Mini-Fix)

| Schicht | Vorher | Lücke |
|---------|--------|-------|
| `status-map.ts` `statusLabel` | Rohwert oder `—` | Kein expliziter Default-Zweig / kein `Unbekannt` |
| `statusMapEntry` | `null` | Caller-abhängig |
| `status-tone.resolveStatus` | Rohwert + Tone **blau** | Nicht neutral |
| `status-display` Anfrage/Auftrag/RE | Rohwert + `neutral` | OK |
| `angebotStatusDisplay` | `resolveStatusEinfach` → **„Entwurf“** bei `versendet` | Falsch-positiv, kein Rohwert |

Seed-Fälle (`seed-legacy-edgecases.mjs`): Lead `in_bearbeitung`, Angebot `versendet`, Auftrag `wartend`, RE `teilbezahlt` (`…050`–`…053`).

## Mini-Fix

- `unknownStatusEntry` / `statusMapEntryOrUnknown` in `status-map.ts` (Default-Zweig)
- `resolveStatus`: Unbekannt → Tone **grau** (neutrales Badge); leer → Label **Unbekannt**
- `angebotStatusDisplay`: unbekannter `status_einfach`/`status` → Rohwert + `neutral` (kein Collapse auf Entwurf)
- Sanity: `npx tsx src/lib/status/status-tone.fallback-check.ts`

## Integration (laut Plan)

| Zeitraum | Was |
|----------|-----|
| Sofort | A1+A2 (Prod-Snapshot + Legacy-Seed) parallel zum View-Action-Sweep — Sweep fixt Code, Seeds/Smokes beweisen |
| Runde 3 | Teil B–D als Etappe **R3-ALTDATEN** — nach den Sprints, gegen **deployten** Stand |
| Dauerhaft | Matrix (Teil B) wie `docs/test/AKTIONS-MATRIX.md` pflegen; neues Feature → Zeile; Legacy-Seed in jedem Regressions-Smoke |
| Prod-Nachsorge | Anomalien-Liste A1-Schritt 4 (tote FKs auf Prod) → **P-PROD-Diagnose** (Daten-Reparatur) |

**Hinweis:** Staging-CRM (deployter Stand vor diesem Fix) — Live-Probe 2026-08-26:

| Seed | Staging live | Nach Fix (lokal belegt) |
|------|--------------|-------------------------|
| Lead `in_bearbeitung` | Rohwert, kein Crash | unverändert + Tone grau |
| Angebot `versendet` | zeigt **„Entwurf“** (Bug) | Rohwert `versendet`, neutral |
| Auftrag `wartend` | Rohwert, kein Crash | + Tone grau via StatusBadge |
| RE `teilbezahlt` | Rohwert, kein Crash | unverändert |

Nach CRM-Deploy Teil D erneut gegen Staging smoke’n.

## Beleg lokal

```bash
npx tsx src/lib/status/status-tone.fallback-check.ts
# → Phase-1 + R3-ALTDATEN Teil D status/primaryCta checks OK
```
