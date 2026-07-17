# Icon Stroke-Parität (Nr. 6)

## Ursache
`MockIcon` reichte `fill={undefined}` an Lucide → DOM ohne `fill` → Browser `fill: rgb(0,0,0)`. Zusätzlich Lucide-Glyphen ≠ Mock/Tabler.

## Fix
- Tabler-SVGs 1:1 aus Mock-Standalone (`__ICON_SVGS`) in `src/lib/mock-icon-svgs.ts`
- `MockIcon` rendert diese SVGs (`fill="none"`, `stroke-width="2"`)
- CSS: `.mock-icon svg { fill: none }`
- Build-Guard prüft SVG-Quelle + fill-Regel

## Vergleich
| Datei | Inhalt |
|-------|--------|
| `mock-sidebar.png` | Mock Sidebar (Umriss) |
| `mock-detail-nav.png` | Mock Detail-Nav |
| `crm-sidebar-detail-nav.png` | CRM nach Fix (Tabler stroke) |

CDP nach Fix: `gFill=none`, `stroke=currentColor`, `sw=2`, `hasLucide=false`, Klassen `ti ti-inbox` / `ti ti-clipboard-list`.
