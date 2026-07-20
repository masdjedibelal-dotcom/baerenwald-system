-- Seed Katalog-Produkte & Preise (Welle 3 — netto München)

insert into public.katalog_produkte (slug, bezeichnung, familie, preis_typ, lohnanteil_prozent, has_fixpreis, sort_order) values
  ('uebergabe-stufe-1', 'Übergabefertig', 'pakete', 'fix', 85, true, 10),
  ('uebergabe-stufe-2', 'Neuvermietungsfertig', 'pakete', 'm2_band', 75, false, 20),
  ('renovierung-maler', 'Malerarbeiten komplett', 'renovierung', 'm2_band', 75, false, 30),
  ('renovierung-boden-vinyl', 'Boden Vinyl/Laminat', 'renovierung', 'm2_band', 45, false, 40),
  ('renovierung-parkett-schliff', 'Parkett schleifen + versiegeln', 'renovierung', 'm2_band', 45, false, 50),
  ('renovierung-parkett-neu', 'Parkett Neuverlegung', 'renovierung', 'm2_band', 45, false, 60),
  ('renovierung-bad-auffrischung', 'Bad-Auffrischung', 'renovierung', 'band', 60, false, 70),
  ('renovierung-elektro-sicht', 'Elektro-Sichtteile', 'renovierung', 'band', 70, false, 80),
  ('zubuch-endreinigung', 'Endreinigung intensiv', 'zubuch', 'fix', 90, true, 90),
  ('zubuch-entruempelung', 'Entrümpelung', 'zubuch', 'band', 85, false, 100),
  ('zubuch-kueche-demontage', 'Küche Demontage + Entsorgung', 'zubuch', 'fix', 80, true, 110),
  ('zubuch-kueche-montage', 'Küche Montage (Standard)', 'zubuch', 'band', 90, false, 120),
  ('zubuch-zusatz-stunde', 'Zusatzarbeiten (Stundensatz)', 'zubuch', 'stundensatz', 100, true, 130),
  ('fix-verstopfung', 'Verstopfung beseitigen', 'fix', 'fix', 90, true, 200),
  ('fix-armatur', 'Armatur tauschen', 'fix', 'fix', 45, true, 210),
  ('abo-hausmeister', 'Hausmeister-Service', 'service', 'fix', 95, false, 300),
  ('abo-garten', 'Gartenpflege', 'service', 'fix', 95, false, 310),
  ('abo-reinigung', 'Treppenhausreinigung', 'service', 'fix', 90, false, 320),
  ('abo-winterdienst', 'Winterdienst', 'service', 'fix', 85, false, 330),
  ('abo-wartung-heizung', 'Wartung Heizung/Anlagen', 'service', 'fix', 80, false, 340)
on conflict (slug) do update set
  bezeichnung = excluded.bezeichnung,
  familie = excluded.familie,
  preis_typ = excluded.preis_typ,
  lohnanteil_prozent = excluded.lohnanteil_prozent,
  has_fixpreis = excluded.has_fixpreis,
  sort_order = excluded.sort_order,
  aktiv = true;

-- Übergabe Stufe 1 Fixpreise
insert into public.katalog_preise (produkt_slug, groessenklasse, preis_fix, lohnanteil_prozent, sort_order) values
  ('uebergabe-stufe-1', 'bis_45', 690, 85, 1),
  ('uebergabe-stufe-1', '46_75', 890, 85, 2),
  ('uebergabe-stufe-1', '76_100', 1090, 85, 3),
  ('uebergabe-stufe-1', 'ueber_100', 1290, 85, 4)
on conflict do nothing;

-- Stufe 2 Maler Band + m²-Fix-Ausnahme
insert into public.katalog_preise (produkt_slug, preis_min, preis_max, m2_satz, lohnanteil_prozent, sort_order) values
  ('uebergabe-stufe-2', 25, 40, 32, 75, 1);

-- Renovierung Bänder
insert into public.katalog_preise (produkt_slug, preis_min, preis_max, lohnanteil_prozent, sort_order) values
  ('renovierung-maler', 25, 40, 75, 1),
  ('renovierung-boden-vinyl', 45, 75, 45, 1),
  ('renovierung-parkett-schliff', 35, 55, 45, 1),
  ('renovierung-parkett-neu', 90, 140, 45, 1),
  ('renovierung-bad-auffrischung', 800, 2500, 60, 1),
  ('renovierung-elektro-sicht', 600, 1800, 70, 1);

-- Zubuch
insert into public.katalog_preise (produkt_slug, groessenklasse, preis_fix, lohnanteil_prozent, sort_order) values
  ('zubuch-endreinigung', 'bis_45', 240, 90, 1),
  ('zubuch-endreinigung', '46_75', 320, 90, 2),
  ('zubuch-endreinigung', '76_100', 420, 90, 3),
  ('zubuch-endreinigung', 'ueber_100', 520, 90, 4),
  ('zubuch-kueche-demontage', null, 290, 80, 1);

insert into public.katalog_preise (produkt_slug, preis_min, preis_max, preis_fix, lohnanteil_prozent, sort_order) values
  ('zubuch-entruempelung', null, null, 390, 85, 1),
  ('zubuch-kueche-montage', 690, 1490, null, 90, 1);

insert into public.katalog_preise (produkt_slug, stundensatz, lohnanteil_prozent, sort_order) values
  ('zubuch-zusatz-stunde', 69, 100, 1);
