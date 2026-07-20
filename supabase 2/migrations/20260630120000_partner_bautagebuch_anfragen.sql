-- Partner-Portal: CRM kann Tagebucheintrag beim Handwerker anfordern

create table if not exists public.partner_bautagebuch_anfragen (
  id uuid primary key default gen_random_uuid(),
  auftrag_id uuid not null references public.auftraege (id) on delete cascade,
  handwerker_id uuid not null references public.handwerker (id) on delete cascade,
  notiz text,
  erledigt_at timestamptz,
  created_at timestamptz not null default now(),
  angefordert_von uuid references auth.users (id) on delete set null
);

create index if not exists partner_bautagebuch_anfragen_hw_idx
  on public.partner_bautagebuch_anfragen (handwerker_id, erledigt_at, created_at desc);

create unique index if not exists partner_bautagebuch_anfragen_offen_uq
  on public.partner_bautagebuch_anfragen (auftrag_id, handwerker_id)
  where erledigt_at is null;

comment on table public.partner_bautagebuch_anfragen is
  'Offene Aufforderung vom CRM: Handwerker soll Bautagebuch-Eintrag im Partner-Portal erstellen.';

alter table public.partner_bautagebuch_anfragen enable row level security;

drop policy if exists "partner_bautagebuch_anfragen_crm_staff_all" on public.partner_bautagebuch_anfragen;
create policy "partner_bautagebuch_anfragen_crm_staff_all"
  on public.partner_bautagebuch_anfragen for all to authenticated
  using (public.is_crm_staff())
  with check (public.is_crm_staff());

drop policy if exists "partner_bautagebuch_anfragen_portal_select_own" on public.partner_bautagebuch_anfragen;
create policy "partner_bautagebuch_anfragen_portal_select_own"
  on public.partner_bautagebuch_anfragen for select to authenticated
  using (
    public.is_portal_handwerker()
    and handwerker_id = public.portal_handwerker_id()
  );

drop policy if exists "partner_bautagebuch_anfragen_portal_update_own" on public.partner_bautagebuch_anfragen;
create policy "partner_bautagebuch_anfragen_portal_update_own"
  on public.partner_bautagebuch_anfragen for update to authenticated
  using (
    public.is_portal_handwerker()
    and handwerker_id = public.portal_handwerker_id()
  )
  with check (
    public.is_portal_handwerker()
    and handwerker_id = public.portal_handwerker_id()
  );
