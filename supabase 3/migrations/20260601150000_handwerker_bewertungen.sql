-- Handwerker-Bewertungen pro abgeschlossenem Auftrag (5 Kategorien à 1–5 Sterne)

alter table public.handwerker
  add column if not exists bewertung_gesamt numeric(3, 2),
  add column if not exists bewertung_qualitaet numeric(3, 2),
  add column if not exists bewertung_termintreue numeric(3, 2),
  add column if not exists bewertung_sauberkeit numeric(3, 2),
  add column if not exists bewertung_kommunikation numeric(3, 2),
  add column if not exists bewertung_preis_leistung numeric(3, 2),
  add column if not exists bewertung_anzahl integer not null default 0;

comment on column public.handwerker.bewertung_gesamt is 'Ø Gesamtbewertung (1–5) über alle Kategorien und Bewertungen';

create table if not exists public.handwerker_bewertungen (
  id uuid primary key default uuid_generate_v4(),
  handwerker_id uuid not null references public.handwerker (id) on delete cascade,
  auftrag_id uuid not null references public.auftraege (id) on delete cascade,
  gewerk_id uuid references public.gewerke (id) on delete set null,
  qualitaet smallint not null check (qualitaet between 1 and 5),
  termintreue smallint not null check (termintreue between 1 and 5),
  sauberkeit smallint not null check (sauberkeit between 1 and 5),
  kommunikation smallint not null check (kommunikation between 1 and 5),
  preis_leistung smallint not null check (preis_leistung between 1 and 5),
  notiz text,
  erstellt_von uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (handwerker_id, auftrag_id)
);

create index if not exists handwerker_bewertungen_hw_idx
  on public.handwerker_bewertungen (handwerker_id, created_at desc);

create index if not exists handwerker_bewertungen_auftrag_idx
  on public.handwerker_bewertungen (auftrag_id);

alter table public.handwerker_bewertungen enable row level security;

drop policy if exists "handwerker_bewertungen_auth_all" on public.handwerker_bewertungen;
create policy "handwerker_bewertungen_auth_all"
  on public.handwerker_bewertungen for all
  using (auth.role() = 'authenticated');

create or replace function public.recalc_handwerker_bewertungen(p_handwerker_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.handwerker h
  set
    bewertung_anzahl = coalesce(s.cnt, 0),
    bewertung_gesamt = s.avg_gesamt,
    bewertung_qualitaet = s.avg_qualitaet,
    bewertung_termintreue = s.avg_termintreue,
    bewertung_sauberkeit = s.avg_sauberkeit,
    bewertung_kommunikation = s.avg_kommunikation,
    bewertung_preis_leistung = s.avg_preis_leistung
  from (
    select
      count(*)::int as cnt,
      round(avg((qualitaet + termintreue + sauberkeit + kommunikation + preis_leistung)::numeric / 5.0), 2) as avg_gesamt,
      round(avg(qualitaet::numeric), 2) as avg_qualitaet,
      round(avg(termintreue::numeric), 2) as avg_termintreue,
      round(avg(sauberkeit::numeric), 2) as avg_sauberkeit,
      round(avg(kommunikation::numeric), 2) as avg_kommunikation,
      round(avg(preis_leistung::numeric), 2) as avg_preis_leistung
    from public.handwerker_bewertungen
    where handwerker_id = p_handwerker_id
  ) s
  where h.id = p_handwerker_id;
end;
$$;

create or replace function public.trg_handwerker_bewertungen_recalc()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  hw_id uuid;
begin
  hw_id := coalesce(new.handwerker_id, old.handwerker_id);
  perform public.recalc_handwerker_bewertungen(hw_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists handwerker_bewertungen_recalc on public.handwerker_bewertungen;
create trigger handwerker_bewertungen_recalc
  after insert or update or delete on public.handwerker_bewertungen
  for each row execute function public.trg_handwerker_bewertungen_recalc();

comment on table public.handwerker_bewertungen is 'Interne Handwerker-Bewertung nach Projektabschluss (5 Kategorien)';
