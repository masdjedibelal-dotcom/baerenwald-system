# Migrations-Hygiene — Repo ↔ Staging ↔ Prod

**Stand:** 2026-08-26  
**Quelle Repo:** `baerenwald-system/supabase/migrations` (163 Dateien)  
**Staging-Ref:** `soqownnkxmtfgvsbrgsl` — `supabase_migrations.schema_migrations`: **4** Einträge  
**Prod-Ref:** `wnotlydvhsmfkhexgeol` — `schema_migrations`: **26** Einträge  
**Aktion:** nur Doku — nichts angewendet.

## Legende

| Symbol | Bedeutung |
|--------|-----------|
| ✓ (Staging/Prod) | Name oder Version in `schema_migrations` gefunden (ggf. Timestamp-Drift) |
| – | nicht in `schema_migrations` |
| ✓ / – / ? (Schema-real) | Spot-Check `information_schema` / bekannt aus applied · `?` = nicht geprüft |

## Kurzfazit

1. **Staging-History fast leer** (nur 4 Zeilen) — Schema ist dennoch weitgehend vorhanden (Restore/Bootstrap ohne vollständige History).
2. **Prod-History endet** bei `20260816223912_objekt_einheiten_crm_rls` — neuere Repo-Dateien (ab ~20260817…) sind **nicht** als Migrationseintrag in Prod.
3. **Viele Repo-Dateien** haben andere Timestamps als applied (gleicher Suffix-Name) → Spalte „Drift“.
4. **Nichts anwenden** bis Release-Plan die Reihenfolge klärt.

## Applied Staging (vollständig)

| Version | Name |
|---------|------|
| `20260818133826` | `angebot_handwerker_rechnung_13b_flag` |
| `20260824205303` | `belegnummer_erst_bei_versand` |
| `20260824220617` | `rechnungen_ansprechpartner_id` |
| `20260824222225` | `rechnungen_kunde_objekt_id` |

## Applied Prod (vollständig)

| Version | Name |
|---------|------|
| `20260625161833` | `kunden_email_duplikate_erlauben` |
| `20260625233419` | `hw_einreichung_crm_antwort` |
| `20260628234230` | `partner_vorgang_position_aenderung` |
| `20260629131947` | `partner_bautagebuch_anfragen` |
| `20260629133732` | `partner_notification_bautagebuch_typ` |
| `20260629134729` | `hv_meldung_workflow` |
| `20260706140551` | `welle1_closing` |
| `20260706215809` | `partner_befund_hv` |
| `20260706223149` | `lead_kanal_hv_manuell` |
| `20260715213435` | `crm_impersonation_tokens` |
| `20260724090256` | `angebot_ki_beispiele` |
| `20260726124537` | `abnahmeprotokoll_meta` |
| `20260729223857` | `todos` |
| `20260803000341` | `partner_bautagebuch_anfragen_position_ids` |
| `20260803003851` | `partner_positions_anfragen` |
| `20260803004904` | `abnahme_teil_freigabe` |
| `20260803013117` | `hw_rechnung_eingang_status` |
| `20260803090437` | `auftrag_timeline_email_log` |
| `20260808023008` | `handwerker_adresse_hausnummer_plz` |
| `20260810101754` | `portal_push_subscriptions` |
| `20260813185645` | `portal_angebote_nur_nach_senden` |
| `20260814232936` | `kunden_ansprechpartner` |
| `20260815082536` | `partner_dokumente_soft_delete` |
| `20260816000956` | `org_address_split` |
| `20260816105204` | `einheit_bewohner_portal_kunde_idx` |
| `20260816223912` | `objekt_einheiten_crm_rls` |

## Tabelle: Datei · Staging · Prod · Schema-real

| Datei | Staging | Prod | Schema-real Stg | Schema-real Prod | Hinweis |
|-------|:-------:|:----:|:---------------:|:----------------:|---------|
| `20260217120000_rechnungen_einstellungen.sql` | – | – | ? | ? | — |
| `20260217140000_preislisten_kategorie.sql` | – | – | ? | ? | — |
| `20260217180000_angebot_handwerker_token.sql` | – | – | ? | ? | — |
| `20260218100000_angebot_ablehnung_kopie.sql` | – | – | ? | ? | — |
| `20260218130000_auftrag_timeline_nachtrag_punch.sql` | – | – | ? | ? | — |
| `20260218140000_formular_subtyp_regie.sql` | – | – | ? | ? | — |
| `20260218170000_handwercher_compliance_spalten_trigger.sql` | – | – | ? | ? | — |
| `20260218193000_rechnungen_mahnungen.sql` | – | – | ? | ? | — |
| `20260219120000_nachtrag_vorbaubeginn_baustopp.sql` | – | – | ? | ? | — |
| `20260417120000_einbehalte_eingangsrechnungen.sql` | – | – | ? | ? | — |
| `20260417200000_partner_typ.sql` | – | – | ? | ? | — |
| `20260418120000_kunden_token_timeline_kunde.sql` | – | – | ? | ? | — |
| `20260418120000_lead_budget_zeitraum_notizen.sql` | – | – | ? | ? | — |
| `20260419100000_datenschutz.sql` | – | – | ? | ? | — |
| `20260419140000_lead_timeline_custom_fields.sql` | – | – | ? | ? | — |
| `20260420100000_angebot_editor_erweiterung.sql` | – | – | ? | ? | — |
| `20260420120000_auftrag_positionen.sql` | – | – | ? | ? | — |
| `20260421120000_auftrag_milestones_formular_hw.sql` | – | – | ? | ? | — |
| `20260421140000_kunden_erweiterung.sql` | – | – | ? | ? | — |
| `20260422120000_hw_formular_fotos_bucket.sql` | – | – | ? | ? | — |
| `20260422140000_settings_extras.sql` | – | – | ? | ? | — |
| `20260423120000_email_log_kunden_tracking.sql` | – | – | ? | ? | — |
| `20260424130000_kalender_termine.sql` | – | – | ? | ? | — |
| `20260424180000_storage_angebote_pdfs.sql` | – | – | ? | ? | — |
| `20260425100000_leads_status_history_user_notiz.sql` | – | – | ? | ? | — |
| `20260425120000_compliance_dokument_kategorie.sql` | – | – | ? | ? | — |
| `20260520120000_angebote_dokumentfelder.sql` | – | – | ? | ? | — |
| `20260520120000_lead_notizen_erstellt_von_user_profiles.sql` | – | – | ? | ? | — |
| `20260520140000_storage_lead_notizen_fotos.sql` | – | – | ? | ? | — |
| `20260520153000_kunden_adresse_felder.sql` | – | – | ? | ? | — |
| `20260520180000_angebote_dokument_typ_projekt.sql` | – | – | ? | ? | — |
| `20260521120000_rechnungen_compliance.sql` | – | – | ? | ? | — |
| `20260521140000_gewerke_ausfuehrung_fachbetrieb.sql` | – | – | ? | ? | — |
| `20260524120000_angebote_status_einfach.sql` | – | – | ? | ? | — |
| `20260525120000_angebote_verlaengert_am.sql` | – | – | ? | ? | — |
| `20260525120000_preislisten_nur_preis_min.sql` | – | – | ? | ? | — |
| `20260526120000_auftrag_position_handwerker_status.sql` | – | – | ? | ? | — |
| `20260526130000_auftrag_handwerker_details.sql` | – | – | ? | ? | — |
| `20260527130000_kunden_objekte.sql` | – | – | ? | ? | — |
| `20260528120000_leads_ki_zusammenfassung.sql` | – | – | ? | ? | — |
| `20260529120000_auftrag_position_phasen_notizen.sql` | – | – | ? | ? | — |
| `20260529130000_auftrag_position_leistung_status.sql` | – | – | ? | ? | — |
| `20260529140000_auftrag_bautagebuch.sql` | – | – | ? | ? | — |
| `20260529150000_auftrag_abnahmeprotokolle.sql` | – | – | ? | ? | — |
| `20260530220000_lead_timeline_email_log.sql` | – | – | ? | ? | — |
| `20260601130000_rechnung_nummer_re2026.sql` | – | – | ? | ? | — |
| `20260601130001_rechnungen_pdf_texte.sql` | – | – | ? | ? | — |
| `20260601140000_bautagebuch_gewerk_id.sql` | – | – | ? | ? | — |
| `20260601150000_handwerker_bewertungen.sql` | – | – | ? | ? | — |
| `20260602120000_auftrag_handwerker_compliance_pflicht.sql` | – | – | ? | ? | — |
| `20260602120000_portal_auth_kunden.sql` | – | – | ? | ? | — |
| `20260602120100_portal_auth_repair.sql` | – | – | ? | ? | — |
| `20260602120200_portal_token_policy_cleanup.sql` | – | – | ? | ? | — |
| `20260602140000_lead_notizen_termin.sql` | – | – | ? | ? | — |
| `20260603120000_portal_auth_handwerker.sql` | – | – | ? | ? | — |
| `20260603120100_portal_handwerker_angebot_einreichung.sql` | – | – | ? | ? | — |
| `20260603120200_portal_handwerker_bautagebuch.sql` | – | – | ? | ? | — |
| `20260603120400_portal_handwerker_storage_policies.sql` | – | – | ? | ? | — |
| `20260603120500_portal_handwerker_rechnung_einreichung.sql` | – | – | ? | ? | — |
| `20260604120000_kalender_zugewiesen_user_telefon.sql` | – | – | ? | ? | — |
| `20260604150000_fix_leads_rls_recursion.sql` | – | – | ? | ? | — |
| `20260604160000_fix_portal_token_policies.sql` | – | – | ? | ? | — |
| `20260604170000_allow_crm_staff_partner_portal.sql` | – | – | ? | ? | — |
| `20260605120000_kommunikation_mail.sql` | – | – | ? | ? | — |
| `20260606120000_user_profiles_portal_kontakt.sql` | – | – | ? | ? | — |
| `20260607120000_angebot_handwerker_schema_gaps.sql` | – | – | ? | ? | — |
| `20260610120000_copilot_messages.sql` | – | – | ? | ? | — |
| `20260610140000_lead_dokumente.sql` | – | – | ? | ? | — |
| `20260610180000_rechnung_nummer_start_2069.sql` | – | – | ? | ? | — |
| `20260611120000_lead_notizen_datei_urls.sql` | – | – | ? | ? | — |
| `20260611130000_lead_notizen_termin_spiegel.sql` | – | – | ? | ? | — |
| `20260612120000_ki_cluster_analysen.sql` | – | – | ? | ? | — |
| `20260613120000_ki_historische_daten.sql` | – | – | ? | ? | — |
| `20260614120000_handwerker_vertraege.sql` | – | – | ? | ? | — |
| `20260615120000_compliance_dokument_scope.sql` | – | – | ? | ? | — |
| `20260616120000_partner_dokumente_auftrag.sql` | – | – | ? | ? | — |
| `20260617120000_compliance_vertraege_portal.sql` | – | – | ? | ? | — |
| `20260618120000_handwerker_vertraege_ergaenzung.sql` | – | – | ? | ? | — |
| `20260618120000_portal_partner_alignment.sql` | – | – | ? | ? | — |
| `20260619120000_user_profiles_datenschutz_hint.sql` | – | – | ? | ? | — |
| `20260620120000_ki_visualisierungen.sql` | – | – | ? | ? | — |
| `20260623120000_ki_visualisierungen_repair.sql` | – | – | ? | ? | — |
| `20260624130000_ki_visualisierungen_viz_brief.sql` | – | – | ? | ? | — |
| `20260625120000_copilot_alerts.sql` | – | – | ? | ? | — |
| `20260626120000_ki_hub.sql` | – | – | ? | ? | — |
| `20260627120000_ki_hub_storage.sql` | – | – | ? | ? | — |
| `20260628120000_compliance_ebenen.sql` | – | – | ? | ? | — |
| `20260629120000_lead_status_termin.sql` | – | – | ? | ? | — |
| `20260629120001_lead_status_termin_backfill.sql` | – | – | ? | ? | — |
| `20260630120000_partner_bautagebuch_anfragen.sql` | – | ✓ | ? | ? | Prod-Version drift (20260629131947) |
| `20260702120000_hw_einreichung_crm_antwort.sql` | – | ✓ | ? | ? | Prod-Version drift (20260625233419) |
| `20260703120000_abnahme_maengel_punch_list.sql` | – | – | ? | ? | — |
| `20260703130000_combined_termin_abnahme_maengel.sql` | – | – | ? | ? | — |
| `20260704120000_partner_hw_konditionen.sql` | – | – | ? | ? | — |
| `20260704120000_zahlungsplan_abschlagsrechnungen.sql` | – | – | ? | ? | — |
| `20260705120000_ist_bauprojekt_bautagesberichte.sql` | – | – | ? | ? | — |
| `20260706120000_angebote_status_ersetzt.sql` | – | – | ? | ? | — |
| `20260707120000_bauauftrag_baustelle.sql` | – | – | ? | ? | — |
| `20260708120000_organisation_portal_stamm.sql` | – | – | ? | ? | — |
| `20260708120100_organisation_portal_rls.sql` | – | – | ? | ? | — |
| `20260708120200_organisation_freigabe_log.sql` | – | – | ? | ? | — |
| `20260709120000_handwerker_vorname_nachname.sql` | – | – | ? | ? | — |
| `20260709120100_handwerker_updated_at.sql` | – | – | ? | ? | — |
| `20260712120000_rechnungen_zahlungsbedingungen.sql` | – | – | ? | ? | — |
| `20260713120000_rechnungen_hinweis_35a.sql` | – | – | ? | ? | — |
| `20260715223000_crm_impersonation_tokens.sql` | – | ✓ | ✓ | ✓ | Prod-Version drift (20260715213435); Tabelle vorhanden |
| `20260719120000_kunden_dokumente_storage.sql` | – | – | ? | ? | — |
| `20260721120000_kunden_kleinreparaturen_ohne_angebot.sql` | – | – | ? | ? | — |
| `20260722123715_objekt_versicherung_stammdaten.sql` | – | – | ? | ? | — |
| `20260722160000_preiskatalog_positionen_varianten.sql` | – | – | ? | ? | — |
| `20260723120000_vorgang_wiederkehrend_bestand.sql` | – | – | ? | ? | — |
| `20260724120000_angebot_ki_beispiele.sql` | – | ✓ | ? | ? | Prod-Version drift (20260724090256) |
| `20260725120000_datenschutz_melder.sql` | – | – | ? | ? | — |
| `20260726120000_kunden_email_duplikate_erlauben.sql` | – | ✓ | ? | ? | Prod-Version drift (20260625161833) |
| `20260726140000_abnahmeprotokoll_meta.sql` | – | ✓ | ? | ? | Prod-Version drift (20260726124537) |
| `20260727120000_angebot_handwerker_bestaetigt_at.sql` | – | – | ? | ? | — |
| `20260728113706_vorgang_datenmodell_spec_w2.sql` | – | – | ? | ? | — |
| `20260728120000_handwerker_vertraege_portal_akzeptiert.sql` | – | – | ? | ? | — |
| `20260729120000_auftrag_positionen_vorgaenge_meta.sql` | – | – | ? | ? | — |
| `20260729120000_leads_soft_delete_duplikat_dismiss.sql` | – | – | ? | ? | — |
| `20260730114323_freigabe_bypass_grund_annahme_backfill.sql` | – | – | ? | ? | — |
| `20260730115650_abnahme_protokolle_drop_kleinreparatur_schwelle.sql` | – | – | ? | ? | — |
| `20260730120000_auftraege_abschlussdokumentation_url.sql` | – | – | ? | ? | — |
| `20260730120000_kalender_termine_kunde_id.sql` | – | – | ? | ? | — |
| `20260730130000_crm_notification_reads.sql` | – | – | ? | ? | — |
| `20260730140000_partner_bautagebuch_anfragen_position_ids.sql` | – | ✓ | ? | ? | Prod-Version drift (20260803000341) |
| `20260801120000_hv_plattform_wellen_0_3.sql` | – | – | ? | ? | — |
| `20260801120100_hv_katalog_preise_seed.sql` | – | – | ? | ? | — |
| `20260801120200_lead_kanal_hv_werte.sql` | – | – | ? | ? | — |
| `20260803140000_partner_positions_anfragen.sql` | – | ✓ | ? | ? | Prod-Version drift (20260803003851) |
| `20260803150000_abnahme_teil_freigabe.sql` | – | ✓ | ? | ? | Prod-Version drift (20260803004904) |
| `20260803160000_hw_rechnung_eingang_status.sql` | – | ✓ | ? | ? | Prod-Version drift (20260803013117) |
| `20260803170000_auftrag_timeline_email_log.sql` | – | ✓ | ? | ? | Prod-Version drift (20260803090437) |
| `20260807120000_welle1_closing.sql` | – | ✓ | ? | ✓ | Prod-Version drift (20260706140551); in Prod applied |
| `20260808120000_partner_befund_hv.sql` | – | ✓ | ? | ✓ | Prod-Version drift (20260706215809); in Prod applied |
| `20260808130000_lead_kanal_hv_manuell.sql` | – | ✓ | ? | ✓ | Prod-Version drift (20260706223149); in Prod applied |
| `20260810120000_crm_push_notifications.sql` | – | – | ? | ? | — |
| `20260815120000_partner_dokumente_soft_delete.sql` | – | ✓ | ✓ | ✓ | Prod-Version drift (20260815082536); Spalte geloescht_am |
| `20260816160000_portal_modus_mieter.sql` | – | – | ? | ? | — |
| `20260816170000_rechnungen_richtung_eingehend.sql` | – | – | ✓ | ✓ | Spalte rechnungen.richtung |
| `20260817120000_objekt_einheiten_crm_rls.sql` | – | ✓ | ✓ | ✓ | Prod-Version drift (20260816223912); Tabelle objekt_einheiten |
| `20260817140000_kunden_akut_fall_ids.sql` | – | – | ? | ? | — |
| `20260818120000_belegnummer_erst_bei_versand.sql` | ✓ | – | ? | ? | Staging-Version drift (20260824205303); kein proc-Match belegnummer% |
| `20260818123000_angebot_handwerker_rechnung_13b_flag.sql` | ✓ | – | ? | ? | Staging-Version drift (20260818133826); Spalte rechnung_13b nicht gefunden (anderer Name?) |
| `20260818140000_partner_angebot_einholung.sql` | – | – | ? | ? | — |
| `20260819180000_kunden_ist_spam.sql` | – | – | ? | ? | — |
| `20260820120000_handwerker_portal_gesperrt.sql` | – | – | ? | ? | — |
| `20260825120000_rechnungen_ansprechpartner_id.sql` | ✓ | – | ✓ | ✓ | Staging-Version drift (20260824220617); Spalte rechnungen.ansprechpartner_id |
| `20260825123000_rechnungen_kunde_objekt_id.sql` | ✓ | – | ✓ | ✓ | Staging-Version drift (20260824222225); Spalte rechnungen.kunde_objekt_id |
| `20260825160000_partner_ersetzt_sperre.sql` | – | – | ? | ? | — |
| `20260829120000_position_lebenszyklus_bautagebuch.sql` | – | – | ? | ? | — |
| `20260829120100_auftrag_notfall_beauftragung.sql` | – | – | ✓ | ✓ | auftraege.ist_notfall (Staging bestätigt; Prod analog erwartet) |
| `20260830120000_position_eintraege_ohne_leistung.sql` | – | – | ? | ? | — |
| `20260901120000_vorgang_datenmodell_spec_w2.sql` | – | – | ? | ? | — |
| `20260902120000_todos.sql` | – | ✓ | ✓ | ✓ | Prod-Version drift (20260729223857); Tabelle todos |
| `20260906120000_auftrag_fachdoku_slots.sql` | – | – | ? | ? | — |
| `20260930120000_freigabe_annahme_objekt.sql` | – | – | ? | ? | — |
| `20261009120000_portal_dokumente_visibility_fixes.sql` | – | – | ? | ? | — |
| `20261015120000_kunden_ansprechpartner.sql` | – | ✓ | ✓ | ✓ | Prod-Version drift (20260814232936); Tabelle vorhanden |
| `20261016120000_lead_befunde_hm_status.sql` | – | – | ? | ? | — |
| `20261017120000_automatische_schadenakte.sql` | – | – | ? | ? | — |
| `20261018120000_einheit_bewohner_rollen.sql` | – | – | ? | ? | — |
| `20261019120000_einheit_bewohner_portal_kunde_idx.sql` | – | ✓ | ? | ? | Prod-Version drift (20260816105204) |

## Applied ohne passende Repo-Datei (Orphans)

### Staging
_keine_ (alle Namen matchen Repo per Name/Fuzzy)

### Prod
- `20260628234230_partner_vorgang_position_aenderung`
- `20260629133732_partner_notification_bautagebuch_typ`
- `20260629134729_hv_meldung_workflow`
- `20260808023008_handwerker_adresse_hausnummer_plz`
- `20260810101754_portal_push_subscriptions`
- `20260813185645_portal_angebote_nur_nach_senden`
- `20260816000956_org_address_split`

## Schema-real Spot-Checks (2026-08-26)

| Check | Staging | Prod |
|-------|:-------:|:----:|
| Tabelle `kunden_ansprechpartner` | ✓ | ✓ |
| `rechnungen.ansprechpartner_id` | ✓ | ✓ |
| `rechnungen.kunde_objekt_id` | ✓ | ✓ |
| `rechnungen.richtung` | ✓ | ✓ |
| Tabelle `todos` | ✓ | ✓ |
| Tabelle `objekt_einheiten` | ✓ | ✓ |
| `partner_dokumente.geloescht_am` | ✓ | ✓ |
| Tabelle `crm_impersonation_tokens` | ✓ | ✓ |
| Spalte `rechnung_13b` an `angebot_handwerker` | –/anderes | –/anderes |
| `auftraege.ist_notfall` | ✓ | (nicht separat geprüft; Prod hat ältere History) |

## Nächste Schritte (nicht Teil dieses Auftrags)

- Staging: Migration-History nachziehen oder `schema_migrations` mit Ist-Schema abgleichen (Repair), bevor neue Migrationen via CLI kommen.
- Prod: Pending-Repo-Migrationen nur im Release-Fenster, nach Backup, in Reihenfolge.
