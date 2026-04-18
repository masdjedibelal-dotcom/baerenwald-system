-- Einbehalte, Bürgschaften, Eingangsrechnungen + Storage-Buckets (privat)

-- ─── Einbehalte je Handwercher ───
create table if not exists public.einbehalte (
  id uuid primary key default gen_random_uuid(),
  auftrag_id uuid not null references public.auftraege (id) on delete cascade,
  handwerker_id uuid not null references public.handwerker (id) on delete restrict,
  rechnung_brutto numeric(10, 2) not null,
  einbehalt_prozent numeric(4, 2) not null default 5.00,
  einbehalt_betrag numeric(10, 2) not null,
  bezahlt_betrag numeric(10, 2) not null,
  status text not null default 'einbehalten',
  freigabe_datum date not null,
  freigegeben_at timestamptz,
  notizen text,
  freigabe_reminder_30_sent_at timestamptz,
  freigabe_reminder_7_sent_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.einbehalte is 'Sicherheitseinbehalt je Handwercher-Rechnung (Gewährleistung)';
comment on column public.einbehalte.status is 'einbehalten | buergschaft | freigegeben';
comment on column public.einbehalte.bezahlt_betrag is 'Ausgezahlt an Handwercher (Brutto minus Einbehalt)';

create index if not exists einbehalte_auftrag_idx on public.einbehalte (auftrag_id);
create index if not exists einbehalte_freigabe_idx on public.einbehalte (freigabe_datum);

alter table public.einbehalte enable row level security;

drop policy if exists "einbehalte_auth_all" on public.einbehalte;
create policy "einbehalte_auth_all"
  on public.einbehalte for all
  using (auth.role () = 'authenticated')
  with check (auth.role () = 'authenticated');

-- ─── Bürgschaften ───
create table if not exists public.buergschaften (
  id uuid primary key default gen_random_uuid(),
  einbehalt_id uuid not null references public.einbehalte (id) on delete cascade,
  handwerker_id uuid not null references public.handwerker (id) on delete restrict,
  urkunden_nummer text not null,
  bank text,
  betrag numeric(10, 2) not null,
  gueltig_bis date not null,
  dokument_url text,
  ablauf_reminder_60_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists buergschaften_einbehalt_idx on public.buergschaften (einbehalt_id);

alter table public.buergschaften enable row level security;

drop policy if exists "buergschaften_auth_all" on public.buergschaften;
create policy "buergschaften_auth_all"
  on public.buergschaften for all
  using (auth.role () = 'authenticated')
  with check (auth.role () = 'authenticated');

-- ─── Eingangsrechnungen ───
create table if not exists public.eingangsrechnungen (
  id uuid primary key default gen_random_uuid(),
  auftrag_id uuid not null references public.auftraege (id) on delete cascade,
  lieferant text not null,
  beschreibung text,
  kategorie text not null default 'material',
  betrag_netto numeric(10, 2) not null,
  mwst_satz numeric(4, 2) not null default 19.00,
  betrag_brutto numeric(10, 2) not null,
  rechnungsdatum date,
  faellig_am date,
  bezahlt boolean not null default false,
  bezahlt_am date,
  beleg_url text,
  notizen text,
  erstellt_von uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on column public.eingangsrechnungen.kategorie is 'material | lohn | geraete | entsorgung | sonstiges';

create index if not exists eingangsrechnungen_auftrag_idx on public.eingangsrechnungen (auftrag_id);

alter table public.eingangsrechnungen enable row level security;

drop policy if exists "eingangsrechnungen_auth_all" on public.eingangsrechnungen;
create policy "eingangsrechnungen_auth_all"
  on public.eingangsrechnungen for all
  using (auth.role () = 'authenticated')
  with check (auth.role () = 'authenticated');

-- ─── Storage: eingangsrechnungen ───
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'eingangsrechnungen',
  'eingangsrechnungen',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "eingangsrechnungen_objects_read" on storage.objects;
create policy "eingangsrechnungen_objects_read"
  on storage.objects for select to authenticated
  using (bucket_id = 'eingangsrechnungen');

drop policy if exists "eingangsrechnungen_objects_insert" on storage.objects;
create policy "eingangsrechnungen_objects_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'eingangsrechnungen');

drop policy if exists "eingangsrechnungen_objects_update" on storage.objects;
create policy "eingangsrechnungen_objects_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'eingangsrechnungen');

drop policy if exists "eingangsrechnungen_objects_delete" on storage.objects;
create policy "eingangsrechnungen_objects_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'eingangsrechnungen');

-- ─── Storage: buergschaften ───
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'buergschaften',
  'buergschaften',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "buergschaften_objects_read" on storage.objects;
create policy "buergschaften_objects_read"
  on storage.objects for select to authenticated
  using (bucket_id = 'buergschaften');

drop policy if exists "buergschaften_objects_insert" on storage.objects;
create policy "buergschaften_objects_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'buergschaften');

drop policy if exists "buergschaften_objects_update" on storage.objects;
create policy "buergschaften_objects_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'buergschaften');

drop policy if exists "buergschaften_objects_delete" on storage.objects;
create policy "buergschaften_objects_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'buergschaften');
