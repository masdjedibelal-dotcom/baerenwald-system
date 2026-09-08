-- Gewerke-Katalog: Variante B (Namen bei gleichem Slug) + Variante A (neue Slugs).
-- sort_order für stabile Dropdown-Reihenfolge (Handwerker-Profil, Preislisten, …).

alter table public.gewerke
  add column if not exists sort_order integer not null default 100;

-- B: bestehende Slugs — nur Anzeigename (+ Reihenfolge)
update public.gewerke set name = 'Sanitär', sort_order = 70 where slug = 'bad';
update public.gewerke set name = 'Heizung', sort_order = 80 where slug = 'heizung';
update public.gewerke set name = 'Bodenverlegung', sort_order = 50 where slug = 'boden';
update public.gewerke set name = 'Dachdeckerarbeiten', sort_order = 110 where slug = 'dach';
update public.gewerke set name = 'Elektroinstallation', sort_order = 90 where slug = 'elektrik';
update public.gewerke set name = 'Fassadenarbeiten und Wärmedämmung', sort_order = 150 where slug = 'fassade';
update public.gewerke set name = 'Fenster- und Türenbau', sort_order = 120 where slug = 'fenster';
update public.gewerke set name = 'Garten- und Landschaftsbau', sort_order = 160 where slug = 'garten';
update public.gewerke set name = 'Hausmeisterservice', sort_order = 220 where slug = 'hausmeister';
update public.gewerke set name = 'Maler- und Lackierarbeiten', sort_order = 40 where slug = 'maler';
update public.gewerke set name = 'Gebäudereinigung', sort_order = 210 where slug = 'reinigung';
update public.gewerke set name = 'Trockenbau', sort_order = 30 where slug = 'trockenbau';
update public.gewerke set name = 'Winterdienst', sort_order = 310 where slug = 'winterdienst';
update public.gewerke set name = 'Allgemein', sort_order = 0 where slug = 'allgemein';

-- A: neue Gewerke (Slug bleibt kanonisch; bei erneutem Lauf Name/Meta aktualisieren)
insert into public.gewerke (name, slug, aktiv, ausfuehrung, ist_bauleistung, sort_order)
values
  ('Abbruch und Entkernung', 'abbruch', true, 'fachbetrieb', true, 10),
  ('Maurer- und Betonarbeiten', 'maurer', true, 'fachbetrieb', true, 20),
  ('Fliesen-, Platten- und Mosaikarbeiten', 'fliesen', true, 'beides', true, 60),
  ('Klima- und Lüftungstechnik', 'klima', true, 'fachbetrieb', true, 100),
  ('Schreinerarbeiten', 'schreiner', true, 'beides', true, 130),
  ('Metallbau und Schlosserei', 'metallbau', true, 'fachbetrieb', true, 140),
  ('Pflaster- und Natursteinarbeiten', 'pflaster', true, 'beides', true, 170),
  ('Poolbau', 'pool', true, 'fachbetrieb', true, 180),
  ('Terrassen- und Balkonbau', 'terrasse', true, 'beides', true, 190),
  ('Gerüstbau', 'geruest', true, 'fachbetrieb', true, 200),
  ('Entrümpelung und Entsorgung', 'entruempelung', true, 'eigen', false, 230),
  ('Kanal- und Rohrreinigung', 'kanal', true, 'fachbetrieb', true, 240),
  ('Brandschutz', 'brandschutz', true, 'fachbetrieb', true, 250),
  ('Photovoltaik und Solartechnik', 'photovoltaik', true, 'fachbetrieb', true, 260),
  ('Aufzug- und Fördertechnik', 'aufzug', true, 'fachbetrieb', true, 270),
  ('Küchenmontage', 'kueche', true, 'beides', true, 280),
  ('Innenausbau und Komplettsanierung', 'innenausbau', true, 'beides', true, 290),
  ('Außenanlagen', 'aussenanlagen', true, 'eigen', false, 300),
  ('Schadensanierung und Bautrocknung', 'schadensanierung', true, 'fachbetrieb', true, 320)
on conflict (slug) do update set
  name = excluded.name,
  aktiv = true,
  ausfuehrung = excluded.ausfuehrung,
  ist_bauleistung = excluded.ist_bauleistung,
  sort_order = excluded.sort_order;
