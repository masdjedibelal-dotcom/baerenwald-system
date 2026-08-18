-- Partner-Angebote einholen von der Anfrage (ohne Kunden-LV).
-- Internes Angebots-Gehäuse + Flag an der Zuweisung.

alter table public.angebote
  add column if not exists ist_partner_einholung boolean not null default false;

comment on column public.angebote.ist_partner_einholung is
  'Intern: Partner-Angebote einholen ohne Kunden-LV. Nicht in Kunden-Angebotslisten.';

create index if not exists angebote_lead_partner_einholung_idx
  on public.angebote (lead_id)
  where ist_partner_einholung;

alter table public.angebot_handwerker
  add column if not exists ohne_lv boolean not null default false;

comment on column public.angebot_handwerker.ohne_lv is
  'Partner erstellt oder lädt eigenes Angebot — kein LV von Bärenwald.';
