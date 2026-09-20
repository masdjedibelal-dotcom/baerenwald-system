-- Phase B N3 — kanonische Glocken-Tabelle (CRM + alle Portal-Rollen)
-- Freigabe Belal: docs/BENACHRICHTIGUNGEN-INVENTUR.md §7 / N1–N6
--
-- Partner-Alt-Tabelle hieß bereits `notifications` → Umbenennung zu
-- `partner_notifications` (auslaufen, nicht löschen). Code-Adapter folgt
-- nach Staging-Test (STOPP).

-- ---------------------------------------------------------------------------
-- 1) Partner-Legacy umbenennen (falls noch alter Name)
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'notifications'
  )
  and exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'notifications'
      and column_name = 'handwerker_id'
  )
  and not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'partner_notifications'
  ) then
    alter table public.notifications rename to partner_notifications;
  end if;
end $$;

-- Indizes / Constraints umbenennen (idempotent)
alter index if exists notifications_handwerker_unread_idx
  rename to partner_notifications_handwerker_unread_idx;

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'notifications_typ_check'
      and conrelid = 'public.partner_notifications'::regclass
  ) then
    alter table public.partner_notifications
      rename constraint notifications_typ_check to partner_notifications_typ_check;
  end if;
exception
  when undefined_table then null;
  when undefined_object then null;
end $$;

drop policy if exists "notifications_portal_select" on public.partner_notifications;
drop policy if exists "notifications_portal_update" on public.partner_notifications;
drop policy if exists "notifications_crm_staff_all" on public.partner_notifications;

do $$
begin
  if to_regclass('public.partner_notifications') is not null then
    execute $p$
      create policy partner_notifications_portal_select
        on public.partner_notifications for select to authenticated
        using (handwerker_id = public.portal_handwerker_id())
    $p$;
    execute $p$
      create policy partner_notifications_portal_update
        on public.partner_notifications for update to authenticated
        using (handwerker_id = public.portal_handwerker_id())
        with check (handwerker_id = public.portal_handwerker_id())
    $p$;
    execute $p$
      create policy partner_notifications_crm_staff_all
        on public.partner_notifications for all to authenticated
        using (public.is_crm_staff())
        with check (public.is_crm_staff())
    $p$;
    execute $p$
      comment on table public.partner_notifications is
        'LEGACY Partner-Glocke (handwerker_id). Auslaufen nach Cutover auf public.notifications; Adapter liest weiter.'
    $p$;
  end if;
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- 2) Kanonische Tabelle
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  empfaenger_id uuid not null references auth.users (id) on delete cascade,
  rolle text not null,
  org_id uuid references public.kunden (id) on delete set null,
  ereignis_id text not null,
  vorgang_ref text,
  titel text not null,
  text text not null default '',
  link text,
  gelesen_am timestamptz,
  erstellt_am timestamptz not null default now(),
  constraint notifications_rolle_check check (
    rolle in (
      'staff',
      'kunde',
      'hv',
      'partner',
      'hm',
      'mieter',
      'eigentuemer'
    )
  )
);

create index if not exists notifications_empfaenger_unread_idx
  on public.notifications (empfaenger_id, erstellt_am desc)
  where gelesen_am is null;

create index if not exists notifications_empfaenger_created_idx
  on public.notifications (empfaenger_id, erstellt_am desc);

create index if not exists notifications_org_idx
  on public.notifications (org_id, erstellt_am desc)
  where org_id is not null;

create index if not exists notifications_ereignis_idx
  on public.notifications (ereignis_id, erstellt_am desc);

create index if not exists notifications_vorgang_idx
  on public.notifications (vorgang_ref)
  where vorgang_ref is not null;

comment on table public.notifications is
  'Phase B N3: gemeinsame Glocke CRM + Portal-Rollen. Writers: notify()-Dienst / service_role.';

comment on column public.notifications.empfaenger_id is
  'auth.users.id des Empfängers (Staff, Portal-User, Partner-Auth).';

comment on column public.notifications.rolle is
  'Empfänger-Rolle: staff | kunde | hv | partner | hm | mieter | eigentuemer';

comment on column public.notifications.org_id is
  'Optional: HV-/Org-Kunde (kunden.id) für Org-Kontext.';

comment on column public.notifications.ereignis_id is
  'Katalog-ID z. B. anfrage.neu, zuweisung.aenderung (Punkt-Notation).';

comment on column public.notifications.text is
  'Nachrichtenkörper (Freigabe-Feld „text“).';

comment on column public.notifications.gelesen_am is
  'NULL = ungelesen.';

-- ---------------------------------------------------------------------------
-- 3) RLS — nur eigene Zeilen (Empfänger); Staff darf CRM-Inbox lesen/schreiben
-- ---------------------------------------------------------------------------
alter table public.notifications enable row level security;

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own
  on public.notifications for select to authenticated
  using (
    empfaenger_id = auth.uid()
    or public.is_crm_staff()
  );

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own
  on public.notifications for update to authenticated
  using (
    empfaenger_id = auth.uid()
    or public.is_crm_staff()
  )
  with check (
    empfaenger_id = auth.uid()
    or public.is_crm_staff()
  );

-- Inserts: CRM-Staff + Service-Role (Portal/CRM notify-Dienst)
drop policy if exists notifications_insert_staff on public.notifications;
create policy notifications_insert_staff
  on public.notifications for insert to authenticated
  with check (public.is_crm_staff());

drop policy if exists notifications_service on public.notifications;
create policy notifications_service
  on public.notifications for all to service_role
  using (true)
  with check (true);

grant select, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
