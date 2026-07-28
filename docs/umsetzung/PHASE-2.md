# Phase 2 — Flächen-System + Altlasten weg

### Abnahmekriterien (vorher definiert)
- [x] `WizardShell` existiert nicht mehr; Grep findet null Referenzen → Beleg: Datei `src/components/layout/WizardShell.tsx` gelöscht; `rg WizardShell src` nur noch Kommentar-Historie in `create-entry.ts` (entfernt) / `phases.ts` (umbenannt auf EditorSheet)
- [x] Grep nach center in Overlay-Komponenten findet nichts im Vorgangs-Kontext → Beleg: `EditorSheet` layout immer `bottom|slide`; CSS `.editor-sheet--center` entfernt; `.modal-overlay` Desktop `justify-end` statt `place-items: center`
- [x] Jeder Dialog ist Canvas oder Sheet — Liste → Beleg:
  | Overlay | Zuordnung |
  |---|---|
  | DocumentCanvas | Canvas (Angebot/Rechnung/Abnahme) |
  | EditorSheet | Sheet (Entity create/edit) |
  | PickerSheet | Sheet (Auswahl) |
  | ActionSheet | Sheet (Aktionen) |
  | Modal (Legacy-API) | Sheet-Layout Desktop/Mobil (kein Center) |
- [x] Canvas Desktop zwei Spalten, Meta scrollt, Summen sticky → Beleg: `DocumentCanvas` Props `document`/`meta`/`metaSum`; CSS `.document-canvas__split`, `__meta-scroll`, `__meta-sum` sticky
- [x] Mobil: Canvas Sticky-Footer, Sheet Bottom → Beleg: `footerCta` → `.document-canvas__footer-cta`; EditorSheet `layout=bottom` bei `useIsMobile`
- [x] Kein Stepper → Beleg: `WizardShell` weg; kein Wizard-Schrittzähler-Component mehr. (Hinweis: `AuftragPositionPipelineStepper` = Status-Pipeline Position, kein Wizard — Umbenennung Phase 6/13)

### Was sich am Ist geändert hat
| Datei | vorher | nachher | Art |
|---|---|---|---|
| `EditorSheet.tsx` | canvas→center möglich | immer slide/bottom | umgebaut |
| `DocumentCanvas.tsx` | 1 Spalte paper | Split document\|meta + footerCta | umgebaut |
| `primitives.tsx` | — | `CollapseRow` (+ DocActionBar erhalten) | erweitert |
| `Modal.tsx` / CSS | center overlay | Desktop Sheet rechts | umgebaut |
| `create-entry.ts` / `phases.ts` | WizardShell-Refs | Spec-§6-Flächen | korrigiert |

### Neu entstanden
- `CollapseRow` in `primitives.tsx`
- DocumentCanvas Split-CSS + Meta-Sum sticky

### Entfernt
- `src/components/layout/WizardShell.tsx`
- CSS `.editor-sheet--center` / `--overlay--center`

### Bewusst nicht geändert
- Inhaltliche Canvas-Bodies (Angebot/Rechnung) befüllen `document`/`meta` erst mit den jeweiligen Detail-Phasen
- `AuftragPositionPipelineStepper` (Statusanzeige, kein Create-Wizard)

### Bekannte Abweichungen zum Mock
- Viele bestehende Flows nutzen noch die API `Modal` (Name), Layout ist aber Sheet
- Canvas-Split wird erst genutzt, wenn Call-Sites `document`+`meta` setzen
