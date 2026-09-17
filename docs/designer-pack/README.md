# Designer-Pack — CRM + Portale festzurren

Anhänge für Claude Designer (oder vergleichbar). **Kein Login nötig** für diesen Pack.

## Inhalt

| Ordner | Inhalt |
|--------|--------|
| `mocks/` | Neueste Standalone-HTML: CRM + Portale (offline klickbar) |
| `screenshots-ist/` | Kuratierte Ist-PNGs aus Downloads + Test-Suite |

Prompt: `../DESIGNER-PROMPT-CRM-PORTALE-FESTZURREN.md`

## So anhängen

1. Prompt-Block kopieren.
2. Beide HTML aus `mocks/` + PNGs aus `screenshots-ist/` in Claude Designer droppen.
3. Auftrag: Mock anpassen / Inkonsistenzen jagen — nicht neu erfinden.

## Was hier absichtlich fehlt

- Live-Staging hinter Login (Seed-Accounts: `docs/STAGING.md`). Kein Auth-Bypass.
- Cursor kann Dateien nicht selbst in Claude Designer hochladen.

## Herkunft

- CRM-Mock: `~/Downloads/Baerenwald CRM (standalone) (9).html` (Jul 28)
- Portal-Mock: `~/Downloads/Baerenwald Portale (5).html` (Jul 16)
- Screenshots: Downloads (CRM/Partner) + `docs/test/screenshots/etappe-*`
