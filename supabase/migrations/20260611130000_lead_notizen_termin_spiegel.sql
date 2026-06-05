-- Spiegel-Zeilen: Termin-Notizen erscheinen zusätzlich unter Anfrage-Notizen

alter table public.lead_notizen
  add column if not exists quelle_notiz_id uuid references public.lead_notizen (id) on delete cascade;

create unique index if not exists lead_notizen_quelle_notiz_uidx
  on public.lead_notizen (quelle_notiz_id)
  where quelle_notiz_id is not null;

comment on column public.lead_notizen.quelle_notiz_id is 'Kopie einer Termin-Notiz für Tab Anfrage-Notizen';

-- Bestehende Termin-Notizen spiegeln (einfaches HTML, ohne Termin-Metadaten)
insert into public.lead_notizen (
  lead_id,
  inhalt,
  titel,
  datei_url,
  datei_urls,
  quelle_notiz_id,
  erstellt_von,
  created_at
)
select
  ln.lead_id,
  concat(
    '<p style="margin:0 0 8px;font-size:12px;color:#6B7280;">Termin-Notiz</p>',
    case
      when coalesce(trim(ln.titel), '') <> '' then
        concat('<p style="margin:0 0 8px;font-weight:600;">', replace(replace(trim(ln.titel), '&', '&amp;'), '<', '&lt;'), '</p>')
      else ''
    end,
    case
      when coalesce(trim(ln.inhalt), '') <> '' then
        concat('<p style="margin:0;white-space:pre-wrap;">', replace(replace(trim(ln.inhalt), '&', '&amp;'), '<', '&lt;'), '</p>')
      else ''
    end
  ),
  ln.titel,
  ln.datei_url,
  ln.datei_urls,
  ln.id,
  ln.erstellt_von,
  ln.created_at
from public.lead_notizen ln
where ln.kalender_termin_id is not null
  and not exists (
    select 1
    from public.lead_notizen sp
    where sp.quelle_notiz_id = ln.id
  );
