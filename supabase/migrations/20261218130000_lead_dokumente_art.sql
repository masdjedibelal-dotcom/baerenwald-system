-- Dokumente am Vorgang: nur noch vier Arten, Upload von Bärenwald oder Partner (04.10.2026).
alter table public.lead_dokumente
  add column if not exists art text not null default 'sonstiges',
  add column if not exists von text not null default 'bw',
  add column if not exists handwerker_id uuid references public.handwerker (id) on delete set null;

alter table public.lead_dokumente drop constraint if exists lead_dokumente_art_check;
alter table public.lead_dokumente
  add constraint lead_dokumente_art_check check (art in ('angebot', 'rechnung', 'protokoll', 'sonstiges'));
alter table public.lead_dokumente drop constraint if exists lead_dokumente_von_check;
alter table public.lead_dokumente
  add constraint lead_dokumente_von_check check (von in ('bw', 'partner'));

comment on column public.lead_dokumente.art is 'Angebot, Rechnung, Protokoll oder Sonstiges';
comment on column public.lead_dokumente.von is 'bw = im CRM hochgeladen, partner = im Partner-Portal';
