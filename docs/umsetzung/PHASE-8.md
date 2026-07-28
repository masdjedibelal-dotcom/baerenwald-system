# Phase 8 — Abnahme → Abschluss

### Abnahmekriterien (vorher definiert)
- [x] Grep: kein Abschluss-Modal mehr im Repo → Beleg: `rg AbschlussdokumentationModal|AuftragAbschlussFlowClient src` → CLEAN; Dateien gelöscht
- [x] Beide Einstiege landen im gleichen Canvas → Beleg: Primary-CTA `abnahme_starten`/`auftrag_abschliessen` und ⋯ `onComplete` → `/auftraege/[id]/abnahme/erstellen`; `/abschluss` redirectet dorthin
- [x] Gate bei undokumentierten Positionen → Beleg: `AbnahmeprotokollCreateWizard` `undokumentiert` (leistung_status ≠ erledigt) + Banner „n von m … unter Vorbehalt“; verschwindet bei `n === 0`
- [x] Abschluss setzt Status + Undo im Toast → Beleg: `saveAbnahmeAndAbschliessen` → `finalizeAbschlussdokumentationOhneMail`; Toast-Action „Rückgängig“ via `updateAuftragStatusFromUi(previousStatus)`

### Was sich am Ist geändert hat
| Datei | vorher | nachher | Art |
|---|---|---|---|
| `AbnahmeprotokollCreateWizard.tsx` | 5 Abschnitte | 3 Spec-Schritte + Gate + Signatur-CTA | umgebaut |
| `abnahmeprotokoll-actions.ts` | nur PDF speichern | `saveAbnahmeAndAbschliessen` | erweitert |
| `AuftragDetailClient.tsx` | Modal + Mobile-Flow | nur Canvas-Route | umgebaut |
| `[id]/abschluss/page.tsx` | Modal-Flow | Redirect Abnahme-Canvas | umgebaut |

### Neu entstanden
- `saveAbnahmeAndAbschliessen` · `abnahmeprotokoll-actions.ts` · Speichern + Abschließen mit previousStatus

### Entfernt
- `AbschlussdokumentationModal.tsx` · Spec §8 / Katalog Phase 8
- `AuftragAbschlussFlowClient.tsx` · Spec §8 / Katalog Phase 8

### Bewusst nicht geändert
- Abschlussdokumentation-PDF-Actions/API (Dokumente/Mail) bleiben für Akte — nur Modal-UI weg
- `AuftragAbschlussSection` (optionaler Abschlussbericht-PDF) bleibt

### Bekannte Abweichungen zum Mock
- Signatur = Ort/Datum-Zeilen AN+AG (kein Pad) — reicht für CTA-Umschaltung
- Phasen 6/7 (Leistungen/Zahlung) noch nicht abgeschlossen; Mängel-Anzeige im Leistungen-Tab folgt Phase 6
