-- Einmalig in Supabase ausführen: Dashboard → SQL → New query → Run
-- Behebt: "Could not find the table 'public.einstellungen' in the schema cache"
-- Speichert Firmendaten, IBAN, BIC, Bank usw. (Einstellungen → Firma)

create table if not exists public.einstellungen (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value text,
  updated_at timestamptz default now()
);

alter table public.einstellungen enable row level security;

drop policy if exists "einstellungen_auth_all" on public.einstellungen;
create policy "einstellungen_auth_all"
  on public.einstellungen
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Schema-Cache aktualisieren (Supabase API erkennt die Tabelle danach)
notify pgrst, 'reload schema';
