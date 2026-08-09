# Kurzspec — Desktop ≠ Mobile (UI-Jobs)

**Stand:** 2026-07-27 · **Audit:** [W8-05](./AUDIT-TODOS.md#welle-8--design-system--flow-einheit)  
**Breakpoint-SoT:** ≤767 px mobil · ≥768 px Desktop (`useIsMobile`, `mock-design-system.css`)  
**Kit:** [UMSETZUNGSPLAN-SURFACE.md](./UMSETZUNGSPLAN-SURFACE.md) · Flows: [FLOW-KATALOG.md](./FLOW-KATALOG.md)

Ziel: Für jeden **Job** (Nutzeraufgabe) ist klar, welche Surface auf Desktop vs. Mobile gilt — keine parallelen Muster ohne Grund.

---

## Job-Matrix

| Job | Desktop (≥768) | Mobile (≤767) | Code / Hinweis |
|-----|----------------|---------------|----------------|
| **Listen + Detail** | Master-Detail ab ~900 px (Kunden/Partner/Handwerker); sonst Vollbreite Liste → Route Detail | Immer Route-Detail; keine Split-View | `KundenMasterDetailShell`, Phasen-Listen → `/vorgaenge` + Deep-Link |
| **Detail-Inhalt (Tabs)** | `DetailShell`: linke Tab-Nav + Inhalt | `DetailShell`: Drill-Down (Abschnittsliste → Screen 2 + Zurück) | `DetailShell.tsx`, History-Back S10 |
| **Detail-Chrome** | Sidebar + TopBar; eine `DetailActionsBar` | BottomNav **aus** auf Entity-Detail; Back + sticky `DetailActionsBar` | `DashboardShell` Detail-Flag, W4-01 |
| **Create / Edit Entity** | `EditorSheet` **Slide-over** (`context=detail`) | `EditorSheet` **Bottom Sheet** | `EditorSheet.tsx` |
| **Dokument-Flow** (AG/RE/Abnahme/Vertrag) | `DocumentCanvas` **Vollbild Center** (Portal) | `DocumentCanvas` **Vollbild** (gleiches Layout) | `DocumentCanvas.tsx` — kein Slide-over |
| **Canvas-gebundenes Edit** | `EditorSheet` **Center-Modal** (`context=canvas`) | Bottom Sheet (wie Detail-Edit) | W11-04 |
| **Auswahl / Picker** (Kunde, Termin, …) | Popover / kompaktes Dropdown wo Platz | `PickerSheet` (Bottom Sheet) | W11-02 |
| **Listen-Filter** | Popover / Inline-Chips in Listbar | `MobileListFilterSheet` (Bottom Sheet) | W4-02 |
| **Zeitraum / Dashboard-Filter** | Popover | Sheet / kompaktes Overlay | `DashboardZeitraumFilterBar` |
| **Listen-Zeile ⋯ / Detail ⋯** | `ActionsMenu` Popover | `ActionSheet` | `DetailActionsBar`, `MockEntityRowMenu` |
| **Primär-Navigation** | Sidebar (Arbeit + Planung) | BottomNav: Dashboard · Vorgänge · FAB · Kalender · Kunden · Mehr | `nav-config.ts` `BOTTOM_NAV_ITEMS` |
| **Sekundär-Navigation** | Sidebar-Einträge | Mehr-Screen `/mehr` (Kachel-Grid) | `MEHR_TILE_NAV` |
| **Bestätigen / Verwerfen (Dirty)** | `Modal` zentriert | `ActionSheet` | EditorSheet S8, DocumentCanvas S9 |
| **Suche global** | Command-Palette / TopBar | Fullscreen Sheet | `GlobalSearch`, `TopBarSearch` |

---

## Regeln (kurz)

1. **Ein Job → eine Surface-Familie** pro Breakpoint; nicht Modal auf Desktop und Sheet auf Mobile ohne Kit-Entscheid.
2. **DocumentCanvas** bleibt auf beiden Breakpoints fullscreen — Inhalt scrollt pro Phase, nicht „kleines Modal“.
3. **EditorSheet** wechselt nur das **Layout** (Bottom / Slide / Center), nicht die Felder-Logik.
4. **Filter & Sekundäraktionen** auf Mobile immer **Sheet**, auf Desktop **Popover** (oder Listbar), außer trivial (1 Klick).
5. **Detail-Record:** App-Tabbar reduzieren (BottomNav hide), damit nicht zwei sticky Leisten konkurrieren.

---

## Bewusst nicht in dieser Spec

| Thema | Status |
|-------|--------|
| Swipe zwischen Detail-Tabs | Geparkt (W6-07) |
| Optimistic UI / Skeleton-Policy | Geparkt (W6-07) |
| Board / Desktop-Split Hover-Actions | W5-02 (offen) |

---

## Verweise

- [DESIGN_AUDIT_CRM_FUNDAMENT.md](./DESIGN_AUDIT_CRM_FUNDAMENT.md) § Mobile Bottom Nav  
- [DESIGN_KONZEPT_CRM_UI_UX.md](./DESIGN_KONZEPT_CRM_UI_UX.md)  
- [ENTSCHEIDUNGSLOG.md](./ENTSCHEIDUNGSLOG.md)
