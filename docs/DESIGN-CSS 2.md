# Design-CSS: eine Quelle

Stand nach CSS-Einquellen-Entscheidung (Mock-Parität).

## Welche Datei wofür

| Datei | Inhalt | Import |
|-------|--------|--------|
| `src/app/globals.css` | **Nur** Tailwind-Directives, Design-Tokens (`:root`), Basis (`body`, Scrollbar, Input-16px). Keine Komponenten-Klassen. | `src/app/layout.tsx` |
| `src/styles/mock-design-system.css` | **Einzige** Komponenten-CSS-Schicht (Shell, Listen, Buttons, Chips, Cards, Badges, Wizard, Modal, CRM-Extensions). | `src/app/layout.tsx` (nach `globals.css`) |

## Regeln

1. Keine CSS-Klasse darf in beiden Dateien vorkommen.
2. Mock-Primitive-Konvention: `.btn.primary` / `.btn.ghost` / `.btn.danger` / `.btn.sm`, `.chip.active`, `.card` / `.card-h` / `.card-b`, `.badge` / `.st-dot`.
3. Verboten (Build-Guard `scripts/check-mock-primitives.mjs`, Teil von `npm run build`): `btn-primary`, `btn-ghost`, `btn-secondary`, `btn-danger`, `btn-sm`, `btn-lg`, `chip.selected`, `detail-section-card`, `StatusBadge`-Import, `DetailCollapsibleCard`.
4. Tokens nur in `globals.css` (`:root`). `bw-*` sind Aliase auf Mock-Tokens, kein Parallel-System.
5. Neue UI-Styles → nur in `mock-design-system.css`.
6. React-Primitives: `MockBtn` / `MockChip` / `MockBadge` / `MockCard` (`src/components/mock-ui/`). `Button`/`Card`-Wrapper mappen auf dieselben Klassen.

## Bewusste Produkt-Deltas (kein CSS-Gap)

- Keine Aktion-Spalte in Vorgänge-Liste
- Keine KI-Blöcke im Detail
- Fullscreen-Wizard (kein Mock-Overlay)
- Bulkbar bei Mehrfachauswahl
