# AUFTRAG D — Fundliste Sprache & Kommunikation

**Datum:** 2026-08-26 (final)  
**Repos:** `baerenwald` + `baerenwald-system`

## D1 — Copy-Tabelle (F-147)

| Screen | Maßnahme | Status |
|--------|----------|--------|
| Melde Bereich | Absatz → `InfoTip` an H1 („Dringlichkeit … automatisch“) | ✅ |
| Melde-Status Kopf | doppelte Subtitle/`active.title` entfernt (Stepper behält Text) | ✅ |
| Melde-Status Empty | „Sobald Termine…“ | behalten |
| Melde-Bestätigung | `register_hint` → `InfoTip` | ✅ |
| AngebotWizardComplete | Absatz gekürzt | ✅ |
| AngebotWizard / ZahlungTab | Abschlag-Essay → `MockInfoTip` | ✅ |
| Demo-Banner / Empty Leistungen | | behalten |

## D2 — MockInfoTip (F-148)

| Komponente | Ort |
|------------|-----|
| `MockInfoTip` | `baerenwald-system/src/components/mock-ui/MockInfoTip.tsx` |
| `InfoTip` | `baerenwald/src/components/ui/InfoTip.tsx` |
| Touch | Wizard/ZahlungTab info-Blöcke → MockInfoTip; Melde StepWrapper/Bestätigung |

## D3 — Button-Copy (F-149)

| Vorher | Nachher | Ausnahme |
|--------|---------|----------|
| Übernehmen (Persist) | Speichern | KI/Katalog Apply bleibt Übernehmen |
| HW-Einreichung Übernehmen | Bestätigen | — |
| Fertig (Mängel-Sheet) | Speichern | Abnahme-Ende bleibt Fertig |
| Speichern und senden / fortfahren | Senden / Speichern | — |
| Erledigt markieren / *-Foto speichern | Erledigt / Speichern | — |

## D4 — Toasts (F-150)

Lange Toasts (Wizard/RE/Auftrag/Compliance) → ≤8 Wörter wo getroffen. Portal-Toast-Katalog teils länger (Descriptions) — bei Berührung kürzen.

## D5 / D6 — Leitfaden + Prozesse

- §17 Ausnahme **E3** Listen-Ranges ohne 2 NK ✅  
- §19.0 Zyklus **E1/E2/E3/E6** + Notfall-Flag + Kunden-Versand ausstehend ✅  
- `06-PROZESSE.md` Kunden-Versand als Zyklus-Ist markiert ✅  
