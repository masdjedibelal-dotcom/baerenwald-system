# Nr. 3 — WizardShell-Optik (Angebot + Rechnung)

Optik-Angleichung an Mock (`/tmp/mock_design.css` → `.wizard*`, `.stepper`, `.card`, `.prop`, `.btn`). Keine Speicher-/Logik-Änderungen, kein PosBoard.

## Umgesetzt

- Shell: Vollbild wie Mock `.wizard` / `.wizard-inner-shell` (z-index 200, Header 56px, Body-Padding, Inhaltsbreite `max-width: 960px`)
- Stepper: Typo + active/done/pending, Check-Icon 11px, Grün-Tokens
- Cards: Mock-Padding Header `15×18` / Body `16×18`
- Props: `.props` / `.prop` (110px | 1fr) in Wizard-Kontext (Anfrage-Daten, Summe)
- Nav-Buttons Desktop: Höhe 32px, Radius 9px; Close bleibt `.btn-sm` (26px)
- Positionen: Padding/Typo + offener Accordion (grüner Nr-Badge, Mock-Schatten)

## Screenshots

| Datei | Inhalt |
|-------|--------|
| `crm-angebot-wizard.png` | Angebot-Wizard Desktop (auto-login) |
| `crm-rechnung-wizard.png` | *nicht erfasst* — Auftrag-Navigation timeout im Headless-Lauf |

## Bewusste Abweichungen (nicht geschlossen)

1. **Kein inset Radius/Schatten auf der Wizard-Shell** — Mock-Fullscreen setzt keins; `--r` / `--shadow` gelten für Cards, nicht für `.wizard-inner-shell`. (Mobile-Override setzt `border-radius: 0` explizit.)
2. **CRM hat Extra-Aktionen „Speichern“ / „Ohne E-Mail…“** im Top-Nav — Mock nur Zurück + Weiter/Versenden. Bewusst behalten (Logik).
3. **Rechnung-Wizard: 3 Schritte** vs ältere Mock-Variante mit 2 — Stepper-Labels folgen CRM-Flow, Optik Mock.
4. **Mobile Toolbar** bleibt CRM-spezifisch (Mock: Step-Labels ausblenden); kein Layout-Umbau.
5. **Positions-Editor** bleibt Accordion/`pos-*` — keine PosBoard-Ersetzung (Scope Nr. 3).
