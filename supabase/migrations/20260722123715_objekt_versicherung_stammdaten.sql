-- Objekt-Stammdaten Gebäudeversicherung (Prefill für Versicherungsfall Light)

alter table public.kunden_objekte
  add column if not exists versicherer text,
  add column if not exists versicherungs_nr text,
  add column if not exists selbstbehalt_eur numeric(10, 2);

comment on column public.kunden_objekte.versicherer is 'Gebäudeversicherer (Stammdaten)';
comment on column public.kunden_objekte.versicherungs_nr is 'Policen-Nr. Gebäudeversicherung';
comment on column public.kunden_objekte.selbstbehalt_eur is 'Selbstbehalt in EUR';

-- Kontaktrolle Makler für Versicherungs-Ansprechpartner
alter table public.objekt_kontakte drop constraint if exists objekt_kontakte_rolle_check;
alter table public.objekt_kontakte add constraint objekt_kontakte_rolle_check check (
  rolle in ('hausmeister', 'beirat', 'dienstleister', 'notfall', 'makler', 'sonstiges')
);
