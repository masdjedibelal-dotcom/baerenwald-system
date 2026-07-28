# N4 — UI-Nachzug (Spalten · Zahlung · Mahnung · Regie · Combobox)

Nachbesserungen zu den Gaps aus `GESAMTABNAHME.md` (Spalten-⋯, Anfrage-Zahlung-Platzhalter, Mahnung-Center-Modal, Regie-Chip nur Text, Kunden-Picker statt Combobox).

## Abnahme (Belege)

| Gap | Soll | Beleg |
|---|---|---|
| Leistungen Spalten-⋯ | Bezeichnung·Menge·Preis·Status + optional Gewerk/Handwerker/EK; Persistenz `localStorage` | `LeistungenTab.tsx` · Key `crm.cols.leistungen.v1` · CSS `.lt-cols-*` |
| Anfrage-Zahlung | leer / geplant / vorhanden (echte RE zum Lead) + Empty-CTA | `AnfrageZahlungTab.tsx` · verdrahtet in `AnfrageDetailClient` via `projektKontext.rechnungen` |
| Mahnung | EditorSheet/Drawer, kein Center-`Modal` | `ZahlungserinnerungMailModal.tsx` → `EditorSheet` (Export-Name unverändert) |
| Regie-Anlage-Chip | Sichtbarer Chip/Badge auf Rechnung, nicht nur `notiz_extern` | `dokument-zeilen`/`pos-board-line` `regieSchein` · `RechnungWizard` `badgeOf` + Chip-Zeile + Anlage `regieschein` |
| Combobox >15 | Kein natives Select mit >15; KundePicker → Combobox | `Select.tsx` Threshold; `KundePickerSheet` → Combobox + `listKundenFuerCombobox`; `OfferPositionCard` Gewerk/Leistung/HW über `Select`/`Combobox` |

## Dateien

| Datei | Art |
|---|---|
| `src/components/leistungen/LeistungenTab.tsx` | Spalten-⋯ + localStorage |
| `src/styles/mock-design-system.css` | `.lt-toolbar` / `.lt-cols-*` |
| `src/components/anfragen/AnfrageZahlungTab.tsx` | neu — drei Zustände |
| `src/components/anfragen/AnfrageDetailClient.tsx` | Zahlung-Tab verdrahtet |
| `src/components/rechnungen/ZahlungserinnerungMailModal.tsx` | Modal → EditorSheet |
| `src/lib/dokument-zeilen.ts` | `notizExtern` / `regieSchein` |
| `src/lib/posboard/pos-board-line.ts` | Chip-Felder durchreichen |
| `src/components/rechnungen/RechnungWizard.tsx` | Badge + Anlage-Chip Regieschein |
| `src/components/kunden/KundePickerSheet.tsx` | Combobox in EditorSheet |
| `src/app/(dashboard)/kunden/kunde-combobox-actions.ts` | `listKundenFuerCombobox` |
| `src/components/angebote/OfferPositionCard.tsx` | Select-Wrapper statt raw `<select>` |
| `docs/umsetzung/N4-UI-NACHZUG.md` | dieses Dokument |

## Bewusst offen / Gaps

- Raw-`<select>` in Legacy-Formularen (AnfrageNeuForm, AuftragFinanzen, …) mit typisch ≤15 Enum-Optionen unverändert — Threshold-Regel gilt primär für dynamische Listen (Gewerk/Leistung/HW/Kunde).
- `KundePickerSheet` lädt max. 200 Kunden (nicht unbegrenzte Server-Suche wie zuvor ab 2 Zeichen); sehr große Stammdaten → Tipp-Filter clientseitig.
- Regieschein-Anlage im Versand ist UI-Flag/Chip; separates PDF-Rendering des Scheins bleibt Legacy/API-Pfad.
- Anfrage-Zahlung: Plan-Zustand nur über Entwurfs-Rechnungen (`entwurf` = geplant); Abschlagsplan-Editor bleibt Auftrag/Angebot.
