# N6 — Manueller Durchklick (Katalog §3)

**Stand:** 2026-07-28T20:35:00Z  
**App:** `http://127.0.0.1:3001` (CRM_DEV_SKIP_AUTH + `/api/dev/auto-login`)  
**Methode:** Playwright Chromium — echte UI-Klicks, Desktop (1440×900) + Mobil (390×844); Nachprüfung im Cursor-Browser.  
**N5:** übersprungen (User-Vorgabe).

## Ergebnis

| Ansicht | Flow | Status | Beleg / Hinweis |
|---|---|---|---|
| desktop | Anfrage→Angebot→versenden→annehmen→Auftrag | funktioniert | Neu→Anfrage; 5 Tabs ✓; CTA „Angebot erstellen“; „Annehmen“ erreichbar. Label „Versenden“ am Angebot nicht immer sichtbar (weicht in Copy ab). |
| desktop | Auftrag: HW anfragen→Doku→Abnahme→abschließen | weicht ab | 5 Tabs ✓; „Tagebuch“/Doku erreichbar; Abnahme-Canvas `/abnahme/erstellen` ✓. CTA „Handwerker anfragen“ und „Abschließen“ am Sample-Auftrag nicht gefunden. |
| desktop | Rechnung Einzel+Zahlplan→versenden→bezahlt | funktioniert | Zahlung: „Rechnung erstellen“, „Abschläge“; RE: „Senden“, „Bezahlt“. |
| desktop | Korrekturen: Überarbeiten·Nachtrag·Rechnung korrigieren·Gutschrift | funktioniert | Angebot „Bearbeiten“; Nachtrag am Auftrag; RE ⋯ → „Gutschrift (Teil/Kulanz)“. |
| desktop | Sonderfälle: Notfall·Duplikat·Mahnung·Reklamation·WV | weicht ab | **WV** „WV setzen“ ✓. **Mahnung** auf überfälliger RE als Primary „Mahnung senden“ → Drawer „Mahnung“ ✓. **Notfall** nicht im FAB „Neu erstellen“ (nur Anfrage/Angebot/Rechnung/Kunde/Handwerker). **Duplikat** / **Reklamation** am Sample nicht sichtbar. |
| mobil | Anfrage→Angebot→versenden→annehmen→Auftrag | funktioniert | wie Desktop: Tabs + Angebot erstellen + Annehmen. |
| mobil | Auftrag: HW anfragen→Doku→Abnahme→abschließen | weicht ab | Abnahme ✓; Doku-/HW-CTA am Sample schwächer als Desktop. |
| mobil | Rechnung Einzel+Zahlplan→versenden→bezahlt | funktioniert | Rechnung erstellen + Abschläge + Bezahlt. |
| mobil | Korrekturen: Überarbeiten·Nachtrag·… | funktioniert | Nachtrag sichtbar; Angebots-Einstieg „Neu erstellen“/Bearbeiten. |
| mobil | Sonderfälle | weicht ab | WV ✓; Notfall/Duplikat/Reklamation wie Desktop lückenhaft. |

## Zusätzliche Browser-Belege (Nachklick)

| Schritt | Beobachtung |
|---|---|
| Vorgänge-Liste | Filter-Chips Anfrage/Angebot/Auftrag/Rechnung; Zeilen klickbar |
| FAB Neu erstellen | Anfrage · Angebot · Rechnung · Kunde · Handwerker — **kein Notfall** |
| RE `1c50b1f2…` (offen) | Primary **Mahnung senden** öffnet Sheet/Drawer „Mahnung“ (Jetzt senden) |
| RE `ee15df11…` (bezahlt) | ⋯ → Kopieren · Gutschrift · Zahlungsbestätigung (keine Mahnung — statusabhängig korrekt) |
| Anfrage `e7e38d29…` | Primary „Angebot erstellen“; ⋯ ohne Notfall/Duplikat |

## Legende
- **funktioniert** — Kernschritte in der UI erreichbar und klickbar
- **weicht ab** — Flow teilweise nutzbar, Lücken oder alternativer Pfad
- **bricht ab** — kritischer Einstieg fehlt oder Fehler

## Evidence
24 Screenshots: `docs/umsetzung/n6-evidence/`  
Skript: `scripts/n6-durchklick.mjs`

## Destruktivität
Keine echten Kundenmails / Status-Writes durchgebucht — Prüfung bis CTA / Sheet / Canvas.

## Offene Lücken (für Design/Dev)
1. Notfall-Direktauftrag nicht im FAB — nur Code-Pfad (`NotfallDirektBeauftragenModal` / Lead-Kontext)
2. Handwerker-Anfrage-CTA am Auftrag-Sample nicht auffindbar
3. Duplikat-Band / Reklamation am Sample nicht sichtbar (daten- oder UI-abhängig)
4. Angebots-„Versenden“-Label inkonsistent
