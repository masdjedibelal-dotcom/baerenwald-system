# Phase 6 — Leistungen (Kernobjekt)

### Abnahmekriterien (vorher definiert)
- [x] Eine Komponente für alle vier Phasen → Beleg: `LeistungenTab` in
  `AnfrageDetailClient.tsx`, `AngebotDetailsTab.tsx` / `AngebotDetailPageClient.tsx`,
  `AuftragDetailsTab.tsx` / `AuftragDetailClient.tsx`, `RechnungDetailClient.tsx`
- [x] Kein „+ Position", kein Positions-Editor, kein Gewerk-Hinzufügen in der Tabelle → Beleg:
  `src/components/leistungen/*` ohne Add/Editor/GewerkAdd; Grep in Tab-Call-Sites ohne
  `AuftragGewerkAddRow` / „+ Position"
- [x] Drawer: Aktionen nur im Footer, kein Eingabefeld zwischen Lese-Zeilen → Beleg:
  `LeistungDrawer.tsx` + `EditorSheet` `footer`; Abschnitte nur `DetailProp` / Leerzustände
- [x] Sammelaktionen nur beim Auftrag → Beleg: `bulkActions` nur in `AuftragLeistungenTab`
  (`phase="auftrag"`); Anfrage/Angebot/Rechnung ohne `bulkActions`
- [x] Tagebuch nirgends als Tab oder Segment → Beleg: Vor-Ort-Segmentpanel aus Leistungen-Tab
  entfernt; Button „Tagebucheintrag" unter Tabelle (kein Segment-Umschalter)
- [x] Mängel-Karte mit Frist und Status (offen/überfällig/behoben) → Beleg:
  `LeistungenMaengelCard` + `maengelFuerLeistungenTab` in Auftrag-LeistungenTab

### Was sich am Ist geändert hat
| Datei | vorher | nachher | Art |
|---|---|---|---|
| `src/components/leistungen/*` | — | shared Tab + Drawer + Adapter + Mängel | neu |
| `EditorSheet.tsx` | kein Footer | optional `footer` für CTAs | erweitert |
| `AuftragDetailsTab.tsx` | editable V3-Steuerung | read-only `LeistungenTab` + Bulk | umgebaut |
| `AngebotDetailsTab.tsx` | PosBoard | `LeistungenTab` | umgebaut |
| `AnfrageDetailClient.tsx` | Bedarf im Leistungen-Tab | `LeistungenTab`; Bedarf → Übersicht | umgebaut |
| `RechnungDetailClient.tsx` / `RechnungDetailsTab.tsx` | PosBoard in Details | `LeistungenTab` + Meta in Übersicht | umgebaut |
| `AuftragDetailClient.tsx` | Vor-Ort-Segment unter Leistungen | nur LeistungenTab; Dead-State weg | umgebaut |
| `detail-tab-helpers.ts` | `AkteSegment` + `parseAkteSegment` | nur Alias-Helper | bereinigt |
| `mock-design-system.css` | — | `.lt-*` / `.ldr-*` / sheet footer | erweitert |

### Neu entstanden
- `LeistungenTab` · `src/components/leistungen/LeistungenTab.tsx` · read-only Positions-Tabelle
- `LeistungDrawer` · `…/LeistungDrawer.tsx` · EditorSheet mit Lese-Abschnitten + Footer-CTAs
- `LeistungenMaengelCard` · `…/LeistungenMaengelCard.tsx` · Mängel über der Tabelle
- Adapter · `…/adapters.ts` · Anfrage/Angebot/Auftrag/Rechnung → `LeistungRow`

### Entfernt
- Akte-Segment-Typ/`parseAkteSegment` (tot nach Phase 5d)
- Vor-Ort-Segment-Einbindung im Auftrag-Leistungen-Tab (Tagebuch als Segment)

### Bewusst nicht geändert
- `AuftragLeistungenV3Tab` / PosBoard bleiben im Repo (andere Einstiege / Legacy) — Tab-UI nutzt sie nicht mehr
- Abnahme-Canvas / Abschluss-Flow → Phase 8
- Handwerker-Anfrage-Konditionen bereits in `AuftragLeistungZuweisungModal` (weiterverwendet)

### Bekannte Abweichungen zum Mock
- Tagebucheintrag-Button öffnet noch keinen Editor (Hinweis-Toast); volle Doku-Erfassung Phase 8/Portal
- Nachtrag-/Abschluss-Block war an Vor-Ort-Segment gekoppelt — Scroll-Ziel `#auftrag-nachtrag-section` ggf. leer bis Phase 8/10
- Spalten-⋯ (Nutzer-Default-Set) noch nicht — Phase setzt feste Spalten Bezeichnung·Menge·Preis·Status
