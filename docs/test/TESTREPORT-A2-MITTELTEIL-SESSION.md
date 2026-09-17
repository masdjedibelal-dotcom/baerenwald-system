# TESTREPORT — A2-Mittelteil Session

| Feld | Wert |
|---|---|
| Datum | 2026-08-26 |
| Lead fe37 | `fe37acab-e6ef-43ad-8bfc-2f72ecf5f5af` |
| Token fe37 | `r21GgKaXhOp-rkmMma0L3UeGW5sqBOqz` |
| Bilanz | **8 ok · 1 warn · 1 fail** |
| Rohdaten | `docs/test/TESTREPORT-A2-MITTELTEIL-SESSION.json` |
| Screenshots | `docs/test/screenshots/a2-mittelteil/` |

## Ergebnisse

| ID | Status | Notiz |
|---|---|---|
| status-fe37-hv-warte | ok | MN /  / Musterverwaltung Nord /  / Verwaltung /  / Status Ihrer Meldung /  / WEG Leopold 10 (Staging) /  / 1 /  / Eingegangen /  / Ihre Meldung ist bei Ihrer Verwaltung eingegangen. /  / 2 /  / In Bea |
| hv-uebergeben-fe37 | ok | Direkt Bärenwald / Übergeben geklickt |
| crm-primary-fe37-nach-hv | ok | Primary="Angebot erstellen" (erwartet: Angebot erstellen) |
| db-fe37-nach-hv | ok | {"hv_meldung_status":"angebot_eingefordert","org_freigabe_status":"nicht_noetig"} |
| status-fe37-nach-hv | ok | MN /  / Musterverwaltung Nord /  / Verwaltung /  / Status Ihrer Meldung /  / WEG Leopold 10 (Staging) /  / ✓ /  / Eingegangen /  / 2 /  / In Bearbeitung /  / Ihre Verwaltung prüft die Meldung und orga |
| crm-primary-unter | ok | Primary="Angebot erstellen" disabled=false |
| wizard-save-unter | warn | Keine Angebot-ID in URL: https://staging--baerenwald-backend.netlify.app/anfragen/fe37acab-e6ef-43ad-8bfc-2f72ecf5f5af |
| melde-2 | fail | Zweite Meldung nicht in DB |
| gate-sued-crm | ok | Primary="Warte auf HV / Hausmeister" (Gate auch bei freigabe_modus=direkt?) |
| gate-sued-modus | info | freigabe_modus=direkt hv=neu |
| gate-akut | ok | Primary="Direkt beauftragen" — Akut soll HV-Start-Gate überspringen |

## Hinweise

- **612 € vs. Schwelle 500 €:** Vergleich nutzt `gesamt_fix` (netto). 612 > 500 → erwartet Org-Freigabe, nicht „unter Schwelle“.
- **HV-Start-Gate** (`hv_meldung_status=neu`) ist unabhängig vom Org-`freigabe_modus`.
- Partner-Block getestet via **WhatsApp-Link** / Partner-anfragen (live API, nicht nur Code-Guard).