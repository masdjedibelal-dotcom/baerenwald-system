# N5' — Design-Diff per Grep (Mock ↔ App)

**Stand:** 2026-07-28 (Bewertung korrigiert + Nachbesserung 1–5)  
**Mock:** `Baerenwald CRM (standalone) (9).html` (CSS aus Bundle-JS-String + `<style>`)  
**App-Scope:** 205 Dateien (Vorgang/Liste/Detail/Leistungen/Zahlung/Mock-CSS/Tokens)  
**Methode:** Extraktion aller `font-size` / `padding|gap` / Hex / Kernklassen / Tab+Chip-Reihenfolge — vollständig im Scope, keine Stichprobe.  
**Skript:** `scripts/n5-design-diff.py` · Rohdaten: `docs/umsetzung/N5-DESIGN-DIFF.json`  
**Ersetzt:** N5 Screenshot-Vergleich.

## Bewertung — Korrektur

| | |
|---|---|
| Roh-Gesamtfund (Skript) | 109 |
| Falsche Positive („nur Mock“) | **0 in der Fundliste** — PDF-Vorlagen `14.5 / 23 / 24 / 26 / 27 / 28 / 34px` und Spec-OK `13.5px` (238× Mock / 0× App via `var(--fs-text)`) waren nie App-Funde, nur Tabellenzeilen |
| Streichung | Zeile „Mock hat auch font-sizes außerhalb der Vierersatz“ — Mock-`12.5px` (2×) rechtfertigt nicht App-`12.5px` (11×) |
| **Bereinigte Fundzahl** | **109** |

Nach Nachbesserung 1–5 (Code): Wizard-Typo (−33), Lila (−6), Klassen/Prop-Deltas (−5) → siehe Abschnitt „Nachbesserung“.

## Gesamturteil (bereinigt)

| | |
|---|---|
| **Gesamtfund (bereinigt)** | **109** |
| Tokens definiert | ja (`--fs-*`) |
| Tokens überall genutzt | **nein** — 38 harte px außerhalb Spec **in der App** (davon 33 in `RechnungWizard.tsx`) |
| Kernstruktur Tabs/Chips App | **1:1 Spec** |

## Gesamtfund: **109** (bereinigt)

| Bereich | Funde | Kernaussage |
|---|---:|---|
| typo | 38 | v. a. `RechnungWizard.tsx` (11.5–18px) + Globals/Search |
| spacing | 7 | Safe-Area / Sheet-Paddings ohne Mock-Pendant |
| farbe | 58 | Hex außerhalb Mock-Hex-Set (inkl. 6× Lila + Brand-Fallbacks) |
| klasse | 5 | `.wv-chip`/`.vgid` fehlen; `.nsb`/`.crow`/`.dc-split` Prop-Deltas |
| struktur | 1 | nur unvollständige Mock-Chip-Extraktion — App OK |

## a) Typo — `font-size`

**Soll (Spec/N1):** nur `12 · 13.5 · 15 · 19` px bzw. `--fs-meta|text|title|head`.

**Nicht als Fund:** PDF-Vorlagen im Mock (`14.5px`, `23–34px`) und Spec-OK `13.5px` (App nutzt `var(--fs-text)`).

| Wert | Mock | App | Einordnung |
|---|---:|---:|---|
| `1.35px` | 0 | 1 | Fund — nur App |
| `11.5px` | 0 | 4 | Fund — nur App |
| `11px` | 0 | 1 | Fund — nur App |
| `12.5px` | 2 | 11 | Fund — App (Mock-2× rechtfertigt App nicht) |
| `12px` | 482 | 5 | OK Spec |
| `13.5px` | 238 | 0 | OK Spec (`var(--fs-text)`) |
| `13px` | 0 | 7 | Fund — nur App |
| `14.5px` | 2 | 0 | kein Fund — PDF-Vorlage |
| `14px` | 2 | 7 | Fund — App |
| `15px` | 72 | 0 | OK Spec |
| `16px` | 0 | 1 | Fund — nur App |
| `18px` | 0 | 3 | Fund — nur App |
| `19px` | 14 | 0 | OK Spec |
| `23px`…`34px` | >0 | 0 | kein Fund — PDF-Vorlagen |
| `var(--fs-*)` | 0 | viele | OK Spec |

### Typo-Funde (38) — App-Werte ≠ Spec-Viererset

| Datei | Zeile | Ist | Soll |
|---|---:|---|---|
| `src/styles/mock-design-system.css` | 7324 | `inherit!important → inherit` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| `src/app/globals.css` | 221 | `calc(14px*var(--app-font-scale,1))` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| `src/app/globals.css` | 244 | `16px!important → 16px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| `src/components/anfragen/staff-funnel/StaffFunnelUi.tsx` | 138 | `1.35px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| `src/components/rechnungen/RechnungWizard.tsx` | 1061 | `14px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| `src/components/rechnungen/RechnungWizard.tsx` | 1117 | `13px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| `src/components/rechnungen/RechnungWizard.tsx` | 1118 | `11.5px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| `src/components/rechnungen/RechnungWizard.tsx` | 1192 | `13px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| `src/components/rechnungen/RechnungWizard.tsx` | 1213 | `14px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| `src/components/rechnungen/RechnungWizard.tsx` | 1217 | `12.5px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| `src/components/rechnungen/RechnungWizard.tsx` | 1271 | `12.5px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| `src/components/rechnungen/RechnungWizard.tsx` | 1289 | `12.5px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| `src/components/rechnungen/RechnungWizard.tsx` | 1353 | `18px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| `src/components/rechnungen/RechnungWizard.tsx` | 1356 | `12.5px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| `src/components/rechnungen/RechnungWizard.tsx` | 1360 | `12.5px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| `src/components/rechnungen/RechnungWizard.tsx` | 1446 | `13px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| `src/components/rechnungen/RechnungWizard.tsx` | 1448 | `12.5px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| `src/components/rechnungen/RechnungWizard.tsx` | 1487 | `13px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| `src/components/rechnungen/RechnungWizard.tsx` | 1559 | `11.5px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| `src/components/rechnungen/RechnungWizard.tsx` | 1637 | `13px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| `src/components/rechnungen/RechnungWizard.tsx` | 1680 | `12.5px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| `src/components/rechnungen/RechnungWizard.tsx` | 1704 | `14px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| `src/components/rechnungen/RechnungWizard.tsx` | 1749 | `13px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| `src/components/rechnungen/RechnungWizard.tsx` | 1750 | `11.5px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| `src/components/rechnungen/RechnungWizard.tsx` | 1792 | `18px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| `src/components/rechnungen/RechnungWizard.tsx` | 1793 | `12.5px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| `src/components/rechnungen/RechnungWizard.tsx` | 1804 | `14px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| `src/components/rechnungen/RechnungWizard.tsx` | 1852 | `13px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| `src/components/rechnungen/RechnungWizard.tsx` | 1857 | `11px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| `src/components/rechnungen/RechnungWizard.tsx` | 1867 | `11.5px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| `src/components/rechnungen/RechnungWizard.tsx` | 1880 | `18px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| `src/components/rechnungen/RechnungWizard.tsx` | 1881 | `12.5px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| `src/components/rechnungen/RechnungWizard.tsx` | 1954 | `14px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| `src/components/rechnungen/RechnungWizard.tsx` | 1994 | `14px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| `src/components/rechnungen/RechnungWizard.tsx` | 2029 | `12.5px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| `src/components/rechnungen/RechnungWizard.tsx` | 2051 | `14px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| `src/components/rechnungen/RechnungWizard.tsx` | 2056 | `12.5px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| `src/components/layout/GlobalSearch.tsx` | 268 | `16px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |

## b) Spacing — `padding` / `gap` (Karten · Zeilen · Props)

Funde (px-Werte im Vorgangs-CSS/TSX, die so nicht im Mock vorkommen): **7**

| Datei | Zeile | Ist | Soll (Mock) |
|---|---:|---|---|
| `src/styles/mock-design-system.css` | 546 | `padding-bottom:120px` | Mock-padding-bottom: 0, 10px, 14px, 16px, 2px, 4px, 60px, 6px, 7px, 8px, calc(60 |
| `src/styles/mock-design-system.css` | 4811 | `padding:008px` | Mock-padding: 0, 0"], 0"],, 0"]>.card-h, 0"]>.card-h,, 0"]>.card-h.title, 0"]>.c |
| `src/styles/mock-design-system.css` | 6082 | `padding:10px14pxmax(10px,env(safe-area-inset-bottom,0px))` | Mock-padding: 0, 0"], 0"],, 0"]>.card-h, 0"]>.card-h,, 0"]>.card-h.title, 0"]>.c |
| `src/styles/mock-design-system.css` | 7932 | `padding-bottom:max(0.75rem,env(safe-area-inset-bottom,0px))` | Mock-padding-bottom: 0, 10px, 14px, 16px, 2px, 4px, 60px, 6px, 7px, 8px, calc(60 |
| `src/styles/mock-design-system.css` | 12335 | `padding-bottom:88px` | Mock-padding-bottom: 0, 10px, 14px, 16px, 2px, 4px, 60px, 6px, 7px, 8px, calc(60 |
| `src/styles/mock-design-system.css` | 12826 | `padding:012px040px` | Mock-padding: 0, 0"], 0"],, 0"]>.card-h, 0"]>.card-h,, 0"]>.card-h.title, 0"]>.c |
| `src/styles/mock-design-system.css` | 12838 | `padding-right:42px` | Mock-padding-right: 16px, 28px, 8px | Atome: 0, 0011px, 0012px, 010px, 012px, 01 |

## c) Farben — Hex gegen Mock-Palette

Mock-Hex-Set: **35** eindeutige Werte.
App-Funde (Hex im Scope, nicht in Mock-Set): **58**

| Datei | Zeile | Ist-Hex | Soll |
|---|---:|---|---|
| `src/styles/mock-design-system.css` | 462 | `#7C5CFC` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/styles/mock-design-system.css` | 462 | `#9B6DFF` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/styles/mock-design-system.css` | 462 | `#B56BFF` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/styles/mock-design-system.css` | 468 | `#6F4FF0` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/styles/mock-design-system.css` | 468 | `#8F5FF5` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/styles/mock-design-system.css` | 468 | `#A85CF5` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/styles/mock-design-system.css` | 4250 | `#B42318` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/styles/mock-design-system.css` | 4264 | `#6B8F71` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/styles/mock-design-system.css` | 4311 | `#E9EDEC` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/styles/mock-design-system.css` | 4341 | `#E9EDEC` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/styles/mock-design-system.css` | 4344 | `#FFF4E5` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/styles/mock-design-system.css` | 4344 | `#C0622B` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/styles/mock-design-system.css` | 4345 | `#FDECEC` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/styles/mock-design-system.css` | 4345 | `#B42318` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/styles/mock-design-system.css` | 4350 | `#B42318` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/styles/mock-design-system.css` | 5122 | `#D4A017` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/styles/mock-design-system.css` | 6793 | `#D4D1CB` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/styles/mock-design-system.css` | 7732 | `#F3F2EF` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/styles/mock-design-system.css` | 7819 | `#F3F2EF` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/styles/mock-design-system.css` | 11204 | `#C4922A` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/styles/mock-design-system.css` | 11212 | `#0091AE` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/styles/mock-design-system.css` | 11216 | `#6B7280` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/styles/mock-design-system.css` | 11315 | `#C4922A` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/styles/mock-design-system.css` | 11321 | `#0091AE` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/styles/mock-design-system.css` | 11446 | `#F2F2F7` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/styles/mock-design-system.css` | 12367 | `#FFF8EB` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/styles/mock-design-system.css` | 12368 | `#8A6A00` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/styles/mock-design-system.css` | 12411 | `#C8D0C9` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/styles/mock-design-system.css` | 12427 | `#D97706` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/styles/mock-design-system.css` | 12428 | `#FFF8EB` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/styles/mock-design-system.css` | 12535 | `#F0A020` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/styles/mock-design-system.css` | 12828 | `#D5DBD6` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/styles/mock-design-system.css` | 12930 | `#FEF2F2` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/styles/mock-design-system.css` | 12931 | `#991B1B` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/styles/mock-design-system.css` | 12935 | `#14532D` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/styles/mock-design-system.css` | 13185 | `#F4F5F4` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/styles/mock-design-system.css` | 13199 | `#F4F5F4` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/app/globals.css` | 21 | `#E5E3DF` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/app/globals.css` | 22 | `#D6D3CE` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/app/globals.css` | 23 | `#E5E3DF` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/app/globals.css` | 105 | `#C4922A` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/app/globals.css` | 106 | `#FDF3E3` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/app/globals.css` | 132 | `#FEF0E6` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/app/globals.css` | 133 | `#C0622B` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/app/globals.css` | 158 | `#EEF0EE` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/app/globals.css` | 182 | `#0F1411` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/app/globals.css` | 183 | `#1A211C` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/app/globals.css` | 195 | `#D8DCD8` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/app/globals.css` | 257 | `#E5E3DF` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/components/anfragen/LeadGptStudioBlock.tsx` | 145 | `#EAF3DE` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/components/anfragen/LeadGptStudioBlock.tsx` | 271 | `#EAF3DE` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/components/angebote/VizPrepareQuestions.tsx` | 22 | `#EEF3EC` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/components/angebote/AngebotVisualisierungClient.tsx` | 818 | `#153222` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/components/angebote/AngebotWizardVizBlock.tsx` | 133 | `#EEF3EC` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/components/auftraege/AuftragAbnahmeprotokollCard.tsx` | 177 | `#F0D9A8` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/components/auftraege/AuftragAbnahmeprotokollCard.tsx` | 178 | `#FFF8EB` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/components/auftraege/leistungen-v3/AuftragLeistungZuweisungModal.tsx` | 325 | `#B91C1C` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| `src/components/auftraege/leistungen-v3/AuftragLeistungZuweisungModal.tsx` | 426 | `#B91C1C` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |

## d) Klassen-Abgleich

| Mock-Klasse | App-Pendant | In Mock-CSS | In App-CSS | TSX-Refs | Abweichung |
|---|---|---|---|---:|---|
| `.lt-row` | .lt-row in mock-design-system.css | ✓ | ✓ | 1 | OK CSS |
| `.ldr-sec` | .ldr-sec in mock-design-system.css | ✓ | ✓ | 1 | Props weichen ab |
| `.nsb` | .next-step-bar | ✓ | ✓ | 0 | Props weichen ab (Alias .next-step-bar) |
| `.vgid` | — | ✓ | — | 0 | fehlt in App-CSS |
| `.crow` | .list-row | ✓ | ✓ | 7 | Props weichen ab (Alias .list-row) |
| `.dc-split` | .document-canvas | ✓ | ✓ | 3 | Props weichen ab (Alias .document-canvas) |
| `.wv-chip` | — | ✓ | — | 0 | fehlt in App-CSS |
| `.qbar` | .qbar in mock-design-system.css | ✓ | ✓ | 0 | OK CSS |

### Prop-Deltas (wenn CSS beiderseits da)
- **.ldr-sec**: `{"margin-bottom": "Mock=16px ≠ App=var(--sp-stack)"}`
- **.nsb**: `{"align-items": "Mock=center ≠ App=stretch", "gap": "Mock=16px ≠ App=10px16px", "padding": "Mock=11px14px ≠ App=10px12px", "margin-bottom": "Mock=16px / App=fehlt", "border-radius": "Mock=10px ≠ App=8px", "border": "Mock=0.5pxsolidvar(--border) ≠ App=0.5pxsolidcolor-mix(insrgb,var(--green)22%,var(--border))", "background": "Mock=var(--card) ≠ App=var(--green-50)"}`
- **.vgid**: `{"display": "Mock=flex / App=fehlt", "gap": "Mock=4px / App=fehlt"}`
- **.crow**: `{"border": "Mock=0.5pxsolidvar(--border) / App=fehlt", "border-radius": "Mock=10px / App=fehlt", "background": "Mock=var(--card) / App=fehlt"}`
- **.dc-split**: `{"display": "Mock=grid / App=fehlt", "grid-template-columns": "Mock=minmax(0,1fr)320px / App=fehlt", "gap": "Mock=26px / App=fehlt", "align-items": "Mock=start / App=fehlt"}`
- **.wv-chip**: `{"display": "Mock=inline-flex / App=fehlt", "align-items": "Mock=center / App=fehlt", "gap": "Mock=5px / App=fehlt", "padding": "Mock=3px9px / App=fehlt", "border-radius": "Mock=20px / App=fehlt", "font-size": "Mock=12px / App=fehlt", "border": "Mock=0.5pxsolidvar(--border) / App=fehlt", "background": "Mock=var(--bg-soft) / App=fehlt"}`

## e) Struktur — Reihenfolge

| Bereich | Mock (erste Treffer-Reihenfolge) | App |
|---|---|---|
| Liste-Chips | Alle → Angebot → Auftrag → Rechnung | Alle → Anfrage → Angebot → Auftrag → Rechnung → Wartung & Pflege |
| Detail-Tabs | Akte → Übersicht → Leistungen → Aktivität | Übersicht → Leistungen → Zahlung → Akte → Aktivität |
| Header-Marker | WV → Wiedervorlage | Wiedervorlage → WV |

| Datei | Ist | Soll |
|---|---|---|
| `Mock HTML` | Alle → Angebot → Auftrag → Rechnung | Alle → Anfrage → Angebot → Auftrag → Rechnung → Wartung & Pflege (Katalog/Spec) |

## Fund-Liste (gesamt, kompakt)

| # | Bereich | Datei | Zeile | Ist | Soll |
|---:|---|---|---:|---|---|
| 1 | typo | `src/styles/mock-design-system.css` | 7324 | `inherit!important → inherit` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| 2 | typo | `src/app/globals.css` | 221 | `calc(14px*var(--app-font-scale,1))` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| 3 | typo | `src/app/globals.css` | 244 | `16px!important → 16px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| 4 | typo | `src/components/anfragen/staff-funnel/StaffFunnelUi.tsx` | 138 | `1.35px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| 5 | typo | `src/components/rechnungen/RechnungWizard.tsx` | 1061 | `14px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| 6 | typo | `src/components/rechnungen/RechnungWizard.tsx` | 1117 | `13px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| 7 | typo | `src/components/rechnungen/RechnungWizard.tsx` | 1118 | `11.5px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| 8 | typo | `src/components/rechnungen/RechnungWizard.tsx` | 1192 | `13px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| 9 | typo | `src/components/rechnungen/RechnungWizard.tsx` | 1213 | `14px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| 10 | typo | `src/components/rechnungen/RechnungWizard.tsx` | 1217 | `12.5px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| 11 | typo | `src/components/rechnungen/RechnungWizard.tsx` | 1271 | `12.5px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| 12 | typo | `src/components/rechnungen/RechnungWizard.tsx` | 1289 | `12.5px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| 13 | typo | `src/components/rechnungen/RechnungWizard.tsx` | 1353 | `18px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| 14 | typo | `src/components/rechnungen/RechnungWizard.tsx` | 1356 | `12.5px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| 15 | typo | `src/components/rechnungen/RechnungWizard.tsx` | 1360 | `12.5px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| 16 | typo | `src/components/rechnungen/RechnungWizard.tsx` | 1446 | `13px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| 17 | typo | `src/components/rechnungen/RechnungWizard.tsx` | 1448 | `12.5px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| 18 | typo | `src/components/rechnungen/RechnungWizard.tsx` | 1487 | `13px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| 19 | typo | `src/components/rechnungen/RechnungWizard.tsx` | 1559 | `11.5px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| 20 | typo | `src/components/rechnungen/RechnungWizard.tsx` | 1637 | `13px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| 21 | typo | `src/components/rechnungen/RechnungWizard.tsx` | 1680 | `12.5px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| 22 | typo | `src/components/rechnungen/RechnungWizard.tsx` | 1704 | `14px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| 23 | typo | `src/components/rechnungen/RechnungWizard.tsx` | 1749 | `13px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| 24 | typo | `src/components/rechnungen/RechnungWizard.tsx` | 1750 | `11.5px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| 25 | typo | `src/components/rechnungen/RechnungWizard.tsx` | 1792 | `18px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| 26 | typo | `src/components/rechnungen/RechnungWizard.tsx` | 1793 | `12.5px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| 27 | typo | `src/components/rechnungen/RechnungWizard.tsx` | 1804 | `14px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| 28 | typo | `src/components/rechnungen/RechnungWizard.tsx` | 1852 | `13px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| 29 | typo | `src/components/rechnungen/RechnungWizard.tsx` | 1857 | `11px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| 30 | typo | `src/components/rechnungen/RechnungWizard.tsx` | 1867 | `11.5px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| 31 | typo | `src/components/rechnungen/RechnungWizard.tsx` | 1880 | `18px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| 32 | typo | `src/components/rechnungen/RechnungWizard.tsx` | 1881 | `12.5px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| 33 | typo | `src/components/rechnungen/RechnungWizard.tsx` | 1954 | `14px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| 34 | typo | `src/components/rechnungen/RechnungWizard.tsx` | 1994 | `14px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| 35 | typo | `src/components/rechnungen/RechnungWizard.tsx` | 2029 | `12.5px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| 36 | typo | `src/components/rechnungen/RechnungWizard.tsx` | 2051 | `14px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| 37 | typo | `src/components/rechnungen/RechnungWizard.tsx` | 2056 | `12.5px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| 38 | typo | `src/components/layout/GlobalSearch.tsx` | 268 | `16px` | 12px | 13.5px | 15px | 19px (oder --fs-*) |
| 39 | spacing | `src/styles/mock-design-system.css` | 546 | `padding-bottom:120px` | Mock-padding-bottom: 0, 10px, 14px, 16px, 2px, 4px, 60px, 6px, 7px, 8p |
| 40 | spacing | `src/styles/mock-design-system.css` | 4811 | `padding:008px` | Mock-padding: 0, 0"], 0"],, 0"]>.card-h, 0"]>.card-h,, 0"]>.card-h.tit |
| 41 | spacing | `src/styles/mock-design-system.css` | 6082 | `padding:10px14pxmax(10px,env(safe-area-inset-bottom,0px))` | Mock-padding: 0, 0"], 0"],, 0"]>.card-h, 0"]>.card-h,, 0"]>.card-h.tit |
| 42 | spacing | `src/styles/mock-design-system.css` | 7932 | `padding-bottom:max(0.75rem,env(safe-area-inset-bottom,0px))` | Mock-padding-bottom: 0, 10px, 14px, 16px, 2px, 4px, 60px, 6px, 7px, 8p |
| 43 | spacing | `src/styles/mock-design-system.css` | 12335 | `padding-bottom:88px` | Mock-padding-bottom: 0, 10px, 14px, 16px, 2px, 4px, 60px, 6px, 7px, 8p |
| 44 | spacing | `src/styles/mock-design-system.css` | 12826 | `padding:012px040px` | Mock-padding: 0, 0"], 0"],, 0"]>.card-h, 0"]>.card-h,, 0"]>.card-h.tit |
| 45 | spacing | `src/styles/mock-design-system.css` | 12838 | `padding-right:42px` | Mock-padding-right: 16px, 28px, 8px | Atome: 0, 0011px, 0012px, 010px, |
| 46 | farbe | `src/styles/mock-design-system.css` | 462 | `#7C5CFC` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 47 | farbe | `src/styles/mock-design-system.css` | 462 | `#9B6DFF` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 48 | farbe | `src/styles/mock-design-system.css` | 462 | `#B56BFF` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 49 | farbe | `src/styles/mock-design-system.css` | 468 | `#6F4FF0` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 50 | farbe | `src/styles/mock-design-system.css` | 468 | `#8F5FF5` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 51 | farbe | `src/styles/mock-design-system.css` | 468 | `#A85CF5` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 52 | farbe | `src/styles/mock-design-system.css` | 4250 | `#B42318` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 53 | farbe | `src/styles/mock-design-system.css` | 4264 | `#6B8F71` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 54 | farbe | `src/styles/mock-design-system.css` | 4311 | `#E9EDEC` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 55 | farbe | `src/styles/mock-design-system.css` | 4341 | `#E9EDEC` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 56 | farbe | `src/styles/mock-design-system.css` | 4344 | `#FFF4E5` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 57 | farbe | `src/styles/mock-design-system.css` | 4344 | `#C0622B` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 58 | farbe | `src/styles/mock-design-system.css` | 4345 | `#FDECEC` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 59 | farbe | `src/styles/mock-design-system.css` | 4345 | `#B42318` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 60 | farbe | `src/styles/mock-design-system.css` | 4350 | `#B42318` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 61 | farbe | `src/styles/mock-design-system.css` | 5122 | `#D4A017` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 62 | farbe | `src/styles/mock-design-system.css` | 6793 | `#D4D1CB` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 63 | farbe | `src/styles/mock-design-system.css` | 7732 | `#F3F2EF` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 64 | farbe | `src/styles/mock-design-system.css` | 7819 | `#F3F2EF` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 65 | farbe | `src/styles/mock-design-system.css` | 11204 | `#C4922A` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 66 | farbe | `src/styles/mock-design-system.css` | 11212 | `#0091AE` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 67 | farbe | `src/styles/mock-design-system.css` | 11216 | `#6B7280` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 68 | farbe | `src/styles/mock-design-system.css` | 11315 | `#C4922A` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 69 | farbe | `src/styles/mock-design-system.css` | 11321 | `#0091AE` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 70 | farbe | `src/styles/mock-design-system.css` | 11446 | `#F2F2F7` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 71 | farbe | `src/styles/mock-design-system.css` | 12367 | `#FFF8EB` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 72 | farbe | `src/styles/mock-design-system.css` | 12368 | `#8A6A00` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 73 | farbe | `src/styles/mock-design-system.css` | 12411 | `#C8D0C9` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 74 | farbe | `src/styles/mock-design-system.css` | 12427 | `#D97706` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 75 | farbe | `src/styles/mock-design-system.css` | 12428 | `#FFF8EB` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 76 | farbe | `src/styles/mock-design-system.css` | 12535 | `#F0A020` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 77 | farbe | `src/styles/mock-design-system.css` | 12828 | `#D5DBD6` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 78 | farbe | `src/styles/mock-design-system.css` | 12930 | `#FEF2F2` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 79 | farbe | `src/styles/mock-design-system.css` | 12931 | `#991B1B` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 80 | farbe | `src/styles/mock-design-system.css` | 12935 | `#14532D` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 81 | farbe | `src/styles/mock-design-system.css` | 13185 | `#F4F5F4` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 82 | farbe | `src/styles/mock-design-system.css` | 13199 | `#F4F5F4` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 83 | farbe | `src/app/globals.css` | 21 | `#E5E3DF` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 84 | farbe | `src/app/globals.css` | 22 | `#D6D3CE` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 85 | farbe | `src/app/globals.css` | 23 | `#E5E3DF` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 86 | farbe | `src/app/globals.css` | 105 | `#C4922A` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 87 | farbe | `src/app/globals.css` | 106 | `#FDF3E3` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 88 | farbe | `src/app/globals.css` | 132 | `#FEF0E6` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 89 | farbe | `src/app/globals.css` | 133 | `#C0622B` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 90 | farbe | `src/app/globals.css` | 158 | `#EEF0EE` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 91 | farbe | `src/app/globals.css` | 182 | `#0F1411` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 92 | farbe | `src/app/globals.css` | 183 | `#1A211C` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 93 | farbe | `src/app/globals.css` | 195 | `#D8DCD8` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 94 | farbe | `src/app/globals.css` | 257 | `#E5E3DF` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 95 | farbe | `src/components/anfragen/LeadGptStudioBlock.tsx` | 145 | `#EAF3DE` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 96 | farbe | `src/components/anfragen/LeadGptStudioBlock.tsx` | 271 | `#EAF3DE` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 97 | farbe | `src/components/angebote/VizPrepareQuestions.tsx` | 22 | `#EEF3EC` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 98 | farbe | `src/components/angebote/AngebotVisualisierungClient.tsx` | 818 | `#153222` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 99 | farbe | `src/components/angebote/AngebotWizardVizBlock.tsx` | 133 | `#EEF3EC` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 100 | farbe | `src/components/auftraege/AuftragAbnahmeprotokollCard.tsx` | 177 | `#F0D9A8` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 101 | farbe | `src/components/auftraege/AuftragAbnahmeprotokollCard.tsx` | 178 | `#FFF8EB` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 102 | farbe | `src/components/auftraege/leistungen-v3/AuftragLeistungZuweisungModal.tsx` | 325 | `#B91C1C` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 103 | farbe | `src/components/auftraege/leistungen-v3/AuftragLeistungZuweisungModal.tsx` | 426 | `#B91C1C` | Mock-Palette / CSS-Var (nicht in Mock-Hex-Set) |
| 104 | klasse | `src/styles/mock-design-system.css` | — | `Props weichen ab` | .ldr-sec wie Mock |
| 105 | klasse | `src/styles/mock-design-system.css` | — | `Props weichen ab (Alias .next-step-bar)` | .nsb wie Mock bzw. Alias .next-step-bar |
| 106 | klasse | `—` | — | `fehlt in App-CSS` | .vgid wie Mock |
| 107 | klasse | `src/styles/mock-design-system.css` | — | `Props weichen ab (Alias .list-row)` | .crow wie Mock bzw. Alias .list-row |
| 108 | klasse | `src/styles/mock-design-system.css` | — | `Props weichen ab (Alias .document-canvas)` | .dc-split wie Mock bzw. Alias .document-canvas |
| 109 | struktur | `Mock HTML` | — | `Alle → Angebot → Auftrag → Rechnung` | Alle → Anfrage → Angebot → Auftrag → Rechnung → Wartung & Pflege (Kata |

Rohdaten: `docs/umsetzung/N5-DESIGN-DIFF.json`

## Bewertungsregel

- Tokens zählen nur, wenn **verwendet**. Bloße Definition in `:root` reicht nicht.
- Jeder App-`font-size` außerhalb `{12,13.5,15,19}` (oder `--fs-*`) = Fund.
- „nur Mock“ / PDF-Vorlagen (`14.5`, `23–34px`) und Spec-OK `13.5px` (App = `var(--fs-text)`) = **kein Fund**.
- Mock-`12.5px` (2×) rechtfertigt keine App-Härte.
- N5 Screenshots: entfällt (ersetzt durch diesen Diff).

---

## Nachbesserung (N5'-Korrektur 1–5) — 2026-07-28

| # | Auftrag | Status | Beleg |
|---|---|---|---|
| 1 | `RechnungWizard.tsx` → `var(--fs-*)` | ✅ | Grep: **null** harte `fontSize` / `text-[Npx]` / `font-size: N` in der Datei |
| 2 | Lila `#7C5CFC`…`#A85CF5` entfernen | ✅ | `.btn-assistent` → `var(--green)` (kein Lila-Hex mehr) |
| 3 | `.wv-chip` + `.vgid` anlegen & verdrahten | ✅ | CSS + `WiedervorlageChip` / `DetailHead` |
| 4 | Prop-Deltas `.nsb` / `.crow` / `.dc-split` / `.ldr-sec` | ✅ | `.next-step-bar` = Mock-`.nsb`; `.crow`+`CollapseRow`; `.document-canvas__split` = grid `minmax(0,1fr) 320px` gap 26px; `.ldr-sec` margin 16px |
| 5 | Restliche Farben Entscheidungstabelle | ✅ | unten (52 Vorkommen / 38 Unique ohne Lila) |

### 5 · Farben — Entscheidung pro Hex (Unique, Lila erledigt)

| Hex | Entscheidung | Begründung |
|---|---|---|
| `#7C5CFC` `#9B6DFF` `#B56BFF` `#6F4FF0` `#8F5FF5` `#A85CF5` | **Legacy → ersetzt** | Lila nicht in Brand; `.btn-assistent` jetzt `--green` |
| `#1A3D2B` | **Brand (Variable)** | `--green` |
| `#153222` `#14532D` `#2E7D52` | **Brand → Variable** | Hover/Dark/Variante → `--green` / `--green-dark` |
| `#6B8F71` | **Brand → Variable** | Chart-Muted-Green → Token |
| `#EAF3DE` `#EEF3EC` | **Brand → Variable** | Soft-Green → `--green-50` / `--bg-soft` |
| `#E9EDEC` `#F3F2EF` `#F4F5F4` `#EEF0EE` `#D8DCD8` | **Brand (Variable)** | `--bg-soft` / `--bw-bg-canvas` Fallbacks |
| `#E5E3DF` `#D6D3CE` `#D4D1CB` `#C8D0C9` `#D5DBD6` | **Brand (Variable)** | `--border` / `--border-strong` |
| `#C4922A` `#FDF3E3` `#D4A017` | **Brand (Variable)** | `--bw-accent` / `--bw-accent-bg` / `--bw-warning` |
| `#FFF4E5` `#FFF8EB` `#8A6A00` `#C0622B` `#FEF0E6` `#F0D9A8` `#F0A020` `#D97706` | **Brand (Variable)** | Amber/Yellow Status-Palette |
| `#B42318` `#FDECEC` `#FEF2F2` `#991B1B` `#B91C1C` | **Brand (Variable)** | `--red` / `--red-bg` / `--red-tx` |
| `#0091AE` `#6B7280` | **Bewusst** | Kalender-Kategorie-Farben (nicht Brand-Primär) |
| `#F2F2F7` | **Bewusst** | iOS `--app-grouped` |
| `#0F1411` `#1A211C` | **Bewusst** | Dark-Mode Canvas/Paper |
