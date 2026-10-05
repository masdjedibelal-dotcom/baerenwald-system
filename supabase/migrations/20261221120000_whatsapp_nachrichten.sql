-- WhatsApp (360dialog, Bärenwald-Nummer): ein Verlauf je Kontakt (Partner oder Kunde).
-- Eingehende Nachrichten kommen über den Webhook /api/whatsapp/webhook, ausgehende aus dem CRM.
-- Zuordnung zu Auftrag/Einsatz: automatisch (Antwort auf unsere Nachricht, einziger aktiver Einsatz)
-- oder von Hand im Chat. Testdaten tragen ist_mock = true und lassen sich gesammelt löschen.

create table if not exists public.whatsapp_nachrichten (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  richtung text not null check (richtung in ('ein', 'aus')),
  kontakt_typ text not null check (kontakt_typ in ('handwerker', 'kunde', 'unbekannt')),
  handwerker_id uuid references public.handwerker (id) on delete set null,
  kunde_id uuid references public.kunden (id) on delete set null,
  -- Nummer im internationalen Format ohne +, z. B. 4917612345678
  telefon text not null,
  auftrag_id uuid references public.auftraege (id) on delete set null,
  einsatz_id uuid references public.einsaetze (id) on delete set null,
  art text not null default 'text'
    check (art in ('text', 'bild', 'dokument', 'audio', 'video', 'vorlage', 'knoepfe', 'antwort', 'standort')),
  text text,
  -- Medien: Pfad im Bucket whatsapp-medien (echte Nachrichten) oder feste URL (Testdaten)
  media_pfad text,
  media_url text,
  media_name text,
  media_mime text,
  -- Ausgehend: Antwort-Knöpfe [{ id, titel }]; eingehend: gedrückter Knopf
  knoepfe jsonb,
  knopf_id text,
  -- Vorlage (nötig außerhalb des 24-Stunden-Fensters)
  vorlage text,
  -- Antwort auf diese Nachricht (WhatsApp-ID unserer Nachricht)
  antwort_auf_wa_id text,
  -- Von Bärenwald eingeordnet: Update / Regie (ins Einsatz-Verlauf übernommen) oder erledigt
  markierung text check (markierung in ('update', 'regie', 'erledigt')),
  status text not null default 'gesendet'
    check (status in ('wartend', 'gesendet', 'zugestellt', 'gelesen', 'fehler', 'empfangen')),
  fehler text,
  wa_id text unique,
  gelesen_at timestamptz,
  erstellt_von uuid references auth.users (id) on delete set null,
  ist_mock boolean not null default false
);

comment on table public.whatsapp_nachrichten is
  'WhatsApp-Verlauf mit Partnern und Kunden (360dialog). ist_mock = Testdaten aus dem Testmodus.';

create index if not exists whatsapp_nachrichten_hw_idx on public.whatsapp_nachrichten (handwerker_id, created_at desc);
create index if not exists whatsapp_nachrichten_kunde_idx on public.whatsapp_nachrichten (kunde_id, created_at desc);
create index if not exists whatsapp_nachrichten_auftrag_idx on public.whatsapp_nachrichten (auftrag_id, created_at desc);
create index if not exists whatsapp_nachrichten_telefon_idx on public.whatsapp_nachrichten (telefon, created_at desc);
create index if not exists whatsapp_nachrichten_ungelesen_idx
  on public.whatsapp_nachrichten (created_at desc) where richtung = 'ein' and gelesen_at is null;

-- Nur das Bärenwald-Team (keine Portal-Konten)
alter table public.whatsapp_nachrichten enable row level security;
drop policy if exists "whatsapp_nachrichten_staff" on public.whatsapp_nachrichten;
create policy "whatsapp_nachrichten_staff"
  on public.whatsapp_nachrichten for all
  using (public.is_crm_staff())
  with check (public.is_crm_staff());

-- Medien aus WhatsApp (privat, Zugriff nur über befristete Links aus dem CRM)
insert into storage.buckets (id, name, public)
values ('whatsapp-medien', 'whatsapp-medien', false)
on conflict (id) do nothing;

-- Anhänge aus dem CRM: Browser lädt direkt in den Bucket (Netlify-Grenze ~6 MB je Anfrage umgehen)
drop policy if exists "whatsapp_medien_staff_select" on storage.objects;
create policy "whatsapp_medien_staff_select"
  on storage.objects for select to authenticated
  using (bucket_id = 'whatsapp-medien' and public.is_crm_staff());
drop policy if exists "whatsapp_medien_staff_insert" on storage.objects;
create policy "whatsapp_medien_staff_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'whatsapp-medien' and public.is_crm_staff());
