-- Q7: Eine Freigabe-Schwelle — kleinreparatur_schwelle_eur entfernen
-- Q9: Alt-Tabelle abnahme_protokolle → Backfill + Drop

-- ─── Q7 ──────────────────────────────────────────────────────────────────────
alter table public.kunden
  drop column if exists kleinreparatur_schwelle_eur;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'kunden' and column_name = 'kleinreparatur_aktiv'
  ) then
    execute $c$
      comment on column public.kunden.kleinreparatur_aktiv is
        'Optionaler Sofort-Pfad Kleinreparatur. Schwelle = kunden.freigabe_schwelle_eur (eine Schwelle).'
    $c$;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'kunden' and column_name = 'kleinreparaturen_ohne_angebot'
  ) then
    execute $c$
      comment on column public.kunden.kleinreparaturen_ohne_angebot is
        'ABGELÖST / nicht mehr verwenden — Angebot wird immer erzeugt; Freigabe über freigabe_schwelle_eur.'
    $c$;
  end if;
end $$;

-- ─── Q9 Backfill + Drop ─────────────────────────────────────────────────────
do $$
begin
  if to_regclass('public.abnahme_protokolle') is null then
    raise notice 'abnahme_protokolle fehlt — Skip Backfill/Drop';
    return;
  end if;

  if to_regclass('public.auftrag_abnahmeprotokolle') is null then
    raise exception 'auftrag_abnahmeprotokolle fehlt — Backfill nicht möglich';
  end if;

  insert into public.auftrag_abnahmeprotokolle (
    auftrag_id,
    abnahme_datum,
    notizen,
    punkte,
    maengel,
    pdf_url,
    an_kunde_gesendet_at,
    created_at,
    updated_at
  )
  select
    a.auftrag_id,
    a.abnahme_datum,
    nullif(trim(concat_ws(E'\n\n', a.protokoll_text, a.maengel_text, a.ort)), ''),
    '[]'::jsonb,
    case
      when nullif(trim(a.maengel_text), '') is null then '[]'::jsonb
      else jsonb_build_array(
        jsonb_build_object(
          'id', 'legacy_' || a.id::text,
          'punkt_id', 'legacy_' || a.id::text,
          'beschreibung', trim(a.maengel_text),
          'status', 'offen'
        )
      )
    end,
    case
      when a.pdf_path ~* '^https?://' then a.pdf_path
      when nullif(trim(u.abnahme_protokoll_url), '') is not null then u.abnahme_protokoll_url
      else null
    end,
    a.created_at,
    a.created_at,
    a.created_at
  from public.abnahme_protokolle a
  left join public.auftraege u on u.id = a.auftrag_id
  where not exists (
    select 1
    from public.auftrag_abnahmeprotokolle k
    where k.auftrag_id = a.auftrag_id
  );

  update public.auftraege u
  set abnahme_protokoll_url = k.pdf_url
  from public.auftrag_abnahmeprotokolle k
  where k.auftrag_id = u.id
    and nullif(trim(k.pdf_url), '') is not null
    and nullif(trim(u.abnahme_protokoll_url), '') is null;

  drop table if exists public.abnahme_protokolle cascade;
end $$;
