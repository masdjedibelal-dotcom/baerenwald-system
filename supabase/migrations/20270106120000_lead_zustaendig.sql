-- Servus TEO: Vorgang einem Teammitglied zuordnen (Liste „Vorgänge“ → Spalte „Zuständig“).
-- Leer = noch niemand zugeordnet. Das CRM liest die Spalte nur bei der Marke TEO.

alter table public.leads
  add column if not exists zustaendig_id uuid references auth.users (id) on delete set null;

create index if not exists leads_zustaendig_id_idx
  on public.leads (zustaendig_id)
  where zustaendig_id is not null;
