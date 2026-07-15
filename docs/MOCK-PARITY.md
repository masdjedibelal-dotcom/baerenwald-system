# Mock-Parität — Live vs. Mock `(2)`

Stand: Jul 2026 · Referenz: `docs/mock-reference/` + `ENTWICKLER-SPEC.md`

## Legende

| Status | Bedeutung |
|--------|-----------|
| ✅ | Umgesetzt / Mock-parität |
| 🟡 | Teilweise (funktional, UI-Abweichung) |
| ❌ | Offen |

## Navigation & Shell

| Screen | Status | Notiz |
|--------|--------|-------|
| Sidebar (Arbeit / Stammdaten / Planung) | ✅ | |
| Bottom-Nav + FAB + Neu-Popover | ✅ | |
| `/vorgaenge` zentrale Liste | ✅ | |
| Legacy-Listen → Redirect | ✅ | `/anfragen` … `/rechnungen` |
| KI Hub entfernt | ✅ | Redirect `/vorgaenge` |
| Integrationen (Einstellungen) entfernt | ✅ | Nutzerwunsch |

## Vorgänge-Liste

| Punkt | Status |
|-------|--------|
| Spalten Phase · Unterstatus · Titel · Meta | 🟡 | Grid noch erweitert (Kunde/Vorgang/Wert/Datum) |
| Kein „Aktion nötig“-Chip | ✅ |
| Kein act-badge / Actor-Spalte | ✅ |
| `?phase=` URL-Sync | ✅ |
| Sortierung letzte Aktivität | ✅ |

## Detail (Spec §3)

| Entität | Tabs Mock | Status |
|---------|-----------|--------|
| Anfrage | Stammdaten · Details · Verlauf · Dokumente · Notizen | 🟡 |
| Angebot | wie oben | 🟡 |
| Auftrag | + Zahlplan · Bautagebuch | ✅ |
| Rechnung | Standard-Tabs | 🟡 |
| Kunde/HW/Partner | Übersicht + Standard | 🟡 |
| Finanzen-Tab Auftrag | entfernt | ✅ |
| Visualisierungen Angebot | entfernen | 🟡 |

## PosBoard & Wizards

| Punkt | Status |
|-------|--------|
| PosTable + PositionModal + PosTotals | ✅ |
| PosBoard in Details | ✅ |
| PosBoard in Angebots-Wizard | ✅ |
| PosBoard in Rechnungs-Wizard | ✅ |
| Alt `AngebotWizardPositionenByGewerk` | ✅ entfernt |
| Alt positionen-v3 | ✅ entfernt |

## Erstellen

| Punkt | Status |
|-------|--------|
| Neu-Popover → `/neu?art=…` | ✅ |
| Anfrage/Kunde/HW/Partner persistieren | ✅ |
| Angebot → Wizard | ✅ |
| Rechnung → Wizard | ✅ |
| Auftrag standalone | 🟡 | Mock-Demo; kein DB-Flow |

## Einstellungen

| Tab Mock | Live-Route | Status |
|----------|------------|--------|
| Firma | `/einstellungen/firma` | ✅ |
| Team | `/einstellungen/benutzer` | ✅ |
| Preislisten | `/einstellungen/preise` | ✅ |
| Formulare | `/einstellungen/formulare` | ✅ |
| Benachrichtigungen | `/einstellungen/email` | ✅ |
| Sicherheit & DSGVO | `/einstellungen/sicherheit` | ✅ |
| Integrationen | — | ✅ entfernt |

## Entity-Menü

| Punkt | Status |
|-------|--------|
| „Löschen“ (nicht „Vorgang löschen“) | ✅ |
| Kein „Öffnen“ im ⋯-Menü | ✅ |

## Verifikation

```bash
npx tsc --noEmit
npm run build
```

Manuell: Vorgänge → Detail → Wizard → Einstellungen → Neu erstellen
