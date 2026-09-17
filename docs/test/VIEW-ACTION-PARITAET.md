# View–Action-Parität (CRM)

**Status:** eingeführt 2026-08-26 · fester Teil von **Runde 3** und jedem Regressions-Smoke  
**Fehlerklasse:** Detail-/Listen-Seite lädt über `withCrmReadFallback` / Service-Role → sichtbar. Mutierende Server-Action lädt/schreibt über User-Client + RLS → „nicht gefunden“ / still no-op (Prod: Abschlag RE2026-2111 Michael König, „Als bezahlt“).

## Regel

Alles, was die Detailseite anzeigt, muss per Aktion bedienbar sein — unabhängig von `erstellt_von` / älterer Ownership-Struktur.

CRM-Mutatoren nutzen **`requireStaffAndServiceRole()`** (`src/lib/auth/require-staff-service-role.ts`):

1. Session prüfen  
2. **nur CRM-Staff** (`authUserIsCrmTeam` / `user_profiles`)  
3. dann **Service-Role-Client** zurückgeben  

Portal-/Partner-/Token-Actions bleiben auf **User-Client + RLS** — niemals diesen Helper.

## Sweep-Matrix (Priorität)

| Aktion | Datei | liest/schreibt über | Detailseite liest über | Parität |
|---|---|---|---|---|
| `updateRechnungStatus` (bezahlt / storno / …) | `rechnungen/actions.ts` | Staff+ServiceRole | `withCrmReadFallback` | **ja** |
| `sendRechnung` | `rechnungen/actions.ts` | Staff+ServiceRole | `withCrmReadFallback` | **ja** |
| `sendZahlungsbestaetigung` | `rechnungen/actions.ts` | Staff+ServiceRole | `withCrmReadFallback` | **ja** |
| `sendZahlungserinnerungMail` (Mahnung) | `rechnungen/actions.ts` | Staff+ServiceRole | `withCrmReadFallback` | **ja** |
| `storniereRechnungOhneErsatz` | `rechnungen/actions.ts` | Staff+ServiceRole → Status | `withCrmReadFallback` | **ja** |
| `nehmeRechnungStornoZurueck` | `rechnungen/actions.ts` | Staff+ServiceRole | `withCrmReadFallback` | **ja** |
| `korrigiereRechnung` / `createGutschriftFromRechnung` | `rechnungen/actions.ts` | Staff+ServiceRole | `withCrmReadFallback` | **ja** |
| `updateRechnungZahlungsziel` | `rechnungen/actions.ts` | Staff+ServiceRole | `withCrmReadFallback` | **ja** |
| `updateRechnungEntwurf` | `rechnungen/actions.ts` | Staff+ServiceRole | `withCrmReadFallback` | **ja** |
| `deleteRechnungEntwurf` / `deleteRechnung` | `rechnungen/wizard-actions.ts` | Staff+ServiceRole | `withCrmReadFallback` | **ja** |
| `setAngebotStatus` / `markKundeAbgelehnt` / `acceptHandwerker` | `angebote/actions.ts` | Staff+ServiceRole (außer `asSystem`) | `withCrmReadFallback` | **ja** |
| `recordKundeAbgelehntMitDetails` | `angebote/actions.ts` | Staff+ServiceRole | `withCrmReadFallback` | **ja** |
| `deleteAngebot` | `angebote/actions.ts` | Staff+ServiceRole | `withCrmReadFallback` | **ja** |
| `sendAngebotToKunde` | `angebote/actions.ts` | Staff+ServiceRole (außer `asSystem`) | Admin-Detail | **ja** |
| `ablehneHandwerkerEinreichung` | `angebote/actions.ts` | Staff+ServiceRole | `withCrmReadFallback` | **ja** |
| `replaceAngebotHandwerkerUndSenden` | `angebote/actions.ts` | Staff+ServiceRole | `withCrmReadFallback` | **ja** |
| `acceptAngebotAndCreateAuftrag` | `angebote/angebot-flow-actions.ts` | Staff-Gate + Admin | `withCrmReadFallback` | **ja** |
| `updateAuftragStatusFromUi` / `setAuftragStatus` | `auftraege/actions.ts` | Staff+ServiceRole | `loadAuftragDetail` (Admin) | **ja** |
| `completeAuftragNachEndabrechnung` | `auftraege/actions.ts` | Staff+ServiceRole | Admin-Detail | **ja** |
| HW zuweisen / senden / ersetzen (CRM) | `auftraege/handwerker-actions.ts` | Staff+ServiceRole | Admin-Detail | **ja** |
| `updateLeadStatus` / `saveLeadAlsVerloren` | `anfragen/actions.ts` | Staff+ServiceRole | `loadAnfrageDetail` (Fallback) | **ja** |
| `setLeadAlsAkut` | `anfragen/actions.ts` | Staff+ServiceRole | Fallback | **ja** |
| `softDeleteAnfrage` / `deleteAnfrage` / `restoreAnfrage` | `anfragen/actions.ts` | Staff+ServiceRole | Fallback | **ja** |
| `deleteVorgang` / Bulk | `vorgaenge/actions.ts` | Staff-Gate + soft-delete Admin | Listen-Fallback | **ja** |
| Org-Freigabe CRM (`disponiere…`, `schlage…`, sync/erneut) | `lib/org/hv-lead-actions.ts` | Staff+ServiceRole | Anfrage-Fallback | **ja** |
| `genehmigeOrgNachtrag` | `lib/org/nachtrag-org-freigabe-actions.ts` | Staff+ServiceRole | Auftrag-Admin | **ja** |

## Website-Repo (`baerenwald`)

Kein CRM-`withCrmReadFallback`-Muster. Token-/Portal-Seiten und Cron nutzen teils `supabaseAdmin` mit **eigenem** Token-/Secret-Gate — **nicht** auf `requireStaffAndServiceRole` umgestellt (falsches Sicherheitsmodell).

## Explizit **nicht** umgestellt (User-Client + RLS bzw. eigenes Gate)

Geprüft; bewusst ohne Staff+ServiceRole-Helper:

| Bereich | Beispiele | Grund |
|---|---|---|
| Partner-Portal | `baerenwald` Partner-Actions, Annahmen, Bautagebuch, Rechnungs-Upload | RLS = Tenancy; Service-Role würde Partner-Grenzen umgehen |
| HV-/Org-Portal | Freigabe/Ablehnen im Portal, Objekt-CRUD | Session + Portal-Rolle + RLS |
| Token-Flows | `/melden/status/[token]`, Terminslots, Feedback | Token-Auth, kein CRM-Staff |
| Cron / Internal API | `api/cron/*`, `crmNotify` mit Shared Secret | Secret-Gate, kein User-Staff |
| System-Pfade mit `asSystem` | z. B. `setAngebotStatus({ asSystem })`, `sendAngebotToKunde({ asSystem })` | Caller ist bereits Server/System; kein Browser-CRM-User |
| Listen-Helfer ohne Mutation | HW-Listen-Reads in `handwerker-actions` (createClient) | nur Lesen für UI-Picker |

## Seed + Smoke (Runde 3)

Skript: `scripts/seed-view-action-parity.mjs`

1. Staging-Ref prüfen (`soqownnkxmtfgvsbrgsl`); bei Prod abbrechen.  
2. Datensätze mit **fremder Eigentümerschaft**: `erstellt_von` = anderer Auth-User (oder `null`), ältere Struktur.  
3. Pro Entität (Lead → Angebot → Auftrag → Rechnung gesendet):  
   - Detailseite öffnet / lädt  
   - Aktionen je Status: Status setzen, bezahlt, storno, bearbeiten, löschen (Entwurf), senden, Mahnung  

### Manuelle Staging-Verify (vor Prod-Hotfix)

1. Optional: Prod-Historie anonym auf Staging: `npm run staging:import-prodsim` (siehe `docs/STAGING.md` → Prod-Snapshot). Anomalien-Report = erstes Testergebnis.  
2. Staging-CRM deployen (Parity-Diff).  
3. Seed (`scripts/seed-view-action-parity.mjs`) **oder** `PRODSIM-`-Rechnung mit fremder `erstellt_von`: Detail sichtbar → **Als bezahlt** → Status `bezahlt`, kein „nicht gefunden“.  
4. Prod-Hotfix-Paket: zusätzlich **RE2026-2111** „Als bezahlt“ verifizieren.

## Pflege

Neue CRM-Mutator-Action: immer `requireStaffAndServiceRole()` am Anfang; Detail-Load mit Fallback/Admin → Action **muss** denselben Client-Pfad haben. Matrix oben ergänzen.
