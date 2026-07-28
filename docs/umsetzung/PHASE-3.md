# Phase 3 — Navigation

### Abnahmekriterien (vorher definiert)
- [x] Sidebar entspricht Spec-Reihenfolge und Gruppierung → Beleg: `SIDEBAR_NAV_GROUPS`: Arbeit = Dashboard/Vorgänge/Kunden/Handwerker; Organisation = Kalender/KI Analytics; Einstellungen bleibt Footer in `Sidebar.tsx`
- [x] Grep „Partner“ findet keine Nav-/Route-/Create-Einträge mehr → Beleg: Labels in `nav-config`, `MockNeuPopover`, `CommandPalette`, `CREATE_ENTRY_LABELS.partner` = „Neuer Handwerker“; kein Nav-Hit `/partner`
- [x] `/partner` gibt 404 oder leitet auf `/handwerker` → Beleg: `partner/page.tsx` + `[id]/page.tsx` redirect (Mapping → Handwerker)
- [x] Bottom-Nav fünf Einträge Spec-Reihenfolge → Beleg: Dashboard · Vorgänge · + · Kunden · Mehr (`BOTTOM_NAV_ITEMS` ohne Kalender; Kalender in `MEHR_TILE_NAV`)
- [x] Aktiv-Markierung Kunden- und Handwerker-Detail → Beleg: `navItemIsActive` Prefix-Match `/kunden/` und `/handwerker/`; Mehr aktiv für Kalender/Handwerker/KI/Einstellungen

### Was sich am Ist geändert hat
| Datei | vorher | nachher | Art |
|---|---|---|---|
| `nav-config.ts` | Partner, Planung, KI in Arbeit | Handwerker, Organisation, KI Analytics | umgebaut |
| `BottomNav.tsx` | … Kalender Kunden Mehr | … Kunden Mehr (+ Mehr aktiv für Org) | umgebaut |
| `partner/*` | Netzwerk-UI | Redirect Handwerker | umgebaut |
| Create/Search Labels | Partner | Handwerker | korrigiert |

### Neu entstanden
-

### Entfernt
- Nav-/Create-Einstieg Netzwerk `/partner`

### Bewusst nicht geändert
- Tabelle `partner` und `partner/actions.ts` (Daten/Backend)
- Partner-Komponenten-Dateien (ungenutzt von Route, Löschung Phase 13)

### Bekannte Abweichungen zum Mock
- Screenshot-Vergleich mit HTML-Mock nicht pixelweise; Struktur laut Spec §3
