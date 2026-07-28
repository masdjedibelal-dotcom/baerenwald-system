# Phase 5a — Detail-Shell (nur Auftrag)

### Abnahmekriterien (vorher definiert)
- [x] Fünf Tabs Spec-Reihenfolge, Default `leistungen` → Beleg: `detailShellGroups` uebersicht/leistungen/zahlung/akte/aktivitaet; `AUFTRAG_DETAIL_DEFAULT_TAB = 'leistungen'`
- [x] Jeder Tab rendert Inhalt → Beleg: Übersicht (PhaseCards+Details), Leistungen (Tabelle+Vor-Ort-Block), Zahlung (Zahlungsplan), Akte (VorgangAkteTab), Aktivität (Timeline)
- [x] Unbekannter Default-Tab → kein leerer Bereich → Beleg: `DetailShell` `groups.find ?? groups[0]`; Resolver fällt auf `leistungen`
- [x] Kein `ausfuehrung` / „Vor Ort“ als Tab → Beleg: Tab-IDs ohne ausfuehrung; Alias → leistungen
- [x] Mobil alle fünf Tabs, 2px Unterstrich → Beleg: `dshell-tabs-mobile` / `.dshell-tab-mobile.active { border-bottom: 2px }`

### Was sich am Ist geändert hat
| Datei | vorher | nachher | Art |
|---|---|---|---|
| `AuftragDetailClient.tsx` | 4 Tabs inkl. Vor Ort | 5 Spec-Tabs, Default Leistungen | umgebaut |
| `DetailShell.tsx` | Mobil Drill-Down | Mobil Unterstrich-Tabs | umgebaut |
| `entity-detail-tabs.ts` | ausfuehrung→Vor Ort | leistungen/zahlung Labels | korrigiert |

### Neu entstanden
-

### Entfernt
- Tab-ID `ausfuehrung` als Shell-Tab

### Bewusst nicht geändert
- Vor-Ort-Inhalte bleiben unter Leistungen bis Phase 6/8 (Abnahme-Canvas)
- Akte enthält noch Segment Zahlung (Phase 5d entfernt)

### Bekannte Abweichungen zum Mock
- Leistungen-Tab enthält vorübergehend noch Vor-Ort-Block
