# P7-9 — remove-deploy-blockers

**Stand:** 2026-09-19 — **erledigt**

## Erledigt

1. Allowlist-Pfade aus dem ehemaligen `scripts/remove-deploy-blockers.mjs` existieren nicht mehr (Root-Duplikate / abgelöste Vorab-/Vor-Baubeginn-Pfade).
2. `knip` als DevDependency + `knip.json` (CRM + Portal); npm-Scripts `knip` / `guard:knip`.
3. Klare Dead-Files (knip unused files + Zero-Importer-Prüfung) gelöscht; Cap ~50, konservativ (keine Pages/Routes/Migrations/Sentry/dynamische Imports).
4. `scripts/remove-deploy-blockers.mjs` gelöscht und aus `npm run build` entfernt.
5. Audit-Check P7-9: `!fileExists('scripts/remove-deploy-blockers.mjs')` → damit ✅.

## Frühere Allowlist (Referenz, nicht wieder anlegen)

- `vercel.json`, `StatusActions.tsx`, Root-`ui` / `rechnungen` / `projekt` / `preislisten`
- `src/app/(dashboard)/anfragen/[id]/vorab`
- `src/app/(dashboard)/auftraege/[id]/vor-baubeginn`
- `src/app/api/auftraege/[id]/protokoll`
- `src/lib/vorab-angebot-from-vorab.ts`, `src/lib/vorab-vorort-initial.ts`
