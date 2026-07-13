-- Optional: Spalte updated_at (falls Migration 20260421140000_kunden_erweiterung noch nicht lief)
alter table public.kunden
  add column if not exists updated_at timestamptz not null default now();
