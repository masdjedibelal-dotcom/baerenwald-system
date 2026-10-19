-- HV-Entschlankung (18./19.10.2026): Altlasten ohne Code-Verweise entfernen.
-- AV-Spalten (av_*) bleiben als Nachweis akzeptierter AV-Verträge.
drop view if exists public.v_hv_kalender_events;
drop view if exists public.v_objekt_kosten;
drop table if exists public.lead_befund_punkte;
drop table if exists public.lead_befunde;
drop table if exists public.hv_calendar_feeds;
drop table if exists public.sammelrechnung_positionen;
drop table if exists public.sammelrechnungen;
drop table if exists public.objekt_abos;
drop table if exists public.objekt_pruefpflichten;
alter table public.kunden
  drop column if exists kleinreparatur_aktiv,
  drop column if exists kleinreparaturen_ohne_angebot,
  drop column if exists hm_auto_zuweisen,
  drop column if exists wl_ansprache_am,
  drop column if exists org_hero_url,
  drop column if exists eigentuemer_freigabe_schwelle_eur;
alter table public.leads drop column if exists eigentuemer_freigabe_status;
