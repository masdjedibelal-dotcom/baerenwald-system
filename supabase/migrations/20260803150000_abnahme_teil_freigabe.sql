-- Teilabnahmen pro Handwerker + CRM-Freigabe vor Gesamtabnahme / Kundenversand

-- ── auftrag_abnahmeprotokolle ───────────────────────────────────────────────
alter table public.auftrag_abnahmeprotokolle
  add column if not exists handwerker_id uuid references public.handwerker(id) on delete set null,
  add column if not exists ebene text not null default 'gesamt',
  add column if not exists freigabe_status text not null default 'entwurf',
  add column if not exists freigegeben_at timestamptz,
  add column if not exists freigegeben_von uuid references auth.users(id) on delete set null,
  add column if not exists abgelehnt_at timestamptz,
  add column if not exists abgelehnt_von uuid references auth.users(id) on delete set null,
  add column if not exists ablehnung_notiz text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'auftrag_abnahmeprotokolle_ebene_check'
  ) then
    alter table public.auftrag_abnahmeprotokolle
      add constraint auftrag_abnahmeprotokolle_ebene_check
      check (ebene in ('handwerker', 'gesamt'));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'auftrag_abnahmeprotokolle_freigabe_status_check'
  ) then
    alter table public.auftrag_abnahmeprotokolle
      add constraint auftrag_abnahmeprotokolle_freigabe_status_check
      check (freigabe_status in ('entwurf', 'zur_freigabe', 'freigegeben', 'abgelehnt'));
  end if;
end $$;

comment on column public.auftrag_abnahmeprotokolle.handwerker_id is
  'Bei ebene=handwerker: Partner der Teilabnahme; bei gesamt null';
comment on column public.auftrag_abnahmeprotokolle.ebene is
  'handwerker = Teilabnahme eines Partners; gesamt = Gesamtabnahme-Dokument';
comment on column public.auftrag_abnahmeprotokolle.freigabe_status is
  'CRM-Freigabe: entwurf | zur_freigabe | freigegeben | abgelehnt';
comment on column public.auftrag_abnahmeprotokolle.an_kunde_gesendet_at is
  'Nur nach Freigabe / manuellem finalem Versand setzen — nicht bei Portal-Eingang';

-- Bestand: bisherige Protokolle gelten als Gesamtabnahme (ggf. schon freigegeben)
update public.auftrag_abnahmeprotokolle
set
  ebene = 'gesamt',
  freigabe_status = case
    when an_kunde_gesendet_at is not null or pdf_url is not null then 'freigegeben'
    else 'entwurf'
  end,
  freigegeben_at = case
    when an_kunde_gesendet_at is not null or pdf_url is not null
    then coalesce(an_kunde_gesendet_at, updated_at, created_at)
    else null
  end
where freigabe_status = 'entwurf'
  and handwerker_id is null;

create index if not exists auftrag_abnahmeprotokolle_hw_freigabe_idx
  on public.auftrag_abnahmeprotokolle (auftrag_id, handwerker_id, freigabe_status);

create index if not exists auftrag_abnahmeprotokolle_zur_freigabe_idx
  on public.auftrag_abnahmeprotokolle (freigabe_status, updated_at desc)
  where freigabe_status = 'zur_freigabe';

-- ── auftrag_handwerker: Signatur pro Partner (nicht global am Auftrag) ─────
alter table public.auftrag_handwerker
  add column if not exists abnahme_signiert_am timestamptz,
  add column if not exists abnahme_protokoll_id uuid
    references public.auftrag_abnahmeprotokolle(id) on delete set null;

comment on column public.auftrag_handwerker.abnahme_signiert_am is
  'Zeitpunkt der Partner-Teilabnahme / Signatur im Portal';
comment on column public.auftrag_handwerker.abnahme_protokoll_id is
  'Aktuelles Teilabnahme-Protokoll dieses Partners';
