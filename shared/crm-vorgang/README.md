# Geteilte `resolveVorgang`-Fixtures

**Single source of truth für Resolver-Parität** zwischen `handwerks-plattform` (Portal) und `baerenwald-crm-dashboard` (CRM).

## Datei

| Datei | Inhalt |
|-------|--------|
| `resolve-vorgang.fixtures.json` | 6 kanonische Fälle: `input` (DB-Feldwerte) → `expect` (phase, unterstatus, needsAction, actor, optionale Badges) |

## Sync-Regel

1. **Regeländerung** an `resolveVorgang()` → JSON **in beiden Repos** identisch aktualisieren.
2. **CI/Test** in beiden Repos lädt dieselbe Datei → Drift schlägt sofort an.
3. **Kein Shared-Package** — nur diese JSON-Datei kopieren (byte-identisch).

### CRM-Repo (beim Checkout-Audit, Schritt 2)

```bash
# Von Portal nach CRM (Pfad anpassen)
cp ../handwerks-plattform/shared/crm-vorgang/resolve-vorgang.fixtures.json \
   shared/crm-vorgang/resolve-vorgang.fixtures.json
```

Empfohlener Zielpfad im CRM: `shared/crm-vorgang/resolve-vorgang.fixtures.json` (gleiche Struktur).

### Portal-Repo

```bash
npm run test:crm-vorgang
```

## Version

Feld `version` in der JSON bumpen, wenn sich das Schema oder die Erwartungen ändern.
