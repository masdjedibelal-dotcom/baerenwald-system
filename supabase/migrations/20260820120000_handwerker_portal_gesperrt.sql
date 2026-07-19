-- Partner vom Portal ausschließen (Login/Register gesperrt; CRM bleibt nutzbar)

alter table public.handwerker
  add column if not exists ist_portal_gesperrt boolean not null default false;

alter table public.handwerker
  add column if not exists portal_gesperrt_am timestamptz null;

comment on column public.handwerker.ist_portal_gesperrt is
  'Wenn true: kein Partner-Portal-Login/-Register; Partner sollen sich an Bärenwald wenden.';

comment on column public.handwerker.portal_gesperrt_am is
  'Zeitpunkt des Portal-Ausschlusses (null wenn nicht gesperrt).';

create index if not exists handwerker_portal_gesperrt_email_idx
  on public.handwerker (lower(email))
  where ist_portal_gesperrt = true and email is not null;
