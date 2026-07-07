-- Phasen, Termine, Partner-Preis und Kunden-Notizen pro Leistung

alter table public.auftrag_positionen
  add column if not exists projekt_phase text,
  add column if not exists gewerk_block_key text,
  add column if not exists start_datum date,
  add column if not exists end_datum date,
  add column if not exists preis_partner numeric(10, 2);

comment on column public.auftrag_positionen.projekt_phase is 'Planung | Vorbereitung | Ausführung | Abnahme | Rechnung (leer = ohne Phase)';
comment on column public.auftrag_positionen.gewerk_block_key is 'Gruppierung wie im Angebot (mehrere Gewerk-Blöcke)';
comment on column public.auftrag_positionen.preis_partner is 'Vereinbarter Partner-Preis (EK) pro Leistung';

create table if not exists public.auftrag_position_notizen (
  id uuid primary key default uuid_generate_v4(),
  position_id uuid not null references public.auftrag_positionen(id) on delete cascade,
  datum date not null default current_date,
  text text not null,
  sort_order int default 0,
  created_at timestamptz default now()
);

alter table public.auftrag_position_notizen enable row level security;

create policy "auth_all" on public.auftrag_position_notizen for all
  using (auth.role() = 'authenticated');

create index if not exists auftrag_pos_notiz_idx on public.auftrag_position_notizen(position_id);
