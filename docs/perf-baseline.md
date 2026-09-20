# Perf-Baseline (Staging)

**Stand:** 2026-09-19 · Repo: `baerenwald-system`  
**Regel:** Keine erfundenen Lighthouse-/Web-Vitals-Zahlen. Messwerte erst nach Lauf auf Staging.

## Messung Staging

| Metrik | Wert | Quelle |
|--------|------|--------|
| Lighthouse Performance (Desktop) | Messung ausstehend auf Staging | — |
| Lighthouse Performance (Mobile) | Messung ausstehend auf Staging | — |
| LCP | Messung ausstehend auf Staging | — |
| INP / FID | Messung ausstehend auf Staging | — |
| CLS | Messung ausstehend auf Staging | — |
| TTFB Dashboard `/vorgaenge` | Messung ausstehend auf Staging | — |

## Code-/Audit-Ist (ehrlich, aus `node scripts/audit-status.mjs`)

| Kennzahl | Ist | Hinweis |
|----------|-----|---------|
| `css_kb` | 427 | P3-6 Unused-Cut 2; Screenshots OK; Ziel raw&lt;150 offen (`P3-6-css-budget.md`) |
| `withCrmReadFallback_files` | 0 | P3-2 ✅ |
| `revalidatePath` | 582 | Trend; P3-4: kein `revalidatePath('/')` |
| `router_refresh` | ~108 | P3-4 Parent+Child-Duplikate entfernt |
| `force_dynamic` | 36 | P3-5 Inventur in `docs/P3-5-force-dynamic-inventur.md` |
| `files_over_1000` | 29 | P7-10 |
| `tw_std_colors` / `hex_in_class` | 0 / 0 | P5-13 ✅ (inkl. Restpass-Palette) |

## Nächster Schritt

1. Staging-Deploy mit aktuellem Stand.
2. Lighthouse (Chrome DevTools / PageSpeed) gegen Staging-URL für `/`, `/vorgaenge`, `/anfragen`, `/kunden`.
3. Tabelle oben mit echten Zahlen füllen (Datum + URL notieren).
