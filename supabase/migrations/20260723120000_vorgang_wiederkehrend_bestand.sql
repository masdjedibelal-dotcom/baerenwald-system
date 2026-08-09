-- Wiederkehrende Vorgänge / Bestand (Winterdienst, Hausmeister, Wartung)
-- Flag + Turnus auf allen Vorgangs-Phasen für Filter, Pill und Vererbung Angebot→Auftrag.

alter table public.leads
  add column if not exists ist_wiederkehrend boolean not null default false,
  add column if not exists wiederkehr_turnus text;

alter table public.angebote
  add column if not exists ist_wiederkehrend boolean not null default false,
  add column if not exists wiederkehr_turnus text;

alter table public.auftraege
  add column if not exists ist_wiederkehrend boolean not null default false,
  add column if not exists wiederkehr_turnus text;

alter table public.rechnungen
  add column if not exists ist_wiederkehrend boolean not null default false,
  add column if not exists wiederkehr_turnus text;

comment on column public.leads.ist_wiederkehrend is 'Bestand: wiederkehrende Leistung (Wartung/Pflege) statt einmaligem Vorgang';
comment on column public.leads.wiederkehr_turnus is 'Turnus: woechentlich|monatlich|quartal|saisonal|auf_abruf|individuell';
comment on column public.angebote.ist_wiederkehrend is 'Bestand: wiederkehrendes Angebot';
comment on column public.angebote.wiederkehr_turnus is 'Turnus des wiederkehrenden Angebots';
comment on column public.auftraege.ist_wiederkehrend is 'Bestand: laufender Wartungs-/Service-Auftrag';
comment on column public.auftraege.wiederkehr_turnus is 'Turnus des Bestands-Auftrags';
comment on column public.rechnungen.ist_wiederkehrend is 'Bestand: Abrechnung zu wiederkehrendem Auftrag';
comment on column public.rechnungen.wiederkehr_turnus is 'Turnus-Hinweis zur Bestands-Rechnung';

create index if not exists leads_ist_wiederkehrend_idx
  on public.leads (ist_wiederkehrend)
  where ist_wiederkehrend = true;

create index if not exists auftraege_ist_wiederkehrend_idx
  on public.auftraege (ist_wiederkehrend)
  where ist_wiederkehrend = true;
