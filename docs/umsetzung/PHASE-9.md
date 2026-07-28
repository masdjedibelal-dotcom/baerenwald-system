# Phase 9 — Regie und Notfall

### Abnahmekriterien (vorher definiert)
- [x] Grep: keine Deckel-Logik / keine „max. €“-Anzeige im Notfall → Beleg: `NotfallDirektBeauftragenModal` ohne Cap-Feld; `rg 'max\. €|ohneDeckel|Deckel' src/components/auftraege/Notfall*` → leer (nur Festpreis-Hinweis als Normalweg)
- [x] Notfall-Modal ohne Festpreis-Zweig → Beleg: nur `verguetung: 'aufwand'`; Felder Handwerker · Stundensatz · Materialaufschlag · Leistungsumfang · „Beauftragen“
- [x] Regie-Position Stunden × Satz + Badge „nach Aufwand“ → Beleg: `regie-display.ts` + `AuftragLeistungenV3Tab` Badge `REGIE_BADGE_LABEL` / `formatRegieSchaetzung`
- [x] Rechnung übernimmt Bautagebuch-Zeiten mit Schein-Referenz → Beleg: `positionenAusAuftrag` lädt `position_eintraege.zeit_minuten`; `auftragPositionenToAngebotPositionen` setzt Menge/Preis + `notiz_extern` „Regieschein: aus Bautagebuch“
- [x] Partnerseitige Texte ohne „Regie“ → Beleg: Notfall-Konditionen `abrechnung: 'nach Aufwand'`; Positionsbeschreibung ohne „Regie“; `rg Regie src/lib/partner` → leer

### Was sich am Ist geändert hat
| Datei | vorher | nachher | Art |
|---|---|---|---|
| `NotfallDirektBeauftragenModal.tsx` | Stundensatz + Deckel-Hinweis | Mock-Felder Aufwand | umgebaut |
| `notfall-direkt-actions.ts` | ohneDeckel-Flag | Materialaufschlag + Umfang | umgebaut |
| `AuftragNotfallBanner.tsx` | Festpreis/Deckel-Text | nur Aufwand | umgebaut |
| `auftrag-positionen-rechnung.ts` | flaches Mapping | Regie + BT-Zeiten | umgebaut |
| `AuftragLeistungenV3Tab.tsx` | — | Badge nach Aufwand | erweitert |

### Neu entstanden
- `src/lib/auftraege/regie-display.ts` · Formatierung Regie-Anzeige

### Entfernt
- Deckel-/Cap-UI und `ohneDeckel`-Prop am Notfall-Modal

### Bewusst nicht geändert
- Spalte `notfall_verguetung` bleibt (Katalog: keep column)
- Direktauftrag ohne Angebot mit Regie bleibt
- Dokumenttitel „Regiebericht“ (CRM-intern) bleiben

### Bekannte Abweichungen zum Mock
- Regie-Badge primär in Auftrags-Leistungen-Tabelle; Angebots-Canvas Regie-Editor folgt bei Bedarf Phase 11/13
- Regieschein als Anlage-Chip in Rechnung-UI nur als `notiz_extern`-Text, kein eigener Chip-Component
