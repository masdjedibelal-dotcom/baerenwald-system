-- Hausmeister-Befund: Statuswerte + lead_befunde (1:1 Lead) + Punkte

-- ---------------------------------------------------------------------------
-- 1) hv_meldung_status erweitern
-- ---------------------------------------------------------------------------
alter table public.leads drop constraint if exists leads_hv_meldung_status_check;
alter table public.leads add constraint leads_hv_meldung_status_check check (
  hv_meldung_status is null
  or hv_meldung_status in (
    'neu',
    'notmassnahme',
    'angebot_eingefordert',
    'kleinreparatur',
    'abgelehnt',
    'abgeschlossen',
    'hm_pruefung',
    'hm_erledigt'
  )
);

comment on column public.leads.hv_meldung_status is
  'HV-Meldungs-Workflow: neu | notmassnahme | angebot_eingefordert | kleinreparatur | abgelehnt | abgeschlossen | hm_pruefung | hm_erledigt';

-- ---------------------------------------------------------------------------
-- 2) Befund-Kopf (1:1 Lead)
-- ---------------------------------------------------------------------------
create table if not exists public.lead_befunde (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  durchgefuehrt_von text not null default '',
  durchgefuehrt_am date not null default (current_date),
  ergebnis text,
  melde_kategorie text,
  vorlage_key text,
  objekt_kontakt_id uuid references public.objekt_kontakte(id) on delete set null,
  created_by_kunde_id uuid references public.kunden(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  abgeschlossen_at timestamptz,
  constraint lead_befunde_ergebnis_check check (
    ergebnis is null
    or ergebnis in ('selbst_erledigt', 'fachfirma_angebot', 'fachfirma_akut')
  )
);

create unique index if not exists lead_befunde_lead_id_uidx
  on public.lead_befunde (lead_id);

create index if not exists lead_befunde_ergebnis_idx
  on public.lead_befunde (ergebnis);

comment on table public.lead_befunde is
  'Hausmeister-Vorbefund am Lead (1:1). Vorlage materialisiert als lead_befund_punkte.';

comment on column public.lead_befunde.vorlage_key is
  'Snapshot des Vorlagen-Keys bei Instanziierung (wasser_leckage, abfluss, …).';

comment on column public.lead_befunde.ergebnis is
  'selbst_erledigt | fachfirma_angebot | fachfirma_akut — null = Entwurf/Prüfung läuft';

-- ---------------------------------------------------------------------------
-- 3) Befund-Punkte
-- ---------------------------------------------------------------------------
create table if not exists public.lead_befund_punkte (
  id uuid primary key default gen_random_uuid(),
  befund_id uuid not null references public.lead_befunde(id) on delete cascade,
  sort_order int not null default 0,
  titel text not null,
  quelle text not null,
  vorlage_key text,
  status text,
  notiz text not null default '',
  foto_refs jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lead_befund_punkte_quelle_check check (quelle in ('system', 'frei')),
  constraint lead_befund_punkte_status_check check (
    status is null
    or status in ('unauffaellig', 'auffaellig', 'nicht_pruefbar')
  )
);

create index if not exists lead_befund_punkte_befund_idx
  on public.lead_befund_punkte (befund_id, sort_order);

comment on column public.lead_befund_punkte.vorlage_key is
  'Stabiler Punkt-Key aus Vorlage (basis_*, wl_*, …); null bei Freipunkten.';

comment on column public.lead_befund_punkte.foto_refs is
  'JSON-Array von Storage-Paths oder URLs.';

-- ---------------------------------------------------------------------------
-- 4) RLS — Org (über Lead-Auftraggeber) + CRM + service_role
-- ---------------------------------------------------------------------------
alter table public.lead_befunde enable row level security;
alter table public.lead_befund_punkte enable row level security;

-- lead_befunde: Org sieht/schreibt Befunde eigener Leads
drop policy if exists lead_befunde_org_select on public.lead_befunde;
create policy lead_befunde_org_select on public.lead_befunde
  for select to authenticated
  using (
    exists (
      select 1 from public.leads l
      where l.id = lead_id
        and l.auftraggeber_kunde_id = public.portal_kunde_id()
    )
  );

drop policy if exists lead_befunde_org_write on public.lead_befunde;
create policy lead_befunde_org_write on public.lead_befunde
  for all to authenticated
  using (
    public.portal_org_can_write()
    and exists (
      select 1 from public.leads l
      where l.id = lead_id
        and l.auftraggeber_kunde_id = public.portal_kunde_id()
    )
  )
  with check (
    public.portal_org_can_write()
    and exists (
      select 1 from public.leads l
      where l.id = lead_id
        and l.auftraggeber_kunde_id = public.portal_kunde_id()
    )
  );

drop policy if exists lead_befunde_crm on public.lead_befunde;
create policy lead_befunde_crm on public.lead_befunde
  for all to authenticated
  using (public.is_crm_staff())
  with check (public.is_crm_staff());

drop policy if exists lead_befunde_service on public.lead_befunde;
create policy lead_befunde_service on public.lead_befunde
  for all to service_role using (true) with check (true);

-- lead_befund_punkte: über Parent-Befund → Lead → Org
drop policy if exists lead_befund_punkte_org_select on public.lead_befund_punkte;
create policy lead_befund_punkte_org_select on public.lead_befund_punkte
  for select to authenticated
  using (
    exists (
      select 1
      from public.lead_befunde b
      join public.leads l on l.id = b.lead_id
      where b.id = befund_id
        and l.auftraggeber_kunde_id = public.portal_kunde_id()
    )
  );

drop policy if exists lead_befund_punkte_org_write on public.lead_befund_punkte;
create policy lead_befund_punkte_org_write on public.lead_befund_punkte
  for all to authenticated
  using (
    public.portal_org_can_write()
    and exists (
      select 1
      from public.lead_befunde b
      join public.leads l on l.id = b.lead_id
      where b.id = befund_id
        and l.auftraggeber_kunde_id = public.portal_kunde_id()
    )
  )
  with check (
    public.portal_org_can_write()
    and exists (
      select 1
      from public.lead_befunde b
      join public.leads l on l.id = b.lead_id
      where b.id = befund_id
        and l.auftraggeber_kunde_id = public.portal_kunde_id()
    )
  );

drop policy if exists lead_befund_punkte_crm on public.lead_befund_punkte;
create policy lead_befund_punkte_crm on public.lead_befund_punkte
  for all to authenticated
  using (public.is_crm_staff())
  with check (public.is_crm_staff());

drop policy if exists lead_befund_punkte_service on public.lead_befund_punkte;
create policy lead_befund_punkte_service on public.lead_befund_punkte
  for all to service_role using (true) with check (true);
