-- Kunden: Stammdaten + Statistik-Felder
alter table public.kunden
  add column if not exists ansprechpartner text;

alter table public.kunden
  add column if not exists webseite text;

alter table public.kunden
  add column if not exists geburtstag date;

alter table public.kunden
  add column if not exists kundennummer text;

create unique index if not exists kunden_kundennummer_unique
  on public.kunden (kundennummer)
  where kundennummer is not null;

alter table public.kunden
  add column if not exists quelle text;

comment on column public.kunden.quelle is 'website | empfehlung | telefon | social | sonstiges';

alter table public.kunden
  add column if not exists gesamt_umsatz numeric(12, 2) not null default 0;

alter table public.kunden
  add column if not exists letzte_aktivitaet timestamptz;

alter table public.kunden
  add column if not exists updated_at timestamptz not null default now();

-- Auto-Kundennummer (jährliche Sequenz per Zählung — ausreichend für übliche Last)
create or replace function public.generate_kundennummer ()
returns text
language plpgsql
as $$
declare
  jahr text;
  laufend int;
begin
  jahr := to_char (now(), 'YYYY');
  select count(*) + 1 into laufend
  from public.kunden
  where kundennummer like 'KD-' || jahr || '-%';
  return 'KD-' || jahr || '-' || lpad(laufend::text, 4, '0');
end;
$$;

create or replace function public.set_kundennummer ()
returns trigger
language plpgsql
as $$
begin
  if new.kundennummer is null then
    new.kundennummer := public.generate_kundennummer ();
  end if;
  return new;
end;
$$;

drop trigger if exists kunden_kundennummer_trigger on public.kunden;

create trigger kunden_kundennummer_trigger
before insert on public.kunden
for each row
execute function public.set_kundennummer ();

-- Bestehende Datensätze ohne Nummer nachtragen
do $$
declare
  r record;
  n int := 1;
  j text := to_char (now(), 'YYYY');
begin
  for r in
    select id
    from public.kunden
    where kundennummer is null
    order by created_at asc
  loop
    update public.kunden
    set kundennummer = 'KD-' || j || '-' || lpad(n::text, 4, '0')
    where id = r.id;
    n := n + 1;
  end loop;
end;
$$;

-- Kunden-Notizen
create table if not exists public.kunden_notizen (
  id uuid primary key default gen_random_uuid (),
  kunde_id uuid not null references public.kunden (id) on delete cascade,
  inhalt text not null,
  erstellt_von uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.kunden_notizen enable row level security;

drop policy if exists "kunden_notizen_auth_all" on public.kunden_notizen;

create policy "kunden_notizen_auth_all"
  on public.kunden_notizen for all
  using (auth.role () = 'authenticated')
  with check (auth.role () = 'authenticated');

-- Kunden-Dokumente (Upload-Metadaten)
create table if not exists public.kunden_dokumente (
  id uuid primary key default gen_random_uuid (),
  kunde_id uuid not null references public.kunden (id) on delete cascade,
  name text not null,
  typ text not null,
  datei_url text,
  groesse_bytes int,
  erstellt_von uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on column public.kunden_dokumente.typ is 'angebot | rechnung | protokoll | sonstiges';

alter table public.kunden_dokumente enable row level security;

drop policy if exists "kunden_dokumente_auth_all" on public.kunden_dokumente;

create policy "kunden_dokumente_auth_all"
  on public.kunden_dokumente for all
  using (auth.role () = 'authenticated')
  with check (auth.role () = 'authenticated');

-- Optional: E-Mail-Log später nach Kunde filterbar
alter table public.email_logs
  add column if not exists kunde_id uuid references public.kunden (id) on delete set null;

create index if not exists email_logs_kunde_idx on public.email_logs (kunde_id);

create index if not exists kunden_name_idx on public.kunden (name);

create index if not exists kunden_email_idx on public.kunden (email);

create index if not exists kunden_telefon_idx on public.kunden (telefon);

create index if not exists kunden_notizen_kunde_idx on public.kunden_notizen (kunde_id);
