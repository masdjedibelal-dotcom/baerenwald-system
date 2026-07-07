-- Kunden-Ablehnung (Statistik) + Handwerker-Ablehnungsgrund
alter table public.angebote
  add column if not exists ablehnung_grund text;

alter table public.angebote
  add column if not exists ablehnung_konkurrenz_preis numeric(10,2);

alter table public.angebote
  add column if not exists ablehnung_notiz text;

alter table public.angebot_handwerker
  add column if not exists ablehnung_grund text;

comment on column public.angebot_handwerker.ablehnung_grund is 'Auswahl bei öffentlicher Ablehnung durch Handwerker';
comment on column public.angebote.ablehnung_grund is 'Kunden-Ablehnung (CRM-Statistik)';
