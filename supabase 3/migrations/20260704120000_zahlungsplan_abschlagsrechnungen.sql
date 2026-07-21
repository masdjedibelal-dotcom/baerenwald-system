-- Zahlungsplan (Angebot/Auftrag) + Abschlagsrechnungen

alter table public.angebote
  add column if not exists zahlungsplan jsonb;

alter table public.auftraege
  add column if not exists zahlungsplan jsonb;

alter table public.rechnungen
  add column if not exists rechnung_art text not null default 'voll',
  add column if not exists abschlag_index int,
  add column if not exists zahlungsplan_abschlag_id text,
  add column if not exists mail_einleitung text,
  add column if not exists mail_betreff text;

comment on column public.angebote.zahlungsplan is
  'Abschlagsplan: { modus, zeilen[] } — optional neben zahlungsbedingungen';
comment on column public.auftraege.zahlungsplan is
  'Operativer Zahlungsplan (von Angebot übernommen oder manuell)';
comment on column public.rechnungen.rechnung_art is
  'voll | abschlag | schluss';
comment on column public.rechnungen.zahlungsplan_abschlag_id is
  'Verknüpfung zur Zeile im Auftrags-Zahlungsplan (JSON id)';
