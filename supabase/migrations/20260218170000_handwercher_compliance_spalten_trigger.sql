-- Nach handwercher_partner_import.sql ausführen:
-- Zusatz-Spalten auf handwerker + Compliance-Berechnung + Storage-Bucket

alter table public.handwerker
  add column if not exists partner_kategorie_id uuid references public.partner_kategorien (id);

alter table public.handwerker
  add column if not exists subkategorie text;

alter table public.handwerker
  add column if not exists ist_fachbetrieb boolean default false;

alter table public.handwerker
  add column if not exists whatsapp text;

alter table public.handwerker
  add column if not exists webseite text;

alter table public.handwerker
  add column if not exists steuernummer text;

alter table public.handwerker
  add column if not exists ustid text;

alter table public.handwerker
  add column if not exists iban text;

alter table public.handwerker
  add column if not exists compliance_status text default 'unvollständig';

comment on column public.handwerker.compliance_status is
  'vollständig | warnung | unvollständig | abgelaufen';

-- ---------------------------------------------------------------------------
-- Compliance nur anhand Dokumente (Voraussetzung: ist Fachbetrieb — siehe Trigger)
-- ---------------------------------------------------------------------------
create or replace function public.compute_handwercher_compliance(p_handwerker_id uuid)
returns text
language plpgsql
stable
as $$
declare
  fehlend int;
  abgelaufen int;
  warnung int;
begin
  select count(*) into fehlend
  from public.compliance_dokument_typen t
  where t.pflicht_fuer_fachbetriebe = true
    and not exists (
      select 1
      from public.partner_dokumente d
      where d.handwerker_id = p_handwerker_id
        and d.typ = t.slug
        and (d.gueltig_bis is null or d.gueltig_bis >= now())
    );

  select count(*) into abgelaufen
  from public.partner_dokumente
  where handwerker_id = p_handwerker_id
    and gueltig_bis is not null
    and gueltig_bis < now();

  select count(*) into warnung
  from public.partner_dokumente
  where handwerker_id = p_handwerker_id
    and gueltig_bis is not null
    and gueltig_bis >= now()
    and gueltig_bis <= now() + interval '30 days';

  if fehlend > 0 or abgelaufen > 0 then
    return 'unvollständig';
  elsif warnung > 0 then
    return 'warnung';
  else
    return 'vollständig';
  end if;
end;
$$;

create or replace function public.handwercher_apply_compliance_trigger()
returns trigger
language plpgsql
as $$
begin
  if not coalesce(new.ist_fachbetrieb, false) then
    new.compliance_status := 'vollständig';
    return new;
  end if;
  new.compliance_status := public.compute_handwercher_compliance(new.id);
  return new;
end;
$$;

drop trigger if exists trg_handwercher_compliance on public.handwerker;
create trigger trg_handwercher_compliance
  before insert or update of ist_fachbetrieb, name, firma, gewerke, subkategorie, partner_kategorie_id
  on public.handwerker
  for each row
  execute function public.handwercher_apply_compliance_trigger();

create or replace function public.partner_dokumente_refresh_handwercher_compliance()
returns trigger
language plpgsql
as $$
declare
  hid uuid;
begin
  hid := coalesce(new.handwerker_id, old.handwerker_id);
  if hid is null then
    return null;
  end if;
  update public.handwerker h
  set
    compliance_status = case
      when coalesce(h.ist_fachbetrieb, false) then public.compute_handwercher_compliance(hid)
      else 'vollständig'
    end,
    updated_at = now()
  where h.id = hid;
  return null;
end;
$$;

drop trigger if exists trg_partner_docs_compliance on public.partner_dokumente;
create trigger trg_partner_docs_compliance
  after insert or update or delete on public.partner_dokumente
  for each row
  execute function public.partner_dokumente_refresh_handwercher_compliance();

-- ---------------------------------------------------------------------------
-- Storage: partner-dokumente (privat, max. 10 MB, PDF/Bilder)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'partner-dokumente',
  'partner-dokumente',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "partner_dokumente_objects_read" on storage.objects;
create policy "partner_dokumente_objects_read"
  on storage.objects for select to authenticated
  using (bucket_id = 'partner-dokumente');

drop policy if exists "partner_dokumente_objects_insert" on storage.objects;
create policy "partner_dokumente_objects_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'partner-dokumente');

drop policy if exists "partner_dokumente_objects_update" on storage.objects;
create policy "partner_dokumente_objects_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'partner-dokumente');

drop policy if exists "partner_dokumente_objects_delete" on storage.objects;
create policy "partner_dokumente_objects_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'partner-dokumente');
