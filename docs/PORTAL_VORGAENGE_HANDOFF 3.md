# Portal — Vorgänge-Flow (Handoff vom CRM)

Stand: Juni 2026. CRM-Seite: Leistungen v3 + `notify-partner-unified`. Portal-Repo: `handwerks-plattform`.

## Migration (beide Projekte, gleiche DB)

| Repo | Datei |
|------|--------|
| CRM | `supabase/migrations/20260729120000_auftrag_positionen_vorgaenge_meta.sql` |
| Portal | `supabase/migrations/20260729120000_partner_vorgang_position_aenderung.sql` |

Neue Spalten auf `auftrag_positionen`:

- `aenderung_typ` — `null` \| `neu` \| `geaendert` \| `entfernt`
- `preis_alt` — numerisch, nur bei `geaendert`

Nach Deploy im Supabase SQL Editor oder via CLI anwenden.

## Umgebungsvariablen

| Variable | Wo | Zweck |
|----------|-----|--------|
| `PARTNER_INTERNAL_API_SECRET` | CRM + Portal | Bearer für `/api/internal/partner-notify` |
| `NEXT_PUBLIC_SITE_URL` | CRM | Basis-URL der Website (Portal-Host) |
| `NEXT_PUBLIC_DASHBOARD_URL` | Portal | CRM-URL für Rücklinks (optional) |

Secret muss in beiden Apps **identisch** sein.

## CRM → Portal Benachrichtigung

Endpoint: `POST {NEXT_PUBLIC_SITE_URL}/api/internal/partner-notify`

```json
{
  "handwerkerId": "uuid",
  "typ": "neu",
  "projektName": "Projekt Müller",
  "leistungName": "Fliesenarbeiten",
  "link": "/partner?section=vorgaenge&id=<auftragId>",
  "auftragId": "<auftragId>",
  "aenderungTyp": "geaendert",
  "preisAlt": 1200
}
```

| `typ` | Wann (CRM) |
|-------|------------|
| `neu` | Leistungen über „An Handwerker senden“ (erstmalig) |
| `geaendert` | Bearbeitung nach Partner-Annahme (Preis/Leistung) |
| `entfernt` | Leistung soft-entfernt (Zeile bleibt bis Portal bestätigt) |

**Kein Notify** beim reinen Zuweisen im Popup (`handwerker_status=zugewiesen`, `aenderung_typ=neu`).

Deep-Link immer Tab **Vorgänge**: `/partner?section=vorgaenge&id=<auftragId>`.

## Portal — State & UI

| Datei | Rolle |
|-------|--------|
| `src/lib/partner/vorgang-state.ts` | `ableitenVorgangState`, `positionBrauchtVorgangAktion` |
| `src/lib/partner/get-partner-data.ts` | lädt `aenderung_typ`, `preis_alt` |
| `src/app/actions/partner-auftrag-bestaetigen.ts` | Annahme/Ablehnung |

Offene Aktion erkennen:

1. `aenderung_typ` ∈ {`neu`,`geaendert`,`entfernt`} **oder**
2. `handwerker_status` ∈ {`angefragt`,`zugewiesen`,…} (Legacy)

## Portal — Annahme (DB-Wirkung)

Bei verbindlicher Annahme (`confirmPartnerAuftrag` / `persistAcceptance`):

| `aenderung_typ` | Aktion auf `auftrag_positionen` |
|-----------------|----------------------------------|
| `neu` / `geaendert` | `handwerker_status=akzeptiert`, Meta cleared |
| `entfernt` | **Zeile löschen** (Hard-Delete) |
| — | `aenderung_typ=null`, `preis_alt=null` |

Zusätzlich (nur Portal):

- `auftraege.handwerker_bestaetigt_at = now()` beim ersten Gesamt-Abschluss
- `angebot_handwerker` → `status=angenommen`, `hw_konditionen` aktualisiert
- Projektvertrag-Flow unverändert (siehe `CRM_PARTNER_FLOW_CHECKLIST.md`)

## Portal — falls noch offen / prüfen

- [ ] Migration deployed
- [ ] `partner-notify` akzeptiert `typ: entfernt` (bereits in Route)
- [ ] UI zeigt Badge „Entfernt“ wenn `aenderung_typ=entfernt` (Vorgänge-Detail)
- [ ] Bei Annahme: `entfernt`-Positionen werden gelöscht (nicht nur Meta clearen)
- [ ] `positionBrauchtVorgangAktion` in Annahme-Logik (nicht nur `handwerker_status`)
- [ ] Alte Doku `docs/PARTNER_CRM_NOTIFY_API.md` — Endpoint `partner-notify-zuweisung` ist deprecated; nur noch unified notify

## Test-Durchlauf (End-to-End)

1. CRM: Auftrag → Positionen → Gewerk zuweisen (Popup, **kein** Portal-Mail)
2. CRM: Preis setzen → „An Handwerker senden“ → Portal-Glocke, Tab Vorgänge
3. Portal: Annehmen → `akzeptiert`, Badge weg, `handwerker_bestaetigt_at` gesetzt
4. CRM: Leistung ändern → erneut senden → Portal `geaendert`, ggf. `preis_alt` sichtbar
5. CRM: Leistung mit HW löschen → Badge „Entfernt — wartet auf Partner“
6. Portal: Entfernung bestätigen → Zeile in DB **weg**, CRM-Liste ohne Ghost-Eintrag

Dev CRM ohne Login: `CRM_DEV_SKIP_AUTH=true npm run dev`.
