# Findings-Register (Staging-Abnahme)

Stand: **2026-08-27** · Verknüpfung mit Fixplan-Batches.

| ID | Priorität | Thema | Fix | Status |
|---|---|---|---|---|
| **A-01** | P1 | PDF id-Route `/api/rechnungen/{id}/pdf` → 400 | FIX-01, FIX-07 | ✅ Fix in Batch 1 |
| **F-176** | P1 | Melde-Confirm hängt, kein Status-Link | FIX-02 | ✅ Fix in Batch 2 |
| **F-160** | P2 | Gesendete Rechnung ohne Titel | FIX-04 | ✅ Fix + Migration Backfill |
| **F-201** | P2 | „Als bezahlt“ ohne Confirm; Revert leert `bezahlt_at` nicht | FIX-03 | ✅ Fix in Batch 1 |
| **R-12** | P2 | Org-Farbe auf Status-Seite oft null | FIX-05 (Code + optional Seed) | ✅ Code-Fallback |
| **R-10** | — | Partner-Login flaky (Automation) | — | Geparkt (kein Produktbefund) |

## Legende

- **📌** in Checklisten/ABNAHME verweist auf diese ID.
- Erledigte Findings: Fix-Commit in `baerenwald` bzw. `baerenwald-system` referenzieren.
- Neue Findings: nächste freie `F-###`-Nummer vergeben und hier eintragen.

## Verweise

- Checkliste: `CHECKLISTE-REALISTISCH-STATUS.md`
- Finanz-Lauf: `TESTREPORT-A2-A1-FINANZ-LIVE.md` (A-01)
- Manuell Melde: `manual-fe37-check.json` (F-176)
