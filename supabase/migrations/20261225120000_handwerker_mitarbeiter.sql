-- Partner-Mitarbeiter (16.10.2026): Ansprechpartner des Partners mit optionalem eigenem Portal-Zugang.
-- Der Inhaber nimmt Einsätze an; der zugeordnete Mitarbeiter sieht nur seine angenommenen Einsätze (ohne EK).

create table if not exists public.handwerker_mitarbeiter (
  id uuid primary key default gen_random_uuid (),
  handwerker_id uuid not null references public.handwerker (id) on delete cascade,
  name text not null,
  email text,
  telefon text,
  rolle text,
  aktiv boolean not null default true,
  -- Portal-Zugang (eigenes Login); null = nur Kontakt
  auth_user_id uuid unique references auth.users (id) on delete set null,
  portal_eingeladen_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now ()
);

create index if not exists handwerker_mitarbeiter_hw_idx on public.handwerker_mitarbeiter (handwerker_id);
create index if not exists handwerker_mitarbeiter_email_idx
  on public.handwerker_mitarbeiter (lower(email)) where email is not null;

comment on table public.handwerker_mitarbeiter is
  'Mitarbeiter eines Partners (Name/E-Mail/Telefon), optional mit Portal-Zugang — sieht nur zugeordnete, angenommene Einsätze.';

alter table public.handwerker_mitarbeiter enable row level security;

drop policy if exists "handwerker_mitarbeiter_crm" on public.handwerker_mitarbeiter;
create policy "handwerker_mitarbeiter_crm"
  on public.handwerker_mitarbeiter for all to authenticated
  using (public.is_crm_staff ()) with check (public.is_crm_staff ());

drop policy if exists "handwerker_mitarbeiter_inhaber" on public.handwerker_mitarbeiter;
create policy "handwerker_mitarbeiter_inhaber"
  on public.handwerker_mitarbeiter for all to authenticated
  using (handwerker_id = public.portal_handwerker_id ())
  with check (handwerker_id = public.portal_handwerker_id ());

drop policy if exists "handwerker_mitarbeiter_selbst" on public.handwerker_mitarbeiter;
create policy "handwerker_mitarbeiter_selbst"
  on public.handwerker_mitarbeiter for select to authenticated
  using (auth_user_id = auth.uid ());

-- Einsatz: zuständiger Mitarbeiter vor Ort (Bärenwald schlägt vor, Inhaber kann beim Annehmen ändern)
alter table public.einsaetze
  add column if not exists mitarbeiter_id uuid references public.handwerker_mitarbeiter (id) on delete set null;
create index if not exists einsaetze_mitarbeiter_idx on public.einsaetze (mitarbeiter_id) where mitarbeiter_id is not null;
comment on column public.einsaetze.mitarbeiter_id is 'Mitarbeiter des Partners vor Ort — sieht den Einsatz nach Annahme im Portal.';
