-- Partner meldet neue Position / Nachtragsbedarf (groß)
-- Klein: weiterhin auftrag_positionen typ=regie + anerkennung_status=in_pruefung

create table if not exists public.partner_positions_anfragen (
  id uuid primary key default gen_random_uuid(),
  auftrag_id uuid not null references public.auftraege (id) on delete cascade,
  handwerker_id uuid not null references public.handwerker (id) on delete cascade,
  titel text not null,
  begruendung text,
  schaetzung_eur numeric(12, 2),
  schaetzung_minuten integer,
  status text not null default 'offen'
    check (status in ('offen', 'intern', 'nachtrag', 'abgelehnt')),
  position_id uuid references public.auftrag_positionen (id) on delete set null,
  nachtrag_id uuid,
  crm_notiz text,
  decided_at timestamptz,
  decided_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists partner_positions_anfragen_auftrag_idx
  on public.partner_positions_anfragen (auftrag_id, status);

create index if not exists partner_positions_anfragen_offen_idx
  on public.partner_positions_anfragen (created_at desc)
  where status = 'offen';

comment on table public.partner_positions_anfragen is
  'Partner meldet Mehrbedarf/neue Position — CRM entscheidet intern | Nachtrag | Ablehnung.';

alter table public.partner_positions_anfragen enable row level security;

drop policy if exists "partner_positions_anfragen_crm_staff_all" on public.partner_positions_anfragen;
create policy "partner_positions_anfragen_crm_staff_all"
  on public.partner_positions_anfragen for all to authenticated
  using (public.is_crm_staff())
  with check (public.is_crm_staff());

drop policy if exists "partner_positions_anfragen_portal_select_own" on public.partner_positions_anfragen;
create policy "partner_positions_anfragen_portal_select_own"
  on public.partner_positions_anfragen for select to authenticated
  using (
    public.is_portal_handwerker()
    and handwerker_id = public.portal_handwerker_id()
  );

drop policy if exists "partner_positions_anfragen_portal_insert_own" on public.partner_positions_anfragen;
create policy "partner_positions_anfragen_portal_insert_own"
  on public.partner_positions_anfragen for insert to authenticated
  with check (
    public.is_portal_handwerker()
    and handwerker_id = public.portal_handwerker_id()
  );
