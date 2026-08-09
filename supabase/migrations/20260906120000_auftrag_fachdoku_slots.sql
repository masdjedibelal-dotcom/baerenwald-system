-- Spiegel: Fachdoku-Slots Stufe 1 (soft) — gleiche DB wie Portal.

create table if not exists public.auftrag_fachdoku_slots (
  id uuid primary key default gen_random_uuid(),
  auftrag_id uuid not null references public.auftraege (id) on delete cascade,
  slot_code text not null,
  label text not null,
  status text not null default 'offen'
    check (status in ('offen', 'erledigt')),
  datei_url text,
  datei_name text,
  uploaded_by_role text
    check (uploaded_by_role is null or uploaded_by_role in ('hw', 'crm')),
  uploaded_by_handwerker_id uuid references public.handwerker (id) on delete set null,
  uploaded_by_user_id uuid,
  erledigt_am timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (auftrag_id, slot_code)
);

create index if not exists auftrag_fachdoku_slots_auftrag_idx
  on public.auftrag_fachdoku_slots (auftrag_id);

create index if not exists auftrag_fachdoku_slots_offen_idx
  on public.auftrag_fachdoku_slots (auftrag_id)
  where status = 'offen';

comment on table public.auftrag_fachdoku_slots is
  'Fachnachweise (Mess-/Prüfprotokolle) je Auftrag — soft Hinweis, kein Abschluss-Gate';

alter table public.auftrag_fachdoku_slots enable row level security;

drop policy if exists "auftrag_fachdoku_slots_crm_staff_all" on public.auftrag_fachdoku_slots;
create policy "auftrag_fachdoku_slots_crm_staff_all"
  on public.auftrag_fachdoku_slots for all to authenticated
  using (public.is_crm_staff())
  with check (public.is_crm_staff());

drop policy if exists "auftrag_fachdoku_slots_portal_select" on public.auftrag_fachdoku_slots;
create policy "auftrag_fachdoku_slots_portal_select"
  on public.auftrag_fachdoku_slots for select to authenticated
  using (
    public.is_portal_handwerker()
    and exists (
      select 1 from public.auftrag_handwerker ah
      where ah.auftrag_id = auftrag_fachdoku_slots.auftrag_id
        and ah.handwerker_id = public.portal_handwerker_id()
    )
  );

drop policy if exists "auftrag_fachdoku_slots_portal_update" on public.auftrag_fachdoku_slots;
create policy "auftrag_fachdoku_slots_portal_update"
  on public.auftrag_fachdoku_slots for update to authenticated
  using (
    public.is_portal_handwerker()
    and exists (
      select 1 from public.auftrag_handwerker ah
      where ah.auftrag_id = auftrag_fachdoku_slots.auftrag_id
        and ah.handwerker_id = public.portal_handwerker_id()
    )
  )
  with check (
    public.is_portal_handwerker()
    and exists (
      select 1 from public.auftrag_handwerker ah
      where ah.auftrag_id = auftrag_fachdoku_slots.auftrag_id
        and ah.handwerker_id = public.portal_handwerker_id()
    )
  );

drop policy if exists "auftrag_fachdoku_slots_portal_insert" on public.auftrag_fachdoku_slots;
create policy "auftrag_fachdoku_slots_portal_insert"
  on public.auftrag_fachdoku_slots for insert to authenticated
  with check (
    public.is_crm_staff()
    or (
      public.is_portal_handwerker()
      and exists (
        select 1 from public.auftrag_handwerker ah
        where ah.auftrag_id = auftrag_fachdoku_slots.auftrag_id
          and ah.handwerker_id = public.portal_handwerker_id()
      )
    )
  );
