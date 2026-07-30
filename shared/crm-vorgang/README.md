# Geteilte `resolveVorgang`-Fixtures

**Single source of truth für Resolver-Parität** zwischen `handwerks-plattform` (Portal) und `baerenwald-crm-dashboard` (CRM).

## Datei

| Datei | Inhalt |
|-------|--------|
| `resolve-vorgang.fixtures.json` | 6 kanonische Fälle: `input` (DB-Feldwerte) → `expect` (phase, unterstatus, needsAction, actor, optionale Badges) |

**CRM-Build:** Next.js importiert die byte-gleiche Kopie unter `src/lib/vorgang/resolve-vorgang.fixtures.json` (Typecheck/Netlify). Nach Sync **beide** Dateien aktualisieren.

## Sync-Regel

1. **Regeländerung** an `resolveVorgang()` → JSON **in beiden Repos** identisch aktualisieren.
2. **CI/Test** in beiden Repos lädt dieselbe Datei → Drift schlägt sofort an.
3. **Kein Shared-Package** — nur diese JSON-Datei kopieren (byte-identisch).
4. CRM: `src/lib/vorgang/fixtures.ts` lädt die Build-Kopie; Test: `npm run test:crm-vorgang`.

### CRM-Repo (beim Checkout-Audit, Schritt 2)

```bash
# Von Portal nach CRM (Pfad anpassen) — beide Pfade byte-identisch halten
cp ../handwerks-plattform/shared/crm-vorgang/resolve-vorgang.fixtures.json \
   shared/crm-vorgang/resolve-vorgang.fixtures.json
cp shared/crm-vorgang/resolve-vorgang.fixtures.json \
   src/lib/vorgang/resolve-vorgang.fixtures.json
```

Empfohlener Sync-Pfad: `shared/crm-vorgang/resolve-vorgang.fixtures.json` (+ CRM-Build-Kopie unter `src/lib/vorgang/`).

### Portal-Repo

```bash
npm run test:crm-vorgang
```

## Version

Feld `version` in der JSON bumpen, wenn sich das Schema oder die Erwartungen ändern.
