# Phase 7 — Zahlung-Tab und RateDrawer

### Abnahmekriterien (vorher definiert)
- [x] Drei Zustände einzeln belegt (leer / Einzelrechnung / Plan) → Beleg: `VorgangZahlungTab` Empty-CTA · `nurEinzel` · Plan mit Fortschritt + „Als nächstes“
- [x] Grep: `auftraege.zahlungsplan` wird nirgends mehr gelesen → Beleg: Prefill nur `angebote.zahlungsplan`; `zahlungsplan-actions` / Wizard-Kommentar Q2
- [x] Abschläge-Abzug in Summenblock und Kundenvorschau → Beleg: bereits `RechnungWizard` Schlussrechnung-Hinweis + Plan-Rest; Tab zeigt Fortschritt bezahlt/gestellt/offen
- [x] „Rechnung bearbeiten“ und „Gutschrift“ öffnen Canvas → Beleg: RateDrawer → `loadRechnungWizardBootstrap` / `createGutschriftFromRechnung` + `onOpenWizard`
- [x] Mahnstufe sichtbar in Zeile und Drawer → Beleg: Badge „Überfällig“ / „Mahnstufe n“; Drawer-Abschnitt Mahnungen
- [x] Reklamation bei Status *geplant* nicht anwählbar → Beleg: CTAs nur bei `gestellt`/`bezahlt`; `setRechnungReklamation` blockt Entwurf

### Was sich am Ist geändert hat
| Datei | vorher | nachher | Art |
|---|---|---|---|
| `VorgangZahlungTab.tsx` | — | drei Zustände + Plan-Editor | neu |
| `RateDrawer.tsx` | — | EditorSheet Abschnitte + Footer-CTAs | neu |
| `AuftragDetailClient.tsx` | `AuftragZahlungsplanSection` | `VorgangZahlungTab` | verdrahtet |
| `AngebotDetailPageClient.tsx` | Summen-Platzhalter | Vorschlag aus `angebote.zahlungsplan` | verdrahtet |
| `RechnungAuftragZahlplanTabs.tsx` | eigene Plan-Liste | `VorgangZahlungTab` (read-only) | umgebaut |
| `EditorSheet.tsx` | ohne Subtitle | `subtitle` + Footer bereits | erweitert |
| `rechnungen/actions.ts` | — | `setRechnungReklamation` | neu |
| `auftraege-data.ts` / `RechnungAuswahlZeile` | ohne Mahn/Reklamation | Felder für Badge/Drawer | erweitert |

### Neu entstanden
- `src/components/vorgang/VorgangZahlungTab.tsx`
- `src/components/vorgang/RateDrawer.tsx`
- `docs/umsetzung/PHASE-7.md`

### Entfernt
- —

### Bewusst nicht geändert
- Anfrage-Zahlung bleibt Platzhalter (kein RE-Kontext)
- `AuftragZahlungsplanSection.tsx` bleibt im Repo (Legacy/Editor-Hilfen); Auftrag-Tab nutzt sie nicht mehr
- Abschlagsplan-Editor (`AbschlagsplanEditorModal`) weiter genutzt zum Speichern auf `angebote.zahlungsplan`

### Bekannte Abweichungen zum Mock
- Mahnung öffnet bestehendes `ZahlungserinnerungMailModal` (kein Inline-Toast-only)
- Rechnung-Tab ist read-only mit Link „Im Auftrag“; Aktionen primär im Auftrag-Zahlung-Tab
- Legacy-`AuftragZahlungsplanSection` nicht gelöscht (Phase 13 Löschliste)
