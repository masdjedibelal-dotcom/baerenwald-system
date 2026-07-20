-- Repair: ki_visualisierungen falls Tabelle ohne updated_at o.ä. manuell angelegt wurde

alter table public.ki_visualisierungen
  add column if not exists ist_bilder_urls text[] not null default '{}',
  add column if not exists ziel_bild_url text,
  add column if not exists analysierter_prompt text,
  add column if not exists prompt_history jsonb not null default '[]'::jsonb,
  add column if not exists ausgewaehlte_urls text[] not null default '{}',
  add column if not exists ins_angebot boolean not null default false,
  add column if not exists status text not null default 'neu',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.angebote
  add column if not exists visualisierung_ids uuid[];

update public.ki_visualisierungen
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;
