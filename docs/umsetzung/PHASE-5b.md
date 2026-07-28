# Phase 5b — Detail-Shell Anfrage / Angebot / Rechnung

### Abnahmekriterien (vorher definiert)
- [x] Alle vier Typen: identische Tab-Reihenfolge, Labels, Default `leistungen` → Beleg: Anfrage/Angebot/Rechnung/Auftrag je `*DETAIL_DEFAULT_TAB = 'leistungen'` und fünf Gruppen
- [x] 20 Kombinationen Inhalt → Beleg: je Typ 5 Tabs mit Render-Inhalt (Anfrage-Zahlung = Hinweistext)
- [x] Keine typspezifischen Sondertabs mehr → Beleg: nur uebersicht/leistungen/zahlung/akte/aktivitaet

### Was sich am Ist geändert hat
| Datei | vorher | nachher | Art |
|---|---|---|---|
| `AnfrageDetailClient.tsx` | 3 Tabs | 5 Spec-Tabs | umgebaut |
| `AngebotDetailPageClient.tsx` | 3 Tabs | 5 Spec-Tabs | umgebaut |
| `RechnungDetailClient.tsx` | 3 Tabs | 5 Spec-Tabs | umgebaut |
| `entity-detail-tabs.ts` | Labels | leistungen/zahlung | korrigiert |

### Neu entstanden
-

### Entfernt
-

### Bewusst nicht geändert
- Header-Chrome (Phase 5c)
- Akte-Segmente Kunde (Phase 5d)

### Bekannte Abweichungen zum Mock
- Anfrage-Zahlung = Platzhalter-Hinweis bis echte Rechnungen existieren
