# Phase 5d — Akte auf eine Ebene

### Abnahmekriterien (vorher definiert)
- [x] Kein Segment-Umschalter in der Akte — Grep-Beleg: `VorgangAkteTab.tsx` ohne `pos-segmented` / `AkteSegment` / `hideZahlung`; vier Detail-Clients rufen nur `dateien` + `notizen`
- [x] Zahlung erscheint nicht mehr in der Akte — Beleg: kein `zahlung`-Prop; Zahlung nur als eigener Shell-Tab
- [x] Alle vier Typen zeigen Dateien und Notizen untereinander — Beleg: Anfrage / Angebot / Auftrag / Rechnung je `<VorgangAkteTab dateien={…} notizen={…} />`

### Was sich am Ist geändert hat
| Datei | vorher | nachher | Art |
|---|---|---|---|
| `VorgangAkteTab.tsx` | Segmente Zahlung \| Dateien \| Kunde | Dateien + Notizen gestapelt | umgebaut |
| `AuftragDetailClient.tsx` | Akte mit Segmenten, Zahlung/Kunde | Akte Dateien+Notizen; Kunde in Übersicht | umgebaut |
| `AnfrageDetailClient.tsx` | Akte mit Segmenten | Akte Dateien+Notizen; Stammdaten in Übersicht | umgebaut |
| `AngebotDetailPageClient.tsx` | Akte mit Segmenten | Akte Dateien+Notizen; Stammdaten in Übersicht | umgebaut |
| `RechnungDetailClient.tsx` | Akte mit Segmenten | Akte Dateien+Notizen; Stammdaten/Auftragdetails in Übersicht | umgebaut |

### Neu entstanden
- `docs/umsetzung/PHASE-5d.md`

### Entfernt
- Akte-Segment-Umschalter (Zahlung / Dateien / Kunde)
- Query-Param-Sync `?segment=` für die Akte

### Bewusst nicht geändert
- Header-Chrome (Phase 5c, falls parallel)
- Leistungen-Kernobjekt (Phase 6)
- `detail-tab-helpers.parseAkteSegment` bleibt als Legacy-Helper ungenutzt

### Bekannte Abweichungen zum Mock
- Keine
