-- Ergänzungsvereinbarungen (Nachtrag) — manuell in Supabase ausführen
-- Entspricht: supabase/migrations/20260618120000_handwerker_vertraege_ergaenzung.sql

alter table public.handwerker_vertraege
  add column if not exists parent_vertrag_id uuid references public.handwerker_vertraege(id) on delete set null,
  add column if not exists dokument_art text not null default 'hauptvertrag',
  add column if not exists dokument_titel text,
  add column if not exists bezug_vertrag_vom text,
  add column if not exists bezug_vertrags_nr text,
  add column if not exists vertrag_vom text,
  add column if not exists nachtrag_positionen jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'handwerker_vertraege_dokument_art_check'
  ) then
    alter table public.handwerker_vertraege
      add constraint handwerker_vertraege_dokument_art_check
      check (dokument_art in ('hauptvertrag', 'ergaenzung'));
  end if;
end $$;

create index if not exists handwerker_vertraege_parent_vertrag_id_idx
  on public.handwerker_vertraege (parent_vertrag_id)
  where parent_vertrag_id is not null;

create index if not exists handwerker_vertraege_auftrag_dokument_art_idx
  on public.handwerker_vertraege (auftrag_id, dokument_art);
