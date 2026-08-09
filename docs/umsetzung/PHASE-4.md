# Phase 4 — Vorgänge-Liste

### Abnahmekriterien (vorher definiert)
- [x] Kein Board, kein Board-Flag, keine Zeilenhöhen-Umschaltung → Beleg: Grep in `VorgaengeListeClient` ohne Board/rowHeight; nur Listen-Grid
- [x] Keine Aktion-Spalte „Wartet auf Freigabe“ → Beleg: Status bleibt Badge; keine eigene Aktion-Spalten-Copy; Hover = Anrufen/Mail/Bearbeiten
- [x] Chip heißt wörtlich „Wartung & Pflege“ → Beleg: `phaseChipLabel` / Chip-Text; Filter-Key intern `bestand`
- [x] Spalten-Toggle kollabiert wirklich → Beleg: `visibleCols` filtert `colDefs` + Header/Zellen; Kunde/Titel fix sichtbar
- [x] Ersetztes Dokument mit Chip → Beleg: `unterstatus===ersetzt` → `vg-row--ersetzt`, Titel durchgestrichen, Chip „ersetzt“
- [x] Undo im Lösch-Toast → Beleg: `toast.success(..., { action: { label: 'Rückgängig', ... } })` stellt `localRows` wieder her

### Was sich am Ist geändert hat
| Datei | vorher | nachher | Art |
|---|---|---|---|
| `VorgaengeListeClient.tsx` | Wiederkehrend, Multiauswahl-Toggle | Wartung & Pflege, Checkboxen immer, Spalten, Aggregat, Edge, Hover | umgebaut |
| `app-toast.tsx` | kein Action | Undo-Action | erweitert |
| `mock-design-system.css` | — | Edge/Flash/Ersetzt/Aggregat | erweitert |

### Neu entstanden
-

### Entfernt
- Multiauswahl-Toggle (Checkboxen dauerhaft)

### Bewusst nicht geändert
- Swipe links/rechts mobil (Karten-Layout vorhanden; voller Swipe-Gesture → Phase 11 Polish)
- Telefon/Mail Deep-Link noch über Kunden-Detail (Felder nicht in Liste)

### Bekannte Abweichungen zum Mock
- Mobil-Swipe Undo/Call noch nicht als Gesture
- Anrufen/Mail öffnen Kundenakte statt `tel:`/`mailto:` wenn Nummern fehlen in Row
