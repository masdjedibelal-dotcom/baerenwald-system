-- handwerker.updated_at fehlt im Basis-Schema (partner hat die Spalte bereits)
alter table public.handwerker
  add column if not exists updated_at timestamptz not null default now();

comment on column public.handwerker.updated_at is 'Letzte Stammdaten-Änderung';

-- Bestehende Zeilen: updated_at an created_at angleichen, falls vorhanden
update public.handwerker
set updated_at = coalesce(created_at, updated_at)
where created_at is not null;

create or replace function public.set_handwerker_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_handwerker_updated_at on public.handwerker;
create trigger trg_handwerker_updated_at
  before update on public.handwerker
  for each row
  execute function public.set_handwerker_updated_at();
