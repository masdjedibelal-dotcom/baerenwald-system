-- Partner-Eingangsrechnung als eigener Rechnungs-Vorgang (wie ausgehende Kundenrechnung).

alter table public.rechnungen
  add column if not exists richtung text not null default 'ausgehend';

alter table public.rechnungen
  drop constraint if exists rechnungen_richtung_check;

alter table public.rechnungen
  add constraint rechnungen_richtung_check
  check (richtung in ('ausgehend', 'eingehend'));

alter table public.rechnungen
  add column if not exists handwerker_id uuid references public.handwerker (id) on delete set null;

alter table public.rechnungen
  add column if not exists angebot_handwerker_id uuid references public.angebot_handwerker (id) on delete set null;

create unique index if not exists rechnungen_angebot_handwerker_id_uidx
  on public.rechnungen (angebot_handwerker_id)
  where angebot_handwerker_id is not null;

comment on column public.rechnungen.richtung is
  'ausgehend = Kundenrechnung; eingehend = Partner-Eingangsrechnung (eigener Vorgang)';

comment on column public.rechnungen.angebot_handwerker_id is
  'Bei eingehend: Link zur Partner-Zuweisung (hw_rechnung_pdf_url)';
