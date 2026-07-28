# N2 — Card-in-Card auflösen

## Regel
Ein äußerer Rahmen pro Bereich. Verschachtelte Flächen ohne zweiten Border/Shadow.

## CSS (global)
| Selektor | Änderung |
|---|---|
| `.card .card` (+ dshell/wizard) | `border/shadow` weg, `background: transparent` |
| `.card .rounded-xl.border…bg-bw-card` (+ lg, dshell, wizard) | Rahmen/Radius/Shadow weg |
| `.offer-pos-row + .offer-pos-row` | nur `border-top` als Trenner |

## Komponenten
| Datei | vorher | nachher |
|---|---|---|
| `OfferPositionCard.tsx` | `rounded-xl border … bg-bw-card` | `offer-pos-row` ohne Rahmen (Listenzeile) |
| `VorgangZahlungTab` | einzelne `MockCard` (kein Nest) | unverändert — kein Doppelrahmen |
| `LeistungenTab` | Tabelle ohne innere Cards | unverändert |

## Betroffene Stellen (Tailwind-Nested, per CSS entschärft)
Wenn sie **innerhalb** `.card` / `.dshell-cards` / `.wizard-flow` gerendert werden:

- `AuftragKundenUpdatePanel.tsx` — `rounded-lg border … bg-bw-card`
- `AuftragHandwerkerPanel.tsx` — zwei Sections mit Border
- `AuftragComplianceTab.tsx` — `rounded-xl border`
- `AbnahmeprotokollChecklist.tsx` — Gewerk-Blöcke mit Border
- `AngebotWizardPositionenByGewerk.tsx` — Summen-Box `rounded-lg border`
- `HandwerkerBewertungModal.tsx` — innere Panel-Cards (Modal = eigener Surface)

## Bewusst Rahmen behalten
- Top-Level-`MockCard` / `.card` (äußerer Rahmen)
- Popovers/Dropdowns (kein Card-in-Card-Kontext)
- KPI-/Listen-Karten als **Geschwister**, nicht verschachtelt
