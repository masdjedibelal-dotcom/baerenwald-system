# P3-6 CSS-Budget — Unused/Duplikat-Cut + Screenshot-Nachweis

**Stand:** 2026-09-19  

| Messung | Wert |
|---------|------|
| Vor erstem Cut | 575 KB raw |
| Nach Cut 1 | 473 KB raw |
| **Nach Cut 2 (dieser Pass)** | **427 KB raw** (−46 KB) |
| gzip -9 | **~69 KB** |
| Audit-Ziel | `css_kb` raw **&lt; 150** — **nicht erreicht** |

## Was entfernt wurde

- Regeln, deren Klassen weder als String-Literal (`className` / `cn` / `clsx`) noch über Keep-Prefixes (Primitives, `dok-`, `dshell`, Editor-Libs, …) vorkommen
- Exakte Duplikate (Selektor+Body) — 0 in diesem Pass
- **373** Regeln entfernt; Basis (`.app`, `.btn`, `.card`, `.sidebar`, `.vg-row`, `.dshell`, …) bleibt

Skript: `scripts/_tmp-p36-purge-strict.py` (Backup: `/tmp/mock-design-system.css.p36-before.bak`)

## Optik-Nachweis (10 Hauptseiten)

Staging-HTML + injiziertes lokales CSS (Vorher = 473 KB-Stand, Nachher = 427 KB).

| Seite | Diff-Pixel % |
|-------|----------------|
| 01 Dashboard `/` | 0.0003 % |
| 02 Vorgänge | 0 % |
| 03 Anfragen | 0 % |
| 04 Angebote | 0 % |
| 05 Aufträge | 0 % |
| 06 Rechnungen | 0 % |
| 07 Kunden | 0.0014 % |
| 08 Handwerker | 0 % |
| 09 Partner | 0 % |
| 10 Kalender | 0 % |

**Ergebnis:** `OPTICAL_DIFF_OK` (Schwelle ≤ 0.5 %)  
Artefakte: `docs/p3-6-screenshots/{before,after,diff}/`  
Runner: `scripts/p36-screenshot-compare.mjs` · Diff: `scripts/_tmp-p36-diff.py`

## Warum raw &lt; 150 nicht ohne Entscheidung

Restmasse = produktive UI. Weiter unter 150 KB raw nur mit:

1. **Metrik → gzip** (bereits ~69 KB &lt; 150), oder  
2. **Lazy-/Split-CSS** (`DESIGN-CSS.md` anpassen), oder  
3. **Live-Schichten entfernen** (Optik-Risiko)

→ `docs/OFFENE-FRAGEN.md`

## Messung

```bash
node scripts/audit-status.mjs   # css_kb
python3 scripts/_tmp-p36-diff.py
```
