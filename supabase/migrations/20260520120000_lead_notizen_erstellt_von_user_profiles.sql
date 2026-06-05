-- PostgREST/Supabase: user_profiles unter lead_notizen einbetten (Ersteller-Name).
-- Ersetzt FK auth.users durch public.user_profiles (id entspricht der Auth-User-ID).

update public.lead_notizen ln
set erstellt_von = null
where ln.erstellt_von is not null
  and not exists (select 1 from public.user_profiles up where up.id = ln.erstellt_von);

alter table public.lead_notizen
  drop constraint if exists lead_notizen_erstellt_von_fkey;

alter table public.lead_notizen
  add constraint lead_notizen_erstellt_von_fkey
  foreign key (erstellt_von)
  references public.user_profiles (id)
  on delete set null;
