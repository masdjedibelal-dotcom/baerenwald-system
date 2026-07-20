-- E-Mail-Protokoll + Kunden-Status-Seite Tracking

create table if not exists public.email_log (
  id uuid primary key default gen_random_uuid (),
  typ text not null,
  an_email text not null,
  an_name text,
  betreff text not null,
  inhalt_html text,
  status text not null default 'gesendet',
  fehler_nachricht text,
  kunde_id uuid references public.kunden (id) on delete set null,
  lead_id uuid references public.leads (id) on delete set null,
  angebot_id uuid references public.angebote (id) on delete set null,
  auftrag_id uuid references public.auftraege (id) on delete set null,
  rechnung_id uuid references public.rechnungen (id) on delete set null,
  gesendet_von uuid references auth.users (id) on delete set null,
  resend_id text,
  created_at timestamptz not null default now ()
);

alter table public.email_log enable row level security;

drop policy if exists "email_log_auth_all" on public.email_log;
create policy "email_log_auth_all" on public.email_log for all using (auth.role () = 'authenticated') with check (
  auth.role () = 'authenticated'
);

create index if not exists email_log_kunde_idx on public.email_log (kunde_id);
create index if not exists email_log_auftrag_idx on public.email_log (auftrag_id);
create index if not exists email_log_typ_idx on public.email_log (typ);
create index if not exists email_log_created_idx on public.email_log (created_at desc);

alter table public.auftraege
  add column if not exists kunden_seite_aufrufe int not null default 0;

alter table public.auftraege
  add column if not exists kunden_seite_letzter_aufruf timestamptz;
