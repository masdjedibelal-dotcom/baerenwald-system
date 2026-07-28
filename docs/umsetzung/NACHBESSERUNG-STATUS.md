# Nachbesserung — Status (Gesamtabnahme nicht erteilt)

**Stand:** 2026-07-28 · Katalog-Nachbesserung N1–N6 + N5'-Korrektur

| ID | Auftrag | Status | Beleg |
|---|---|---|---|
| N1 | Typo/Spacing vollständig | ✅ | Commit `b983902` · `docs/umsetzung/N1-TYPO-SPACING.md` |
| N2 | Card-in-Card | ✅ | Commit `b983902` · `docs/umsetzung/N2-CARD-IN-CARD.md` |
| N3 | Toast → echte Funktion | ✅ | Commit `fdfd70b` · `docs/umsetzung/N3-TOAST-FUNKTION.md` |
| N4 | Fehlende UI | ✅ | Commit `6df1a66` · `docs/umsetzung/N4-UI-NACHZUG.md` |
| N5 | Screenshot Mock↔Ist | ⏭️ ersetzt durch **N5'** | — |
| N5' | Design-Diff per Grep | ✅ | `docs/umsetzung/N5-DESIGN-DIFF.md` · JSON · `scripts/n5-design-diff.py` |
| N5' Korrektur | Bewertung + Code 1–5 | ✅ | bereinigt **109** · Wizard/`--fs-*` · Lila weg · `.wv-chip`/`.vgid` · Prop-Deltas · Farbtabelle |
| N6 | Manueller Durchklick | ✅ | `docs/umsetzung/N6-DURCHKLICK.md` · Evidence `docs/umsetzung/n6-evidence/` |

Die frühere `GESAMTABNAHME.md` gilt **nicht** als erteilt. N5' bereinigt: **109 Funde** (PDF-„nur Mock“ und Spec-OK `13.5px` sind keine Funde; Mock-`12.5px` rechtfertigt App nicht).
