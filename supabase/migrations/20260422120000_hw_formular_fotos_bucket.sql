-- Öffentliche Handwerker-Formular-Fotos (Upload via Service Role API)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'hw-formular-fotos',
  'hw-formular-fotos',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic']::text[]
)
on conflict (id) do nothing;

drop policy if exists "hw_formular_fotos_public_read" on storage.objects;
create policy "hw_formular_fotos_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'hw-formular-fotos');
