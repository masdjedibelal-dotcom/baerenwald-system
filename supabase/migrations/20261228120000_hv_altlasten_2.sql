-- HV-Altlasten, zweiter Durchgang: Objekt-Anlagen, Einheiten/Bewohner, Hausmeister/Eigentümer,
-- HV-Abnahmen, Einladungen, Fremdvorgänge, Objekt-Dokumente, Mieter-Feedback, HV-Branding,
-- Kostenträger-/Versicherungsangaben. Code nutzt nichts davon mehr.
-- Bleibt: kunden_mitglieder (HV-Mehrbenutzer), av_*-Spalten (AV-Nachweis), einheiten_hinweis.

alter table public.leads drop column if exists objekt_anlage_id;
alter table public.angebote drop column if exists objekt_anlage_id;
alter table public.rechnungen drop column if exists objekt_anlage_id;

drop table if exists public.portal_einladungen;
drop table if exists public.einheit_bewohner;
drop table if exists public.hausmeister_objekte;
drop table if exists public.org_hausmeister;
drop table if exists public.eigentuemer_objekte;
drop table if exists public.hv_portal_abnahmen;
drop table if exists public.fremd_vorgaenge;
drop table if exists public.objekt_dokumente;
drop table if exists public.mieter_feedback;
drop table if exists public.objekt_anlagen;
drop table if exists public.objekt_einheiten;

alter table public.kunden
  drop column if exists org_logo_url,
  drop column if exists org_logo_kuerzel,
  drop column if exists org_primary_color,
  drop column if exists org_primary_color_dk,
  drop column if exists org_primary_color_soft;

alter table public.leads
  drop column if exists kostentraeger,
  drop column if exists kostentraeger_vorgeschlagen,
  drop column if exists schaden_nr,
  drop column if exists schaden_nr_geaendert_am,
  drop column if exists versicherungs_nr,
  drop column if exists versicherungs_nr_geaendert_am,
  drop column if exists versicherungsakte_erstellt_am,
  drop column if exists versicherungsakte_pdf_url;

alter table public.auftraege
  drop column if exists kostentraeger,
  drop column if exists versicherungs_nr,
  drop column if exists versicherungsakte_pdf_url;

alter table public.rechnungen drop column if exists kostentraeger;

alter table public.kunden_objekte
  drop column if exists versicherer,
  drop column if exists versicherungs_nr,
  drop column if exists automatische_schadenakte;
