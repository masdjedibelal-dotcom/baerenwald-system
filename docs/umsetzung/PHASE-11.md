# Phase 11 — Frontend-Feinschliff

### Abnahmekriterien (vorher definiert)
- [x] Typo-Skala vier Größen in Vorgang-CSS-Variablen → Beleg: `globals.css` `--fs-meta: 12px` · `--fs-text: 13.5px` · `--fs-title: 15px` · `--fs-head: 19px`; Nutzung in `mock-design-system.css` (`.dh-title`, `.card-h .title`, `.prop`, `.cbx-*`)
- [x] Weißraum Karten-Padding 20 / Gap 16 / Prop-Zeilen 11 → Beleg: `--sp-card` / `--sp-stack` / `--sp-row` in `globals.css`; `.card` margin-bottom + `.card-b` padding + `.prop` padding
- [x] Borders 0,5px, weniger Card-in-Card → Beleg: `.card` border `0.5px`; `.card .card { border: none; box-shadow: none }`
- [x] Mobil Detail-Header `.shrunk` → Beleg: `EntityDetailLayout` setzt `shrunk` ab Scroll >40px; CSS `.detail-head.shrunk`
- [x] `kb-open` blendet Bottom-Nav / FAB / Sticky-CTA aus → Beleg: `useKeyboardOpen` → `body.kb-open`; CSS `@media (max-width: 768px) body.kb-open .bottomnav, .fab-*, .btn.primary …`
- [x] Tabellen→Karten mobil → Beleg: bereits Phase 4 (`@media` gestapelte `.vg-row` Cards) — unverändert bestätigt
- [x] Swipe Vorgänge-Liste → Beleg: `SwipeRow` in `VorgaengeListeClient` (links Löschen, rechts Anrufen)
- [x] Desktop Hover / Aggregat / Edge / row-flash → Beleg: Phase 4 (`vg-actions` hover, `vg-row--aggregate`, `vg-row--edge-*`, `vg-row--flash`) — verifiziert, nicht regressiert
- [x] Combobox bei >15 Optionen → Beleg: `Select` auto-switch; `OfferPositionCard` Leistungen/Handwerker; `AngebotWizardHandwerkerStep` via `Select`
- [x] Shortcuts ⌘K · ⌘J · n · / · ? · Esc → Beleg: `GlobalShortcuts` + `CommandPalette` in `DashboardShell`
- [x] Leerzustände mit Aktion → Beleg: Vorgänge / Kunden / Handwerker `MockEmpty` mit `MockBtn`-Action

### Was sich am Ist geändert hat
| Datei | vorher | nachher | Art |
|---|---|---|---|
| `src/app/globals.css` | alte `--type-*` | Spec-Tokens `--fs-*` / `--sp-*` | umgebaut |
| `src/styles/mock-design-system.css` | gemischte px | Tokens, shrunk, kb-open, cbx, swipe | erweitert |
| `Select.tsx` | immer native select | >15 → Combobox | umgebaut |
| `DashboardShell.tsx` | ohne Shortcuts/kb | GlobalShortcuts + useKeyboardOpen | erweitert |
| `VorgaengeListeClient.tsx` | kein Swipe | SwipeRow mobil | erweitert |
| `EntityDetailLayout.tsx` | nur `--scrolled` | + Klasse `shrunk` | erweitert |

### Neu entstanden
- `Combobox.tsx` · Tipp-Filter + Subline
- `SwipeRow.tsx` · Mobile Swipe-Aktionen
- `useKeyboardOpen.ts` · `body.kb-open`
- `GlobalShortcuts.tsx` · Kürzel + Hilfe-Overlay (`?`)
- `docs/umsetzung/PHASE-11.md`

### Entfernt
- ⌘K-Handler in `TopBarSearch` (ersetzt durch CommandPalette via GlobalShortcuts)

### Bewusst nicht geändert
- Vollständige Typo-Bereinigung aller Legacy-`font-size`-Werte außerhalb Vorgangs-/Card-Tokens (Sidebar, Badges, Wizard)
- Alle Raw-`<select>` im Repo (nur Schwellen-Felder + `Select`-Wrapper)
- GlobalSearch.tsx (ungenutzt, Legacy)

### Bekannte Abweichungen zum Mock / Gaps
- Grep findet weiterhin viele Schriftgrößen ≠ 12/13.5/15/19 außerhalb der Token-Nutzung (Buttons, Badges, Listen-Meta) — Token sind gesetzt, flächige Migration offen
- Card-in-Card: nur CSS-Regel `.card .card`; Tailwind-`border`-Karten (z. B. OfferPositionCard) nicht alle umgestellt
- Kunden-Auswahl bleibt oft `KundePickerSheet` (Such-Sheet) statt Inline-Combobox — funktional äquivalent, kein nativer Select mit >15
- Swipe-Löschen nutzt bestehende Delete-Helper (Toast/Undo je Helper), nicht immer identisch zum Bulk-Undo
- Sticky Primary-CTA-Klassen variieren je Detail-Screen; `kb-open` trifft `.btn.primary` im Detail-Head + Doc-Footer
- Doppelte Suche möglich: CommandPalette (⌘K) und TopBar-Suchfeld (Klick) parallel
- Empty-State-Actions in `KundenListeClient` / `HandwerkerListeClient` sind im Working Tree, aber **nicht** in diesem Commit (Dateien hatten große Fremd-Diffs)
