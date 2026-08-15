-- CRM-Ansprechpartner unter einem Kunden-Account (keine eigenen Portal-Logins)

create table if not exists public.kunden_ansprechpartner (
  id uuid primary key default gen_random_uuid (),
  kunde_id uuid not null references public.kunden (id) on delete cascade,
  name text not null,
  email text,
  telefon text,
  rolle text,
  ist_primaer boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now ()
);

create index if not exists kunden_ansprechpartner_kunde_idx
  on public.kunden_ansprechpartner (kunde_id);

create index if not exists kunden_ansprechpartner_email_idx
  on public.kunden_ansprechpartner (lower(email))
  where email is not null;

comment on table public.kunden_ansprechpartner is
  'CRM-Ansprechpartner (Name/E-Mail/Telefon) unter einem Kunden — Versandempfänger ohne neuen Kunden-Account.';

alter table public.kunden_ansprechpartner enable row level security;

drop policy if exists "kunden_ansprechpartner_authenticated_all" on public.kunden_ansprechpartner;

create policy "kunden_ansprechpartner_authenticated_all"
  on public.kunden_ansprechpartner
  for all
  to authenticated
  using (true)
  with check (true);

-- Optionaler Empfänger am Vorgang
alter table public.leads
  add column if not exists ansprechpartner_id uuid
    references public.kunden_ansprechpartner (id) on delete set null;

alter table public.angebote
  add column if not exists ansprechpartner_id uuid
    references public.kunden_ansprechpartner (id) on delete set null;

comment on column public.leads.ansprechpartner_id is
  'Optionaler Ansprechpartner (Empfänger) für diese Anfrage';
comment on column public.angebote.ansprechpartner_id is
  'Optionaler Ansprechpartner (Empfänger) für Angebot-Versand';

-- Freitext kunden.ansprechpartner → erste Zeile (einmalig, nur wenn noch keine Zeilen)
insert into public.kunden_ansprechpartner (kunde_id, name, email, telefon, rolle, ist_primaer, sort_order)
select
  k.id,
  trim(k.ansprechpartner),
  nullif(trim(k.email), ''),
  nullif(trim(k.telefon), ''),
  'Stammdaten',
  true,
  0
from public.kunden k
where k.ansprechpartner is not null
  and trim(k.ansprechpartner) <> ''
  and not exists (
    select 1 from public.kunden_ansprechpartner a where a.kunde_id = k.id
  );
