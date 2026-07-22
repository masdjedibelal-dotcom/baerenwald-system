# Listen — Ersetzungsliste (Split-View & Legacy)

| Komponente | Status | Ersatz / Anmerkung |
|------------|--------|-------------------|
| `AppMasterDetailLayout` (Split) | **ersetzt** | Vollbreite Liste ODER Detail (`2026-07-16`) |
| `*MasterDetailShell` | **auf Ersetzungsliste** | Nur noch dünne Wrapper; später entfernen wenn Layouts Daten in `page.tsx` laden |
| `AppMasterDetailPlaceholder` | **deprecated** | Nicht mehr verwendet |
| `ListToolbar.tsx` | **gelöscht** | OP-5 freigegeben — null Verwendungen |
| `ListFilterBar` | **noch aktiv** | MockToolbar/MockListBar schrittweise (Filter-Logik komplex) |
| `SortableHeader` | **ersetzt in Entity-Listen** | `MockSortHead` |
| `LeadStatusBadge` (Listen) | **ersetzt in Entity-Listen** | `LeadStatusMockBadge` |
| `EntityListShell` / `AppEntityListRow` | **noch aktiv** | Nr. 11 / Mobile-Pane |
