-- Parity: Einheit-Personen Rolle Mieter/Eigentümer

alter table public.einheit_bewohner
  add column if not exists rolle text not null default 'mieter';

do $$ begin
  alter table public.einheit_bewohner
    drop constraint if exists einheit_bewohner_rolle_check;
  alter table public.einheit_bewohner
    add constraint einheit_bewohner_rolle_check
    check (rolle in ('mieter', 'eigentuemer'));
exception when others then null;
end $$;

alter table public.einheit_bewohner
  add column if not exists mietbeginn date,
  add column if not exists mietende date,
  add column if not exists miete_hinweis text,
  add column if not exists sondereigentum_verwaltung boolean not null default false,
  add column if not exists notiz text,
  add column if not exists portal_kunde_id uuid references public.kunden (id) on delete set null;

create index if not exists einheit_bewohner_rolle_idx
  on public.einheit_bewohner (objekt_einheit_id, rolle)
  where aktiv = true and anonymisiert_am is null;
