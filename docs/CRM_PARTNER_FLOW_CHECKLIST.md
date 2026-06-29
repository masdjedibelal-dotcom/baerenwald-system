# CRM Partner-Flow — Checkliste (Stand Juni 2026)

> **Partner-Journey (End-to-End):** HW-Angebot einreichen → CRM bestätigt (`uebernommen`) → Projektvertrag automatisch erzeugt → HW bestätigt im Portal → Auftrag freigeschaltet → Compliance-Dokumente → Bautagebuch. Siehe [HANDWERKER_KOORDINATION_PROZESS.md](./handwerker-koordination/HANDWERKER_KOORDINATION_PROZESS.md).

Abgleich mit Portal-Migration `handwerks-plattform/supabase/migrations/20260611120000_portal_partner_vertrag_compliance.sql`.

## Prio 1 — Datenbank

- [ ] `npm run db:portal-alignment` (oder SQL `20260618120000_portal_partner_alignment.sql` im Supabase SQL Editor)
- [ ] Spalten prüfen: `partner_dokumente.status`, `freigegeben_am`, `ablehnung_grund`
- [ ] `compliance_dokument_typen.scope`: CRM nutzt `stamm` (= Portal „Stamm-Unterlagen“, früher `standard`)
- [ ] `auftrag_handwerker.projektvertrag_bestaetigt_am` vorhanden
- [ ] `handwerker_vertraege` mit `typ`, `status`, `pdf_url`, Anzeigefelder
- [ ] `handwerker.auth_user_id` für Partner-Login gesetzt

## Prio 1 — Compliance-Typen (`compliance_dokument_typen`)

Ohne aktive Einträge bleibt die Portal-Checkliste leer.

| scope | Beispiel-slug | Hinweis |
|-------|---------------|---------|
| `stamm` | `gewerbeanmeldung`, `betriebshaftpflicht`, `haftpflicht` (Alias) | `auftrag_id = null` |
| `bauprojekt` | `rahmenvertrag`, `sicherheitsunterweisung`, `uvv` (Alias) | pro Auftrag |

- [ ] `aktiv = true`, `sort_order` gesetzt
- [ ] `slug` = exakt der Wert, den das Portal beim Upload sendet (`partner_dokumente.typ`)

## Prio 2 — Prozess CRM

| Schritt | CRM-Aktion | DB |
|---------|------------|-----|
| HW reicht Angebot ein | — (Portal) | `hw_status = eingereicht`, `hw_eingereicht_at` |
| CRM + Kunde bestätigen | „Einreichung bestätigen“ | `hw_status = uebernommen` |
| Nach Übernahme | **automatisch** (seit 20260618) — silent sync ✅ | `handwerker_vertraege` `typ=projekt`, `status=pdf_erzeugt` |
| HW bestätigt im Portal | API POST oder Portal-DB | `projektvertrag_bestaetigt_am` |
| Auftrag sichtbar | — | Portal Tab „Aufträge“ |

Manuell alternativ: Vertrags-Wizard unter `/vertraege`.

## Prio 3 — Partner-Dokumente freigeben

- [ ] HW lädt hoch → `partner_dokumente.status = in_pruefung` (Portal)
- [ ] CRM: Auftrag → Dokumente → Projekt-Checkliste → **Freigeben** / **Ablehnen**
- [ ] Freigabe → `status = freigegeben`, `freigegeben_am = now()`
- [ ] Ablehnung → `status = abgelehnt`, `ablehnung_grund` → Portal zeigt „Abgelehnt“

## Prio 4 — Portal-API

`NEXT_PUBLIC_DASHBOARD_URL` im Portal setzen.

| Endpoint | Status |
|----------|--------|
| `GET /api/portal/auftraege/{id}/projektvertrag` | implementiert |
| `POST /api/portal/auftraege/{id}/projektvertrag` | implementiert |

Auth: Partner-JWT, `handwerker.auth_user_id = auth.uid()`.

## Prio 5 — Mails

- [x] „Vertrag bereit“ nach automatischer Vertragserzeugung (`sendProjektvertragBereitMail`)
- [ ] „Auftrag freigeschaltet“ nach `projektvertrag_bestaetigt_am` (optional)

## Test-Durchlauf

1. HW mit `auth_user_id` anlegen / einloggen
2. Anfrage → Angebot (Preis + PDF) → CRM bestätigt → `uebernommen`
3. Auftrag anlegen → Projektvertrag-PDF automatisch
4. Portal Tab Angebote: Vertrag + Checkliste
5. HW lädt Pflicht-Dokument → CRM freigibt → „Erledigt“
6. HW bestätigt verbindlich → `projektvertrag_bestaetigt_am`
7. Portal Tab Aufträge: Auftrag + Dokumente
8. Bautagebuch weiterhin OK

---

## Vorgänge-Flow (Leistungen am laufenden Auftrag)

Siehe **[PORTAL_VORGAENGE_HANDOFF.md](./PORTAL_VORGAENGE_HANDOFF.md)** für Portal-Details.

### Migration

- [ ] `20260729120000_auftrag_positionen_vorgaenge_meta.sql` (CRM + Portal-Migration auf gleicher DB)

### CRM-Prozess

| Schritt | Portal-Mail? | DB-Felder |
|---------|--------------|-----------|
| Zuweisen (Popup) | Nein | `handwerker_status=zugewiesen`, `aenderung_typ=neu` |
| Senden (Leiste) | Ja (`typ: neu/geaendert/entfernt`) | `handwerker_status=angefragt` |
| Löschen mit HW | Ja (`typ: entfernt`) | Zeile bleibt, `aenderung_typ=entfernt` |
| Partner bestätigt | — | **nur Portal** setzt `handwerker_bestaetigt_at`; bei `entfernt` löscht Portal die Zeile |

### Env

- [ ] `PARTNER_INTERNAL_API_SECRET` CRM = Portal
- [ ] `NEXT_PUBLIC_SITE_URL` im CRM (Website/Portal-Host)

### CRM-Code (Referenz)

- Notify: `src/lib/partner/notify-partner-unified.ts`
- v3 Actions: `src/app/(dashboard)/auftraege/leistungen-steuerung-v3-actions.ts`
- Meta: `src/lib/auftraege/partner-vorgang-meta.ts`
- UI-Badges: `src/lib/auftraege/partner-vorgang-display.ts`

### Test Vorgänge

1. Zuweisen ohne Mail → Portal still
2. Senden → Glocke + Tab Vorgänge
3. Portal Annehmen → CRM ohne offenen Badge
4. CRM ändert Preis → erneut senden → Portal „Geändert“
5. CRM entfernt Leistung → Portal „Entfernt“ → Annahme → Zeile weg in CRM

## Bekannte Abweichungen / Klärung mit Frontend

- **Scope**: CRM/DB `stamm`, nicht `standard` (nach Alignment-Migration)
- **Slugs**: Zusätzliche Aliase `haftpflicht`, `uvv` für Portal-Kompatibilität
- **Tab-Angebote vs. Aufträge**: Portal zeigt Vertragspaket ggf. schon unter Angebote; CRM erzeugt Vertrag bei Übernahme/Auftragsanlage — Flow mit Frontend abstimmen
