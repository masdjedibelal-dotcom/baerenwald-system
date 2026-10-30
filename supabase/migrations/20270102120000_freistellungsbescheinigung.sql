-- Partner-Akte: Freistellungsbescheinigung (§ 48b EStG) als feste Dokument-Art neben der Handwerkskarte.
-- Upload mit „gültig bis“ (Vorschlag 36 Monate). Kein Pflichtnachweis.

insert into public.compliance_dokument_typen
  (slug, bezeichnung, beschreibung, pflicht_fuer_fachbetriebe, erneuerung_monate, sort_order, scope, compliance_ebene, aktiv, mehrfach_erlaubt, nur_bei_bauleistung)
values
  ('freistellungsbescheinigung', 'Freistellungsbescheinigung § 48b EStG', 'Befreiung vom Steuerabzug bei Bauleistungen', false, 36, 11, 'stamm', 'allgemein', true, false, false)
on conflict (slug) do update set aktiv = true, scope = 'stamm', compliance_ebene = 'allgemein';
