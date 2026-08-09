# Phase 5c — Header-Chrome

### Abnahmekriterien (vorher definiert)
- [x] Vier Typen haben Chip, NextStepBar und ⋯ an identischer Stelle → Beleg:
  - Shell: `src/components/layout/EntityDetailLayout.tsx` (`WiedervorlageChip` in Badges, `NextStepBar`, mobil `DetailQuickBar`, Actions über `DetailHead`/`DetailActionsBar`)
  - Anfrage: `AnfrageDetailClient.tsx` — `wiedervorlageDatum` / `nextStep` / `nextStepMetrics` / `quickBar` / `DetailActionsBar`
  - Angebot: `AngebotDetailPageClient.tsx` — dieselben Props
  - Auftrag: `AuftragDetailClient.tsx` — dieselben Props
  - Rechnung: `RechnungDetailClient.tsx` — dieselben Props + `naechsterSchrittRechnung`
- [x] ⋯-Menü enthält keine Kontakt-, Portal- oder Notfall-Einträge mehr — Grep-Beleg:
  - `rg "onPortalLink|onPortal:|onNotfall" src/components/{anfragen,angebote,auftraege,rechnungen}/*Detail*.tsx` → leer
  - `src/lib/entity-menu.ts`: Portal/Notfall nur wenn `!isVorgangPhase`; Extra-Filter entfernt Labels mit `notfall`/`portal`/`anrufen`/`mail schreiben`/`kontakt`
- [x] Portal-Zeile in der Stammdaten-Karte zeigt Zustand (aktiv/eingeladen/nicht registriert) mit passender Aktion → Beleg:
  - `src/components/crm/StammdatenPortalZeile.tsx` + Einbindung in `EntityKundenStammdatenCard.tsx` (alle vier `*StammdatenCard`)
- [x] Mobil: Header schrumpft, QuickBar sichtbar, CTA über der Bottom-Nav → Beleg:
  - Scroll > 40px → `detail-entity-page--scrolled` / `detail-entity-sticky--compact` (`EntityDetailLayout.tsx`)
  - `DetailQuickBar` nur `isMobile`
  - `.detail-mobile-action-bar { bottom: var(--mobile-bottom-nav-height) }` in `mock-design-system.css`
- [x] Scroll-Container Bodenfreiheit (Desktop 96px, mobil Bottom-Nav + Safe + 28px + Sticky-CTA) → Beleg:
  - `.detail-entity-page--chrome` Desktop `padding-bottom/scroll-padding-bottom: 96px`
  - Mobil: `var(--mobile-bottom-nav-height) + 56px + 28px` (Nav inkl. Safe-Area)

### Was sich am Ist geändert hat
| Datei | vorher | nachher | Art |
|---|---|---|---|
| `EntityDetailLayout.tsx` | flacher Kopf | sticky Chrome, WV, NextStep, QuickBar | umgebaut (Vor-Commit + Nachzug) |
| `entity-menu.ts` | Portal/Mail/Prozess-CTAs im Vorgang-⋯ | nur Status · Bearbeiten/Kopieren · Löschen (+ gefilterte Extras) | umgebaut |
| `Anfrage/Angebot/Auftrag/Rechnung*Detail*` | unvollständige Chrome-Props / Portal im Menü | WV + Metrics + QuickBar; Portal/Notfall aus Menü | umgebaut |
| `EntityKundenStammdatenCard.tsx` | ohne Portal | Portal-Zeile | erweitert |
| `naechster-schritt.ts` | ohne Rechnung | `naechsterSchrittRechnung` | erweitert |
| `mock-design-system.css` | Chrome-Padding grob | Spec-Bodenfreiheit + CTA über Bottom-Nav | korrigiert |

### Neu entstanden
- `WiedervorlageChip` · `src/components/vorgang/WiedervorlageChip.tsx` · WV im Header
- `DetailQuickBar` · `src/components/vorgang/DetailQuickBar.tsx` · mobil Anrufen/Mail/Notiz/Foto
- `NextStepBar` · `src/components/crm/NaechsterSchrittBanner.tsx` · Schritt + Kennzahlen
- `StammdatenPortalZeile` · `src/components/crm/StammdatenPortalZeile.tsx` · Portal-Zustand in Stammdaten
- `DetailActionsBar` · `src/components/layout/DetailActionsBar.tsx` · Primary + ⋯ (Desktop rechts, mobil sticky)

### Entfernt
- Kontakt / Portal / Notfall aus Vorgang-⋯-Menüs (Spec §4) — Einstieg Portal → Stammdaten; Notfall-Einstieg folgt Phase 9

### Bewusst nicht geändert
- Handwerker-/Kunden-Detail-⋯ behalten Portal (kein Vorgang)
- Akte-Segmente (Phase 5d)
- Notfall-Flow-UI (Phase 9)

### Bekannte Abweichungen zum Mock
- WV-Chip ist Anzeige-only (Schnellwahl Morgen/3 Tage/… folgt Phase 10)
- „eingeladen“ ohne DB-Flag: nach erfolgreichem Link-Versand lokal; sonst `aktiv`/`nicht_registriert` aus `auth_user_id`
- Vorgang-⋯ kann statusnahe Extras behalten (Ablehnen, Stornieren, Gutschrift) — Spec-Kern „keine Kontakt/Portal/Notfall“ erfüllt
