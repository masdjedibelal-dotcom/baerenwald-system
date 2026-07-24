# Auftraggeber-Portal — Backend/CRM Handoff

Stand: Juni 2026. Frontend: `handwerks-plattform`. CRM: `baerenwald-crm-dashboard`.

## Bereits im CRM umgesetzt

| Bereich | Status |
|---------|--------|
| Migration Org-Felder | `20260708120000_organisation_portal_stamm.sql` |
| Tab **Organisation** | `KundenOrganisationTab` (Gewerbe + Hausverwaltung) |
| Objekte + `melde_slug` | `KundenObjekteCard`, `KundenObjektModal`, Melde-Link |
| Lead-Detail Org-Blöcke | `LeadOrgKontextBlock` (Auftraggeber, Melder, Objekt, Freigabe-Log) |
| Anfragen-Filter | Anlass, Org-Kanal, Wartet Freigabe / Wartet Melder |
| Partner-Gate | `send-handwerker-anfrage.ts` blockiert bis Org-Freigabe |
| HV-Defaults bei Anlage | `saveKunde` → `portal_modus=organisation` für HV/Gewerbe |

## Noch offen / Lücken

- **Kleinreparatur** (`kleinreparatur_aktiv`, Schwellwert) — noch keine CRM-Spalten/UI (nur Portal-Seite?)
- **hv_meldung_status** — Lead-Workflow-Anzeige im CRM prüfen/ergänzen
- **org_kennung Pflicht** beim Speichern Organisation (Validierung vorhanden, UX-Hinweis)
- **Phase 5** Org-E-Mails teilweise (`org-mail-notify.ts`), Templates vervollständigen
- **Phase 6** Reporting/KPIs (Dashboard hat „Wartet auf Org-Freigabe“)

## Bärenwald München — Stammdaten (manuell)

1. Kunde öffnen → Tab **Organisation** → `org_kennung` z. B. `baerenwald-muenchen`, Anzeigename setzen
2. Tab **Objekte** (Stammdaten) → Objekt mit `melde_slug` z. B. `haus-muenchen`
3. Doppel-Stamm `info@baerenwald-muenchen.de` bereinigen
4. Test: `https://baerenwaldmuenchen.de/melden/baerenwald-muenchen/haus-muenchen`

Vollständige Portal-Spec: `handwerks-plattform/docs/ORGANISATION_PORTAL_BACKEND.md`
