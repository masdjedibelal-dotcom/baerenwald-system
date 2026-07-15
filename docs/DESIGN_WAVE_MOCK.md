# Design-Wave E — Mock-Optik global (Option A)

**Stand:** Juli 2026  
**Ziel:** Komplettes Mock-Design (`Baerenwald CRM (standalone) (2).html`) für alle CRM-Screens — **Optik = Mock**, **Logik = ENTWICKLER-SPEC**.

## Option A (fix)

| Ebene | Quelle |
|-------|--------|
| Layout, Toolbar, Tabelle, Mobile-Cards, KPI, Tabs, Pagination, FAB | **Mock** |
| Spalten, Resolver, keine Aktion-Spalte, Badges nur im Detail-Header | **Spec** |

Referenzen: [DESIGN_KONZEPT_CRM_UI_UX.md](./DESIGN_KONZEPT_CRM_UI_UX.md) · [ENTWICKLER-SPEC.md](./ENTWICKLER-SPEC.md) · [CRM_TRACK.md](./CRM_TRACK.md)

---

## To-Liste (Reihenfolge)

### E0 — Foundation ✅

- [x] `useListPage` — clientseitige Pagination
- [x] `ListPagination` — Mock-Fußzeile (Seite · Vor/Zurück)
- [x] `MockKpiRow` — KPI-Kartenzeile (Vorgänge, optional Dashboard)
- [x] **Layout-Umbau:** Master-Detail-Split entfernt → volle Listen-Tabelle + volle Detailseite (Mock-Navigation)

### E1 — Listen (Mock-Pattern)

| Screen | Komponente | Status |
|--------|------------|--------|
| **Vorgänge** | `VorgaengeListeClient` | 🔄 in Arbeit |
| Anfragen | `AnfragenListeClient` | ✅ Referenz |
| Angebote | `AngeboteListeClient` | ✅ |
| Aufträge | `AuftraegeListeClient` | ✅ |
| Rechnungen | `RechnungenListeClient` | ✅ |
| Kunden | `KundenListeClient` | ✅ |
| Handwerker | `HandwerkerListeClient` | ✅ |
| Partner | `PartnerNetzwerkClient` | ✅ |
| Formulare | `FormulareListeClient` | prüfen |
| Vorlagen | `AngebotVorlagenListeClient` | prüfen |

**Listen-Checkliste (jeder Screen):**

1. `EntityListShell` + `ListFilterSection` + `ListFilterBar`
2. Desktop: `ListGridShell` + `list-row-grid` ab `md` (nicht `lg`)
3. Mobil: `ListMobileStack` + `AppEntityListRow`
4. Sortierung, Export, Ergebnisanzahl
5. `ListPagination` ab E0
6. Spec-Spalten (keine Aktion-Spalte)

### E2 — Shell

- [ ] TopBar: zentrale Suche (Mock) — optional Wave 2
- [x] BottomNav / Sidebar — bereits Mock-nah
- [ ] FAB: Vorgänge + Anfragen (+ weitere CTAs aus `ROUTE_META`)

### E3 — Dashboard „Heute“

- [ ] `page.tsx` + Cards an DESIGN_KONZEPT §5
- [ ] KPI-Zeile, Aufgaben, Termine, letzte Vorgänge

### E4 — Detail-Screens

Einheitlich laut DESIGN_KONZEPT §4:

- [ ] `EntityDetailLayout` / `DetailHead` — alle Phasen
- [ ] `ProjektKette` überall sichtbar
- [ ] Stammdaten eingeklappt
- [ ] Tabs konsistent (`.app-detail-tabs`)

Betroffen: Anfrage, Angebot, Auftrag, Rechnung, Kunde, Handwerker, Partner

### E5 — Wizards & Modals

- [ ] `WizardShell` / `AppFlowScreen` — bereits Phase D
- [ ] Neue Anfrage / Rechnung als Modal von Listen (Spec §9)

### E6 — Verifikation

- [ ] `npm run build`
- [ ] Visueller Abgleich Desktop + Mobile je Kernscreen
- [ ] Spec-Abnahme: keine Aktion-Spalte in Listen

---

## Nicht in Scope (Nutzer-Vorgabe)

Portal-UI · Cleanup-SQL · E2E · Wave 2+ (Reporting, Kalender-Redesign)
