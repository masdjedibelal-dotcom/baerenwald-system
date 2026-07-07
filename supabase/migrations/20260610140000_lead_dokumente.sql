-- Hochgeladene Dokumente zu Anfragen (CRM)
create table if not exists public.lead_dokumente (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  name text not null,
  datei_url text not null,
  groesse_bytes int,
  erstellt_von uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists lead_dokumente_lead_idx on public.lead_dokumente (lead_id, created_at desc);

comment on table public.lead_dokumente is 'Manuell hochgeladene Dateien zur Anfrage (PDF, Bilder)';

alter table public.lead_dokumente enable row level security;

drop policy if exists "lead_dokumente_auth_all" on public.lead_dokumente;
create policy "lead_dokumente_auth_all"
  on public.lead_dokumente for all
  using (auth.role () = 'authenticated')
  with check (auth.role () = 'authenticated');

-- Storage-Bucket (Upload via Service Role, Lesen öffentlich für PDF-Links)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lead-dokumente',
  'lead-dokumente',
  true,
  10485760,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "lead_dokumente_public_read" on storage.objects;
create policy "lead_dokumente_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'lead-dokumente');
