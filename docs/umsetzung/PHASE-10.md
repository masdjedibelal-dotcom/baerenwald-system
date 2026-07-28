# Phase 10 — Alltagsfunktionen und Dashboard

### Abnahmekriterien (vorher definiert)
- [x] Chip in allen vier Typen, „fällig“ farblich unterschieden → Beleg: `WiedervorlageChip` editierbar; verdrahtet in Anfrage/Angebot/Auftrag/Rechnung via `wiedervorlageEntity`; `faellig` → stärkere Amber-Klasse + Label „fällig“
- [x] Duplikat-Band + Zusammenführen setzt `zusammengefuehrt_in` → Beleg: `DuplikatBand` + `zusammenfuehrenLeadDuplikat`; Doppelter bleibt sichtbar mit Band „zusammengeführt“
- [x] Nachtrag: `nachtragZu` gelesen (Titel + Band) und beim Bootstrap gesetzt → Beleg: `AngebotWizard` Titel „Nachtrag erstellen“ + Hinweisband; `loadNachtragAngebotBootstrap` setzt `nachtragZu`; Menü „Nachtrag erstellen“
- [x] „Aufträge ohne Fortschritt“ gegen `letzte_aktivitaet` → Beleg: `page.tsx` filtert `now - letzte_aktivitaet > 10d` und schließt `fortschritt >= 80` aus
- [x] „Meine Arbeit“ im ersten Viewport vor Charts → Beleg: `DashboardClient` rendert `MyWorkInbox` vor KPI/Charts; Titel „Meine Arbeit“

### Was sich am Ist geändert hat
| Datei | vorher | nachher | Art |
|---|---|---|---|
| `WiedervorlageChip.tsx` | read-only | Schnellwahl + Speichern | umgebaut |
| `EntityDetailLayout.tsx` | Anzeige | Entity-Props | erweitert |
| `DuplikatBand.tsx` | — | Band + Zusammenführen | neu |
| `MyWorkInbox` / Dashboard | „Mein Tag“ | Spec-Buckets Meine Arbeit | umgebaut |
| `AngebotWizard` | — | nachtragZu Titel/Band | erweitert |

### Neu entstanden
- `wiedervorlage-actions.ts` · Speichern WV für 4 Tabellen
- `duplikat-actions.ts` · Zusammenführen + Kandidaten
- `DuplikatBand.tsx`

### Entfernt
- Alte Duplikat-Card in `LeadOrgKontextBlock` (ersetzt durch Band)

### Bewusst nicht geändert
- Vollständiger Undo aller Confirm-Dialoge repo-weit (Phase 10 Teilstück: WV + Duplikat + Abnahme Phase 8)
- Nachtrag-Speichern verknüpft Auftrag noch über neues Angebot (Bezug `nachtragZu` im Bootstrap; Sync folgt bei Speichern analog Korrektur)

### Bekannte Abweichungen zum Mock
- Nachtrag speichert neues Angebot; explizites `nachtraege[]`-Array am Auftrag folgt Datenmodell-Feinschliff
- Duplikat-Heuristik Tel/Mail/Objekt 30 Tage — Mock-Feinheit kann enger sein
