-- Gewerke vereinfachen (04.10.2026): ~33 Einzelgewerke → 11 Obergewerke.
-- Je Gruppe wird das erste vorhandene Gewerk (Reihenfolge der Kandidaten) zum Obergewerk:
-- Name/Sortierung neu, alle Verweise der übrigen Gruppenmitglieder werden darauf umgehängt,
-- die Mitglieder bleiben als inaktive Zeilen bestehen (nichts wird gelöscht).
-- Funktioniert für Staging und Prod, obwohl dort unterschiedliche Gewerke existieren.

do $$
declare
  g record;
  anker uuid;
  anker_slug text;
  mitglieder uuid[];
  mitglied_slugs text[];
  t record;
begin
  for g in
    select * from (values
      (1,  'Allgemein',                      array['allgemein','innenausbau','kueche','aufzug','brandschutz']),
      (2,  'Abbruch, Rohbau & Entsorgung',   array['abbruch','maurer','entruempelung','kanal']),
      (3,  'Maler & Trockenbau',             array['maler','trockenbau']),
      (4,  'Boden & Fliesen',                array['boden','fliesen']),
      (5,  'Sanitär, Heizung & Klima',       array['sanitaer','bad','heizung','klima']),
      (6,  'Elektro & Photovoltaik',         array['elektrik','photovoltaik']),
      (7,  'Fenster, Türen & Schreiner',     array['fenster','schreiner','metallbau']),
      (8,  'Dach, Fassade & Gerüst',         array['dach','fassade','geruest']),
      (9,  'Garten & Außenanlagen',          array['garten','aussenanlagen','pflaster','pool','terrasse','winterdienst']),
      (10, 'Reinigung & Hausmeister',        array['reinigung','hausmeister']),
      (11, 'Schadensanierung & Trocknung',   array['schadensanierung'])
    ) as v(sort, name, kandidaten)
  loop
    select id, slug into anker, anker_slug
      from public.gewerke
      where slug = any(g.kandidaten)
      order by array_position(g.kandidaten, slug)
      limit 1;
    if anker is null then
      continue;
    end if;

    update public.gewerke set name = g.name, sort_order = g.sort, aktiv = true where id = anker;

    select coalesce(array_agg(id), '{}'), coalesce(array_agg(slug), '{}')
      into mitglieder, mitglied_slugs
      from public.gewerke
      where slug = any(g.kandidaten) and id <> anker;

    if array_length(mitglieder, 1) is null then
      continue;
    end if;

    -- Katalog: gleicher Titel im Obergewerk → Titel um alten Gewerk-Namen ergänzen
    update public.katalog_positionen k
      set titel = k.titel || ' (' || (select name from public.gewerke where id = k.gewerk_id) || ')'
      where k.gewerk_id = any(mitglieder)
        and exists (
          select 1 from public.katalog_positionen x
          where x.gewerk_id = anker and lower(x.titel) = lower(k.titel)
        );

    -- Alle Fremdschlüssel auf gewerke.id umhängen
    for t in
      select c.conrelid::regclass::text as tabelle, a.attname as spalte
      from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
      where c.contype = 'f' and c.confrelid = 'public.gewerke'::regclass
    loop
      execute format('update %s set %I = $1 where %I = any($2)', t.tabelle, t.spalte, t.spalte)
        using anker, mitglieder;
    end loop;

    -- Partner-Gewerke (Kürzel-Liste) und Positions-Kürzel
    update public.handwerker
      set gewerke = (
        select array_agg(distinct case when s = any(mitglied_slugs) then anker_slug else s end)
        from unnest(gewerke) s
      )
      where gewerke && mitglied_slugs;
    update public.auftrag_positionen
      set gewerk_slug = anker_slug
      where gewerk_slug = any(mitglied_slugs);

    update public.gewerke set aktiv = false where id = any(mitglieder);
  end loop;
end $$;
