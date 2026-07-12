-- Welle 3d: Objektakte / CRM-light (HV-Portal)
-- Idempotent

-- ---------------------------------------------------------------------------
-- 1) Objekt-Kontakte (HV + CRM Disposition)
-- ---------------------------------------------------------------------------
create table if not exists public.objekt_kontakte (
  id uuid primary key default gen_random_uuid(),
  kunde_id uuid not null references public.kunden(id) on delete cascade,
  kunde_objekt_id uuid not null references public.kunden_objekte(id) on delete cascade,
  rolle text not null,
  name text not null,
  telefon text,
  email text,
  notiz text,
  sort_order int not null default 0,
  aktiv boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.objekt_kontakte drop constraint if exists objekt_kontakte_rolle_check;
alter table public.objekt_kontakte add constraint objekt_kontakte_rolle_check check (
  rolle in ('hausmeister', 'beirat', 'dienstleister', 'notfall', 'sonstiges')
);

create index if not exists objekt_kontakte_objekt_idx
  on public.objekt_kontakte (kunde_objekt_id, sort_order);

-- ---------------------------------------------------------------------------
-- 2) Bewohner je Einheit (HV + CRM, nicht im Melde-Flow)
-- ---------------------------------------------------------------------------
create table if not exists public.einheit_bewohner (
  id uuid primary key default gen_random_uuid(),
  kunde_id uuid not null references public.kunden(id) on delete cascade,
  objekt_einheit_id uuid not null references public.objekt_einheiten(id) on delete cascade,
  name text not null,
  telefon text,
  email text,
  aktiv boolean not null default true,
  anonymisiert_am timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists einheit_bewohner_einheit_idx
  on public.einheit_bewohner (objekt_einheit_id)
  where aktiv = true and anonymisiert_am is null;

-- ---------------------------------------------------------------------------
-- 3) Notizen + Wiedervorlagen (Objekt / Vorgang)
-- ---------------------------------------------------------------------------
create table if not exists public.akten_notizen (
  id uuid primary key default gen_random_uuid(),
  kunde_id uuid not null references public.kunden(id) on delete cascade,
  bezug_typ text not null,
  kunde_objekt_id uuid references public.kunden_objekte(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  text text not null,
  wiedervorlage_am date,
  erledigt_am timestamptz,
  erstellt_von uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint akten_notizen_bezug_check check (
    (bezug_typ = 'objekt' and kunde_objekt_id is not null and lead_id is null)
    or (bezug_typ = 'vorgang' and lead_id is not null)
  )
);

create index if not exists akten_notizen_wiedervorlage_idx
  on public.akten_notizen (kunde_id, wiedervorlage_am)
  where erledigt_am is null and wiedervorlage_am is not null;

create index if not exists akten_notizen_objekt_idx
  on public.akten_notizen (kunde_objekt_id, created_at desc);

create index if not exists akten_notizen_lead_idx
  on public.akten_notizen (lead_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 4) Objekt-Dokumente (Kategorie, Ablauf, Erinnerung)
-- ---------------------------------------------------------------------------
create table if not exists public.objekt_dokumente (
  id uuid primary key default gen_random_uuid(),
  kunde_id uuid not null references public.kunden(id) on delete cascade,
  kunde_objekt_id uuid not null references public.kunden_objekte(id) on delete cascade,
  kategorie text not null,
  titel text not null,
  storage_path text,
  storage_url text,
  ablauf_datum date,
  erinnerung_tage int[] not null default '{60,30}',
  status text not null default 'aktiv',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.objekt_dokumente drop constraint if exists objekt_dokumente_kategorie_check;
alter table public.objekt_dokumente add constraint objekt_dokumente_kategorie_check check (
  kategorie in ('versicherung', 'vertrag', 'protokoll', 'grundbuch', 'sonstiges')
);

create index if not exists objekt_dokumente_objekt_idx
  on public.objekt_dokumente (kunde_objekt_id, ablauf_datum);

-- ---------------------------------------------------------------------------
-- 5) Fremd-Vorgänge (extern, keine Bärenwald-KPIs)
-- ---------------------------------------------------------------------------
create table if not exists public.fremd_vorgaenge (
  id uuid primary key default gen_random_uuid(),
  kunde_id uuid not null references public.kunden(id) on delete cascade,
  kunde_objekt_id uuid not null references public.kunden_objekte(id) on delete cascade,
  titel text not null,
  datum date not null default current_date,
  kategorie text not null default 'sonstiges',
  betrag numeric(12,2),
  dokument_url text,
  notiz text,
  quelle text not null default 'extern',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fremd_vorgaenge_objekt_idx
  on public.fremd_vorgaenge (kunde_objekt_id, datum desc);

-- ---------------------------------------------------------------------------
-- 6) ICS-Kalender-Feed (token-gesichert)
-- ---------------------------------------------------------------------------
create table if not exists public.hv_calendar_feeds (
  id uuid primary key default gen_random_uuid(),
  kunde_id uuid not null references public.kunden(id) on delete cascade,
  auth_user_id uuid not null,
  token_hash text not null,
  label text,
  aktiv boolean not null default true,
  created_at timestamptz not null default now(),
  unique (kunde_id, auth_user_id)
);

create index if not exists hv_calendar_feeds_hash_idx
  on public.hv_calendar_feeds (token_hash)
  where aktiv = true;

-- ---------------------------------------------------------------------------
-- Views: Kalender-Events + Objekt-Historie
-- ---------------------------------------------------------------------------
create or replace view public.v_hv_kalender_events as
-- Wiedervorlagen
select
  n.kunde_id,
  coalesce(n.kunde_objekt_id, l.kunde_objekt_id) as kunde_objekt_id,
  n.wiedervorlage_am::timestamptz as event_beginn,
  null::timestamptz as event_ende,
  'wiedervorlage'::text as event_typ,
  left(n.text, 80) as titel,
  n.id as quelle_id
from public.akten_notizen n
left join public.leads l on l.id = n.lead_id
where n.erledigt_am is null and n.wiedervorlage_am is not null

union all

-- Prüfpflichten
select
  o.kunde_id,
  p.kunde_objekt_id,
  p.naechste_faellig::timestamptz,
  null::timestamptz,
  'pruefpflicht'::text,
  p.typ,
  p.id
from public.objekt_pruefpflichten p
join public.kunden_objekte o on o.id = p.kunde_objekt_id
where p.status = 'aktiv' and p.naechste_faellig is not null

union all

-- Dokument-Ablauf + Erinnerungen (60/30 Tage vorher)
select
  d.kunde_id,
  d.kunde_objekt_id,
  (d.ablauf_datum - (t.tag || ' days')::interval)::timestamptz,
  null::timestamptz,
  'dokument_erinnerung'::text,
  d.titel || ' (' || t.tag || ' Tage)',
  d.id
from public.objekt_dokumente d
cross join lateral (
  select unnest(d.erinnerung_tage) as tag
) t
where d.status = 'aktiv' and d.ablauf_datum is not null

union all

-- Abo: Start / Ende / Kündigung
select
  a.kunde_id,
  a.kunde_objekt_id,
  a.start_am::timestamptz,
  null::timestamptz,
  'abo_start'::text,
  a.produkt_slug,
  a.id
from public.objekt_abos a
where a.status in ('aktiv', 'gekuendigt')

union all

select
  a.kunde_id,
  a.kunde_objekt_id,
  a.end_am::timestamptz,
  null::timestamptz,
  'abo_ende'::text,
  a.produkt_slug,
  a.id
from public.objekt_abos a
where a.end_am is not null;

-- ---------------------------------------------------------------------------
-- RLS Helper: HV darf schreiben (nicht rolle=lesen)
-- ---------------------------------------------------------------------------
create or replace function public.portal_org_can_write()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.portal_org_mitglied_rolle(), 'admin')
    in ('admin', 'sachbearbeiter');
$$;

grant execute on function public.portal_org_can_write() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- RLS: objekt_kontakte
-- ---------------------------------------------------------------------------
alter table public.objekt_kontakte enable row level security;

drop policy if exists objekt_kontakte_org_select on public.objekt_kontakte;
create policy objekt_kontakte_org_select on public.objekt_kontakte
  for select to authenticated
  using (kunde_id = public.portal_kunde_id());

drop policy if exists objekt_kontakte_org_write on public.objekt_kontakte;
create policy objekt_kontakte_org_write on public.objekt_kontakte
  for all to authenticated
  using (kunde_id = public.portal_kunde_id() and public.portal_org_can_write())
  with check (kunde_id = public.portal_kunde_id() and public.portal_org_can_write());

drop policy if exists objekt_kontakte_crm on public.objekt_kontakte;
create policy objekt_kontakte_crm on public.objekt_kontakte
  for all to authenticated
  using (public.is_crm_staff())
  with check (public.is_crm_staff());

drop policy if exists objekt_kontakte_service on public.objekt_kontakte;
create policy objekt_kontakte_service on public.objekt_kontakte
  for all to service_role using (true) with check (true);

-- ---------------------------------------------------------------------------
-- RLS: einheit_bewohner
-- ---------------------------------------------------------------------------
alter table public.einheit_bewohner enable row level security;

drop policy if exists einheit_bewohner_org_select on public.einheit_bewohner;
create policy einheit_bewohner_org_select on public.einheit_bewohner
  for select to authenticated
  using (kunde_id = public.portal_kunde_id());

drop policy if exists einheit_bewohner_org_write on public.einheit_bewohner;
create policy einheit_bewohner_org_write on public.einheit_bewohner
  for all to authenticated
  using (kunde_id = public.portal_kunde_id() and public.portal_org_can_write())
  with check (kunde_id = public.portal_kunde_id() and public.portal_org_can_write());

drop policy if exists einheit_bewohner_crm on public.einheit_bewohner;
create policy einheit_bewohner_crm on public.einheit_bewohner
  for all to authenticated
  using (public.is_crm_staff())
  with check (public.is_crm_staff());

drop policy if exists einheit_bewohner_service on public.einheit_bewohner;
create policy einheit_bewohner_service on public.einheit_bewohner
  for all to service_role using (true) with check (true);

-- ---------------------------------------------------------------------------
-- RLS: akten_notizen, objekt_dokumente, fremd_vorgaenge (HV write, CRM read)
-- ---------------------------------------------------------------------------
alter table public.akten_notizen enable row level security;
alter table public.objekt_dokumente enable row level security;
alter table public.fremd_vorgaenge enable row level security;

drop policy if exists akten_notizen_org_select on public.akten_notizen;
create policy akten_notizen_org_select on public.akten_notizen
  for select to authenticated using (kunde_id = public.portal_kunde_id());

drop policy if exists akten_notizen_org_write on public.akten_notizen;
create policy akten_notizen_org_write on public.akten_notizen
  for all to authenticated
  using (kunde_id = public.portal_kunde_id() and public.portal_org_can_write())
  with check (kunde_id = public.portal_kunde_id() and public.portal_org_can_write());

drop policy if exists akten_notizen_crm_select on public.akten_notizen;
create policy akten_notizen_crm_select on public.akten_notizen
  for select to authenticated using (public.is_crm_staff());

drop policy if exists akten_notizen_service on public.akten_notizen;
create policy akten_notizen_service on public.akten_notizen
  for all to service_role using (true) with check (true);

drop policy if exists objekt_dokumente_org_select on public.objekt_dokumente;
create policy objekt_dokumente_org_select on public.objekt_dokumente
  for select to authenticated using (kunde_id = public.portal_kunde_id());

drop policy if exists objekt_dokumente_org_write on public.objekt_dokumente;
create policy objekt_dokumente_org_write on public.objekt_dokumente
  for all to authenticated
  using (kunde_id = public.portal_kunde_id() and public.portal_org_can_write())
  with check (kunde_id = public.portal_kunde_id() and public.portal_org_can_write());

drop policy if exists objekt_dokumente_crm_select on public.objekt_dokumente;
create policy objekt_dokumente_crm_select on public.objekt_dokumente
  for select to authenticated using (public.is_crm_staff());

drop policy if exists objekt_dokumente_service on public.objekt_dokumente;
create policy objekt_dokumente_service on public.objekt_dokumente
  for all to service_role using (true) with check (true);

drop policy if exists fremd_vorgaenge_org_select on public.fremd_vorgaenge;
create policy fremd_vorgaenge_org_select on public.fremd_vorgaenge
  for select to authenticated using (kunde_id = public.portal_kunde_id());

drop policy if exists fremd_vorgaenge_org_write on public.fremd_vorgaenge;
create policy fremd_vorgaenge_org_write on public.fremd_vorgaenge
  for all to authenticated
  using (kunde_id = public.portal_kunde_id() and public.portal_org_can_write())
  with check (kunde_id = public.portal_kunde_id() and public.portal_org_can_write());

drop policy if exists fremd_vorgaenge_crm_select on public.fremd_vorgaenge;
create policy fremd_vorgaenge_crm_select on public.fremd_vorgaenge
  for select to authenticated using (public.is_crm_staff());

drop policy if exists fremd_vorgaenge_service on public.fremd_vorgaenge;
create policy fremd_vorgaenge_service on public.fremd_vorgaenge
  for all to service_role using (true) with check (true);

-- ---------------------------------------------------------------------------
-- RLS: hv_calendar_feeds
-- ---------------------------------------------------------------------------
alter table public.hv_calendar_feeds enable row level security;

drop policy if exists hv_calendar_feeds_org on public.hv_calendar_feeds;
create policy hv_calendar_feeds_org on public.hv_calendar_feeds
  for all to authenticated
  using (kunde_id = public.portal_kunde_id() and auth_user_id = auth.uid())
  with check (kunde_id = public.portal_kunde_id() and auth_user_id = auth.uid());

drop policy if exists hv_calendar_feeds_service on public.hv_calendar_feeds;
create policy hv_calendar_feeds_service on public.hv_calendar_feeds
  for all to service_role using (true) with check (true);
