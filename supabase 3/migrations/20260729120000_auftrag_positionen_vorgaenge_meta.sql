-- Partner-Portal Tab „Vorgänge“: explizite Änderungsmarkierung statt Status-Diff
alter table public.auftrag_positionen
  add column if not exists aenderung_typ text check (aenderung_typ in ('neu', 'geaendert', 'entfernt')),
  add column if not exists preis_alt numeric(10, 2);

comment on column public.auftrag_positionen.aenderung_typ is
  'CRM setzt bei Zuweisung/Änderung: neu | geaendert | entfernt. Portal cleart nach HW-Annahme.';
comment on column public.auftrag_positionen.preis_alt is
  'Alter preis_partner vor Preisänderung (Netto-Zeilenpreis).';
