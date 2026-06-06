-- Vereinfachter Angebots-Status + Nachfass + gesendet_am

alter table public.angebote
  add column if not exists nachgefasst_am timestamptz,
  add column if not exists status_einfach text default 'entwurf',
  add column if not exists gesendet_am timestamptz;

comment on column public.angebote.status_einfach is
  'entwurf | gesendet | angenommen | abgelehnt | abgelaufen (Anzeige; abgelaufen wird auch clientseitig aus gueltig_bis abgeleitet)';

update public.angebote
set
  gesendet_am = coalesce(gesendet_am, gesendet_kunde_at)
where gesendet_am is null and gesendet_kunde_at is not null;

update public.angebote
set
  status_einfach = case
    when status in ('gesendet_kunde', 'gesendet_handwerker', 'handwerker_akzeptiert') then 'gesendet'
    when status = 'kunde_akzeptiert' then 'angenommen'
    when status = 'abgelehnt' then 'abgelehnt'
    else 'entwurf'
  end
where status_einfach is null or status_einfach = 'entwurf';

alter table public.lead_timeline
  add column if not exists angebot_id uuid references public.angebote (id) on delete set null;

create index if not exists idx_lead_timeline_angebot
  on public.lead_timeline (angebot_id, created_at desc);
