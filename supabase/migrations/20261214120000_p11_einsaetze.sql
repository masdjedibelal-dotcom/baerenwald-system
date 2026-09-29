-- P11: Einsatz — Anweisung an genau einen Partner je Auftrag (Zielbild 29.09.2026).
-- Der Partner bekommt keine Positionen und keine Verkaufspreise, nur Anweisung + EK.
-- Ablauf: gesendet → angenommen | abgelehnt → fertig (Fotos/Dokumente/Text) → Partner-Rechnung.

create table if not exists public.einsaetze (
  id uuid primary key default gen_random_uuid(),
  auftrag_id uuid not null references public.auftraege (id) on delete cascade,
  handwerker_id uuid not null references public.handwerker (id),
  titel text not null,
  anweisung text,
  termin_von date,
  termin_bis date,
  ort text,
  kontakt_vor_ort text,
  -- EK so, wie der Partner abrechnet: netto (z. B. §13b) oder brutto
  ek_betrag numeric(12, 2),
  ek_art text not null default 'netto' check (ek_art in ('netto', 'brutto')),
  status text not null default 'gesendet'
    check (status in ('gesendet', 'angenommen', 'abgelehnt', 'fertig')),
  gesendet_at timestamptz not null default now(),
  angenommen_at timestamptz,
  abgelehnt_at timestamptz,
  ablehnung_grund text,
  fertig_at timestamptz,
  fertig_text text,
  fertig_dateien jsonb not null default '[]'::jsonb,
  -- Partner-Rechnung: PDF oder Freitext-Positionen [{ text, betrag }]
  rechnung_pdf_url text,
  rechnung_positionen jsonb,
  rechnung_betrag numeric(12, 2),
  rechnung_eingereicht_at timestamptz,
  erstellt_von uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.einsaetze is
  'Einsatz: Anweisung (Titel, Text, wann, wo) + EK an einen Partner. Ersetzt die Zuweisung von Auftragspositionen an Partner.';

create index if not exists einsaetze_auftrag_idx on public.einsaetze (auftrag_id);
create index if not exists einsaetze_handwerker_idx on public.einsaetze (handwerker_id, status);

alter table public.einsaetze enable row level security;

drop policy if exists "einsaetze_auth_all" on public.einsaetze;
create policy "einsaetze_auth_all"
  on public.einsaetze for all
  using (auth.role () = 'authenticated')
  with check (auth.role () = 'authenticated');
