# Icon-Farb-System (Mock-Parität)

Einzige Regeln:
1. **Kein Icon ohne Kontext-Token** (`ctx` → `--icon-*`).
2. **Stroke-only** wie Mock/Tabler: `fill="none"` + `stroke="currentColor"` (+ stroke-width 2).

## Ursache „gefüllte“ Icons (2026-07-16)

`MockIcon` reichte `fill={undefined}` an Lucide. Der Prop-Spread überschrieb Lucides `defaultAttributes.fill: "none"` → Attribut fehlte im DOM → Browser-Default **`fill: rgb(0,0,0)`**. Stroke blieb `currentColor` → Icons wirkten solid/gefüllt (Sidebar Anfragen aktiv, Detail-Nav Stammdaten, …).

Mock-Referenz: Tabler-SVGs in `__ICON_SVGS` mit `fill="none" stroke="currentColor" stroke-width="2"`.

## Stroke-Regel

| | Wert |
|--|------|
| Default | `fill="none"`, `strokeWidth={2}` (`MOCK_ICON_STROKE_WIDTH`) |
| Allowlist filled | `circle-check-filled`, `map-pin-filled`, `player-play-filled`, `star-filled` |
| CSS-Absicherung | `.mock-icon { fill: none; stroke: currentColor }` |

## Tokens (`globals.css` :root)

| Token | Wert | Mock-Bedeutung |
|-------|------|----------------|
| `--icon-default` | `--text-3` (#6a746f) | Toolbar, Suche, neutrale UI |
| `--icon-emphasis` | `--text-2` (#404a45) | Karten-Titel, Betonung |
| `--icon-nav` | `--text-2` (#404a45) | Detail-Shell-Nav, Tabs (inaktiv) |
| `--icon-nav-active` | `--green-dark` | Detail-Nav aktiv |
| `--icon-active` | `--green` | Tab aktiv |
| `--icon-row` | `--text-3` | Listen-Zeilen, Quick-Actions |
| `--icon-sidebar` | rgba(255,255,255,0.62) | Sidebar (erbt in `.sidebar-icon`) |
| `--icon-muted` | `--text-4` | Empty-State |

**Nur Sidebar/BottomNav sind weiß.** Detail-Nav und Tabellenzeilen bewusst **Mock-Dunkelgrau** (#404a45 / #6a746f), nicht #000.

## Kontexte (`MockIcon ctx="…"`)

| ctx | CSS-Klasse | Typische Container |
|-----|------------|-------------------|
| `default` | `.icon-ctx-default` | TopBar, Toolbar, Vorgänge, PosBoard |
| `nav` | `.icon-ctx-nav` | `DetailShell`, `.dshell-navitem` |
| `tab` | `.icon-ctx-tab` | `DetailTabBar`, `.tab` |
| `sidebar` | `.icon-ctx-sidebar` | `Sidebar`, `BottomNav` |
| `row` | `.icon-ctx-row` | `.qa-btn`, Zeilen-Menüs |
| `btn` | `.icon-ctx-btn` | `.btn`, `.btn-primary` |
| `empty` | `.icon-ctx-empty` | `MockEmpty` |
| `emphasis` | `.icon-ctx-emphasis` | `MockCard`-Titel |

## Build-Check

```bash
node scripts/check-icon-context.mjs
```

- `<MockIcon` ohne `ctx=`
- Lucide-JSX in Detail/Shell ohne `icon-ctx-*`
- `fill` ≠ `none` außerhalb Filled-Allowlist
- MockIcon-Root muss `fill={filled ? "currentColor" : "none"}` setzen
