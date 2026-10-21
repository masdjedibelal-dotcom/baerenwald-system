-- TEO-Arbeitsplatz: Personen einer Organisation (HV/WEG) mit drei Rollen + Objekt-Zuordnung.
-- Verwaltung (Häkchen Admin / darf freigeben), Team (Hausmeister, Reinigung …), Eigentümer.
-- Tabelle war auf allen DBs leer; alte Rollen admin/sachbearbeiter/lesen entfallen.
-- Bärenwald nutzt nichts davon (Felder bleiben leer).

alter table public.kunden_mitglieder drop constraint if exists kunden_mitglieder_rolle_check;
alter table public.kunden_mitglieder drop constraint if exists kunden_mitglieder_kunde_id_auth_user_id_key;

alter table public.kunden_mitglieder
  alter column auth_user_id drop not null,
  alter column rolle set default 'verwaltung',
  add column if not exists email text,
  add column if not exists name text,
  add column if not exists ist_admin boolean not null default false,
  add column if not exists darf_freigeben boolean not null default false,
  add column if not exists eingeladen_von uuid;

update public.kunden_mitglieder set rolle = 'verwaltung', ist_admin = true, darf_freigeben = true where rolle = 'admin';
update public.kunden_mitglieder set rolle = 'verwaltung', darf_freigeben = true where rolle = 'sachbearbeiter';
update public.kunden_mitglieder set rolle = 'verwaltung' where rolle = 'lesen';

alter table public.kunden_mitglieder
  add constraint kunden_mitglieder_rolle_check check (rolle in ('verwaltung', 'team', 'eigentuemer')),
  add constraint kunden_mitglieder_email_oder_login check (auth_user_id is not null or email is not null);

create unique index if not exists kunden_mitglieder_kunde_user_uq
  on public.kunden_mitglieder (kunde_id, auth_user_id) where auth_user_id is not null;
create unique index if not exists kunden_mitglieder_kunde_email_uq
  on public.kunden_mitglieder (kunde_id, lower(email)) where email is not null;

-- Welche Objekte eine Person (Team / Eigentümer) sieht. Verwaltung sieht immer alle.
create table if not exists public.mitglied_objekte (
  mitglied_id uuid not null references public.kunden_mitglieder (id) on delete cascade,
  kunde_objekt_id uuid not null references public.kunden_objekte (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (mitglied_id, kunde_objekt_id)
);
alter table public.mitglied_objekte enable row level security;
create policy mitglied_objekte_service on public.mitglied_objekte for all to service_role using (true) with check (true);

-- Organisationstyp (Hausverwaltung oder selbstverwaltete WEG)
alter table public.kunden
  add column if not exists org_typ text check (org_typ in ('hv', 'weg'));

-- Objekt: Jahresbudget (ein Wert) und zuständige Person der Verwaltung
alter table public.kunden_objekte
  add column if not exists budget_jahr numeric(12, 2) check (budget_jahr is null or budget_jahr >= 0),
  add column if not exists zustaendig_mitglied_id uuid references public.kunden_mitglieder (id) on delete set null;
