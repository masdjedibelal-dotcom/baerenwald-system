# Listen-/Filter-/Badge-Inventur (Nr. 2)

| Datei | Verwendung | Funktion | Vorschlag |
|-------|------------|----------|-----------|
| `ListFilterBar.tsx` | alle Entity-Listen | Suche/Filter/Export | **behalten** (Mock-Klassen toolbar ergänzt) |
| `ListToolbar.tsx` | kaum/nicht verdrahtet | Legacy Toolbar | **verwaist, löschbar** (nicht gelöscht) |
| `ListCard.tsx` | Mobile/andere | Card-Zeile | behalten bis Nr. 11 |
| `FilterChips.tsx` | ListFilterSection | Chips | behalten (.chip) |
| `ListAvatar.tsx` | Mobile + teils Desktop | Avatar | Desktop Mock ohne Avatar → nur Mobile |
| `Badge.tsx` / Status-Badges | überall | Status | behalten (.badge) |
| `SortableHeader.tsx` | Desktop-Header | Sort | behalten |
| `ListRowQuickActions.tsx` | Anfragen | tel/WA | behalten |
| `AppEntityListRow.tsx` | Mobile/Pane | Stack-Row | Nr. 11 |
| `EntityListShell` | alle | Shell | behalten |
| `ListPageParts.tsx` | alle | Filter/Grid Shell | behalten + toolbar/chiprow |

Keine Löschung in diesem Commit (keine Datei mit 0 Imports bestätigt außer ListToolbar — als verwaist markiert).
