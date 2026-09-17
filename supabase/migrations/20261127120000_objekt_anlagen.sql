-- Anlagen-/Teile-Register pro Verwaltungsobjekt + Verknüpfung an Vorgang-Pipeline.

-- ---------------------------------------------------------------------------
-- 1) objekt_anlagen
-- ---------------------------------------------------------------------------
create table if not exists public.objekt_anlagen (
  id uuid primary key default gen_random_uuid(),
  kunde_id uuid not null references public.kunden (id) on delete cascade,
  kunde_objekt_id uuid not null references public.kunden_objekte (id) on delete cascade,
  bezeichnung text not null,
  gewerk_id uuid not null references public.gewerke (id) on delete restrict,
  standort text,
  objekt_einheit_id uuid references public.objekt_einheiten (id) on delete set null,
  einbau_datum date,
  foto_url text,
  notiz text,
  status text not null default 'aktiv',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint objekt_anlagen_status_check
    check (status in ('aktiv', 'ausgetauscht', 'stillgelegt'))
);

create index if not exists objekt_anlagen_objekt_idx
  on public.objekt_anlagen (kunde_objekt_id);

create index if not exists objekt_anlagen_kunde_idx
  on public.objekt_anlagen (kunde_id);

create index if not exists objekt_anlagen_gewerk_idx
  on public.objekt_anlagen (gewerk_id);

comment on table public.objekt_anlagen is
  'Technische Anlagen / Bauteile je Verwaltungsobjekt (Anlagen-Register).';

comment on column public.objekt_anlagen.status is
  'aktiv | ausgetauscht | stillgelegt';

-- ---------------------------------------------------------------------------
-- 2) Verknüpfung Vorgang ↔ Anlage (Pipeline mitführen)
-- ---------------------------------------------------------------------------
alter table public.leads
  add column if not exists objekt_anlage_id uuid
    references public.objekt_anlagen (id) on delete set null;

create index if not exists leads_objekt_anlage_id_idx
  on public.leads (objekt_anlage_id)
  where objekt_anlage_id is not null;

comment on column public.leads.objekt_anlage_id is
  'Optionale Zuordnung zu Anlage/Teil am Objekt (Stufe 1: max. eine Anlage pro Vorgang).';

alter table public.angebote
  add column if not exists objekt_anlage_id uuid
    references public.objekt_anlagen (id) on delete set null;

create index if not exists angebote_objekt_anlage_id_idx
  on public.angebote (objekt_anlage_id)
  where objekt_anlage_id is not null;

comment on column public.angebote.objekt_anlage_id is
  'Anlage/Teil am Ausführungsort — mit Lead/Objekt durch Pipeline mitgeführt.';

alter table public.rechnungen
  add column if not exists objekt_anlage_id uuid
    references public.objekt_anlagen (id) on delete set null;

create index if not exists rechnungen_objekt_anlage_id_idx
  on public.rechnungen (objekt_anlage_id)
  where objekt_anlage_id is not null;

comment on column public.rechnungen.objekt_anlage_id is
  'Anlage/Teil am Ausführungsort — mit Lead/Objekt durch Pipeline mitgeführt.';

-- ---------------------------------------------------------------------------
-- 3) RLS
-- ---------------------------------------------------------------------------
alter table public.objekt_anlagen enable row level security;

drop policy if exists objekt_anlagen_org_read on public.objekt_anlagen;
create policy objekt_anlagen_org_read on public.objekt_anlagen
  for select to authenticated
  using (
    kunde_objekt_id in (select public.portal_organisation_objekt_ids())
  );

drop policy if exists objekt_anlagen_crm on public.objekt_anlagen;
create policy objekt_anlagen_crm on public.objekt_anlagen
  for all to authenticated
  using (public.is_crm_staff())
  with check (public.is_crm_staff());

drop policy if exists objekt_anlagen_service on public.objekt_anlagen;
create policy objekt_anlagen_service on public.objekt_anlagen
  for all to service_role using (true) with check (true);
