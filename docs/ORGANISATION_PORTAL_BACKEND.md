# Auftraggeber-Portal — Backend/CRM Handoff

> **Kopie für CRM-Projekt.** Original: `handwerks-plattform/docs/ORGANISATION_PORTAL_BACKEND.md`

Siehe die vollständige Checkliste im Frontend-Repo:

**Pfad:** `~/Desktop/Bärenwald/handwerks-plattform/docs/ORGANISATION_PORTAL_BACKEND.md`

## Kurzüberblick

- SQL-Migrationen sind auf Supabase angewendet
- Frontend (`handwerks-plattform`) ist fertig
- CRM (`baerenwald-crm-dashboard`) braucht noch: Org-Tab, Objekt-Melde-Links, Lead-Detail-Blöcke, Filter, Freigabe-Workflow, E-Mails

## Nächster Schritt im CRM

1. `src/lib/types.ts` — Org-Felder ergänzen
2. Kunden-Detail Tab **Organisation**
3. `KundenObjekteCard` — `melde_slug`, Link, QR
4. `AnfrageDetailClient` — Blöcke Auftraggeber | Melder | Objekt | Fotos
5. Filter in Anfragen-Liste (`anlass`, Wartet Freigabe, Wartet Melder)

Vollständige Phasen, SQL-Felder, Test-Checkliste → siehe Original-Dokument.
