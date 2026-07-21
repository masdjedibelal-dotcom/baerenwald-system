-- KI-Visualisierung (Referenz — ggf. bereits manuell ausgeführt)

create table if not exists public.ki_visualisierungen (
  id uuid primary key default gen_random_uuid(),
  angebot_id uuid references public.angebote (id) on delete cascade,
  ist_bilder_urls text[] not null default '{}',
  ziel_bild_url text,
  analysierter_prompt text,
  prompt_history jsonb not null default '[]'::jsonb,
  ausgewaehlte_urls text[] not null default '{}',
  ins_angebot boolean not null default false,
  status text not null default 'neu',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ki_visualisierungen_status_check
    check (status in ('neu', 'rendering', 'fertig', 'fehler'))
);

alter table public.angebote
  add column if not exists visualisierung_ids uuid[];

create index if not exists ki_visualisierungen_angebot_id_idx
  on public.ki_visualisierungen (angebot_id);

alter table public.ki_visualisierungen enable row level security;

drop policy if exists "ki_visualisierungen_crm_staff_all" on public.ki_visualisierungen;
create policy "ki_visualisierungen_crm_staff_all"
  on public.ki_visualisierungen for all to authenticated
  using (public.is_crm_staff())
  with check (public.is_crm_staff());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'visualisierungen',
  'visualisierungen',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "visualisierungen_public_read" on storage.objects;
create policy "visualisierungen_public_read"
  on storage.objects for select to public
  using (bucket_id = 'visualisierungen');

drop policy if exists "visualisierungen_crm_upload" on storage.objects;
create policy "visualisierungen_crm_upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'visualisierungen' and public.is_crm_staff());

drop policy if exists "visualisierungen_crm_update" on storage.objects;
create policy "visualisierungen_crm_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'visualisierungen' and public.is_crm_staff());

drop policy if exists "visualisierungen_crm_delete" on storage.objects;
create policy "visualisierungen_crm_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'visualisierungen' and public.is_crm_staff());
