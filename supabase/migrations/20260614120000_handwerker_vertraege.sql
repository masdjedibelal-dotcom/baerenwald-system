-- Nachunternehmer- & Rahmenverträge (PDF in Storage, kein operatives CRM-Dokument)

create table if not exists public.handwerker_vertraege (
  id uuid primary key default gen_random_uuid(),
  typ text not null check (typ in ('projekt', 'rahmen')),
  vertrags_nr text not null,
  status text not null default 'entwurf',
  auftrag_id uuid references public.auftraege (id) on delete set null,
  handwerker_id uuid not null references public.handwerker (id) on delete restrict,
  gewerk_id uuid references public.gewerke (id) on delete set null,
  gewerk_name text,
  bauvorhaben text,
  leistungsumfang text,
  verguetung_text text,
  regiesatz_netto numeric(10, 2),
  einbehalt_prozent numeric(4, 2) not null default 5.00,
  zahlungsziel_tage int not null default 14,
  aufmass_rhythmus_tage int not null default 14,
  pdf_url text,
  signiert_am timestamptz,
  notizen text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vertrags_nr)
);

create index if not exists handwerker_vertraege_auftrag_idx on public.handwerker_vertraege (auftrag_id);
create index if not exists handwerker_vertraege_handwerker_idx on public.handwerker_vertraege (handwerker_id, typ);
create index if not exists handwerker_vertraege_typ_idx on public.handwerker_vertraege (typ, created_at desc);

comment on table public.handwerker_vertraege is 'Projekt-Nachunternehmerverträge und Partner-Rahmenverträge';
comment on column public.handwerker_vertraege.status is 'entwurf | pdf_erzeugt | unterschrieben';
comment on column public.handwerker_vertraege.typ is 'projekt = je Auftrag, rahmen = je Handwerker';

alter table public.handwerker_vertraege enable row level security;

drop policy if exists "handwerker_vertraege_auth_all" on public.handwerker_vertraege;
create policy "handwerker_vertraege_auth_all"
  on public.handwerker_vertraege for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Storage: vertraege-pdfs
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vertraege-pdfs',
  'vertraege-pdfs',
  true,
  15728640,
  array['application/pdf']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "vertraege_pdfs_public_read" on storage.objects;
create policy "vertraege_pdfs_public_read"
  on storage.objects for select to public
  using (bucket_id = 'vertraege-pdfs');

drop policy if exists "vertraege_pdfs_authenticated_insert" on storage.objects;
create policy "vertraege_pdfs_authenticated_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'vertraege-pdfs');

drop policy if exists "vertraege_pdfs_authenticated_update" on storage.objects;
create policy "vertraege_pdfs_authenticated_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'vertraege-pdfs');
