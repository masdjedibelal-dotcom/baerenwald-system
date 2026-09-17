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
3. Verboten (Build-Guard `scripts/check-mock-primitives.mjs`, Teil von `npm run build`): `btn-primary`, `btn-ghost`, `btn-secondary`, `btn-danger`, `btn-sm`, `btn-lg`, `chip.selected`, `detail-section-card`, `DetailCollapsibleCard`.
4. Tokens nur in `globals.css` (`:root`). `bw-*` sind Aliase auf Mock-Tokens, kein Parallel-System.
5. Neue UI-Styles → nur in `mock-design-system.css`.
6. React-Primitives: `MockBtn` / `MockChip` / `MockBadge` / `MockCard` (`src/components/mock-ui/`). `Button`/`Card`-Wrapper mappen auf dieselben Klassen.
7. Vorgangs-Status: nur `StatusBadge` (`src/components/ui/StatusBadge.tsx`, Spec §11 / Phase 1) — wrappt `MockBadge` + `STATUS_TONE`. Keine neuen Status-Badge-Varianten; deprecated Wrapper (`AngebotStatusBadge` / `AuftragStatusBadge` / `LeadStatusBadge`) leiten nur durch.

## Card-Header-Aktionen (`MockCard` · `actions`)

1. **CTA rechts oben in der Card** (Anlegen, Öffnen, Weitere …): `MockBtn sm kind="secondary"` — sichtbarer Rand auf weißem `card-h`.
2. **Nicht** `kind="ghost"` / `btn ghost sm` auf weißem Card-Header — zu wenig Kontrast (Ghost nur auf grauen Flächen: TopBar, Modal-Footer, Listbars).
3. **Speichern** in Editor-Cards: `MockBtn sm kind="primary"` (z. B. Links, Freigabe).
4. **Destruktiv in der Zeile** (Löschen, Entfernen): `MockBtn sm className="danger-outline"`.
5. **Nur Status/Meta** im Header: `MockBadge` oder grauer Text — kein Button.
6. **Ein CTA pro Job** — nicht denselben Button im Card-Header und im Empty-State (Header **oder** Mitte).

## Bewusste Produkt-Deltas (kein CSS-Gap)

- Keine Aktion-Spalte in Vorgänge-Liste
- Keine KI-Blöcke im Detail
- Fullscreen-Wizard (kein Mock-Overlay)
- Bulkbar bei Mehrfachauswahl
