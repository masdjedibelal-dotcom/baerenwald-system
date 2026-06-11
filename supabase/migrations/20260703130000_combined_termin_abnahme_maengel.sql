-- Kombiniertes Update (einmalig im Supabase SQL Editor ausführen)
-- 1) Lead-Status „termin“
-- 2) Backfill bestehende Leads mit offenem Besichtigungstermin
-- 3) Abnahme-Mängel ↔ Punch-List Verknüpfung
--
-- Reihenfolge beibehalten. Einzeln idempotent (mehrfach ausführbar).

-- ─── 1. Lead-Status „termin“ ───────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on e.enumtypid = t.oid
    where t.typname = 'lead_status'
      and e.enumlabel = 'termin'
  ) then
    alter type public.lead_status add value 'termin' after 'kontaktiert';
  end if;
end
$$;

-- ─── 2. Backfill: kontaktiert → termin bei offenem Besichtigungstermin ───
update public.leads l
set status = 'termin',
    updated_at = now()
where l.status = 'kontaktiert'
  and exists (
    select 1
    from public.kalender_termine kt
    where kt.lead_id = l.id
      and kt.typ = 'besichtigung'
      and coalesce(kt.erledigt, false) = false
  );

-- ─── 3. Abnahme-Mängel ↔ Punch-List ───────────────────────────────────────
alter table public.punch_list
  add column if not exists abnahme_punkt_id text,
  add column if not exists protokoll_id uuid references public.auftrag_abnahmeprotokolle (id) on delete set null;

create unique index if not exists punch_list_abnahme_punkt_uq
  on public.punch_list (auftrag_id, abnahme_punkt_id)
  where abnahme_punkt_id is not null;

alter table public.auftrag_abnahmeprotokolle
  add column if not exists protokoll_typ text not null default 'erstabnahme';

comment on column public.punch_list.abnahme_punkt_id is
  'Verknüpfung zum Checklisten-Punkt im Abnahmeprotokoll (JSON punkt_id).';
comment on column public.auftrag_abnahmeprotokolle.protokoll_typ is
  'erstabnahme | nachabnahme | schlussabnahme';
