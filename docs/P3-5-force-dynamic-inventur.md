# P3-5 — force-dynamic Inventur + Stammdaten-Cache

**Stand:** 2026-09-19 · Repo: `baerenwald-system`

## force-dynamic Inventur (`export const dynamic = 'force-dynamic'`)

| Ort | Behalten? | Begründung |
|-----|-----------|------------|
| `(dashboard)/page.tsx` | ja | Dashboard-KPIs / Session |
| `(dashboard)/vorgaenge/page.tsx` | ja | Live-Liste + Pagination |
| `(dashboard)/ki-analytics/page.tsx` | ja | Analytics live |
| `(auth)/layout.tsx` | ja | Auth-Session |
| Token-Pages (`projekt`, `nachtrag`, `status`) | ja | Token-gebunden |
| `app/api/**` (Cron, Copilot, KI, Demo, …) | ja | Request-gebunden / Secrets |
| Kunden / Handwerker / Partner / Preislisten / Einstellungen Pages | — | **kein** `force-dynamic` (ok) |

Kein flächiges Entfernen nötig. Ziel war Inventur, nicht Zero.

## unstable_cache — Stammdaten / Preislisten / Einstellungen

| Loader | Datei | Tag(s) | TTL |
|--------|-------|--------|-----|
| `loadCachedActiveGewerke` | `src/lib/stammdaten-cache.ts` | `stammdaten-gewerke` | 120 s |
| `loadCachedActivePreislisten` | `src/lib/stammdaten-cache.ts` | `stammdaten-preislisten` | 120 s |
| `loadCachedFirmenEinstellungen` | `src/lib/stammdaten-cache.ts` | `stammdaten-firma` | 120 s |
| `loadWizardContext` | `src/lib/wizard-context.ts` | (nutzt Stammdaten-Cache) | 120 s |

Consumers (u. a.): Anfrage-/Angebot-Detail, Angebot neu, Auftrag-Detail, Rechnung neu, Auftrag Rechnungen-Auswahl, Mail-Branding (`getMailBranding`).

Invalidierung bei Schreib-Actions:

- `preislisten/actions.ts` → `revalidateWizardContext()` (= Tag + Stammdaten)
- `einstellungen/gewerke/actions.ts` → `revalidateWizardContext()`
- `einstellungen/actions.ts` (Firma) → `revalidateWizardContext()`

Admin-UI `/einstellungen/preise` lädt weiterhin frisch (eigene Selects inkl. inaktiver Gewerke) — Cache gilt für Wizard-/Dokument-/Mail-Kontext.
