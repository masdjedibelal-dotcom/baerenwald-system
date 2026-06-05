-- Gewerke: Ausführungsart + Fachbetrieb-Hinweis für Angebots-Wizard & PDF

alter table public.gewerke
  add column if not exists ausfuehrung text not null default 'eigen',
  add column if not exists fachbetrieb_hinweis text;

comment on column public.gewerke.ausfuehrung is 'eigen | fachbetrieb | beides';
comment on column public.gewerke.fachbetrieb_hinweis is 'Auto-Hinweis in Angebot-Positionen / PDF';

-- Fachbetrieb (immer)
update public.gewerke set
  ausfuehrung = 'fachbetrieb',
  fachbetrieb_hinweis = 'Elektrotechnische Arbeiten durch zugelassenen Elektro-Fachbetrieb. Projektverantwortung: Bärenwald München.'
where slug = 'elektrik';

update public.gewerke set
  ausfuehrung = 'fachbetrieb',
  fachbetrieb_hinweis = 'Heizungs- und Sanitärarbeiten durch konzessionierten Fachbetrieb. Projektverantwortung: Bärenwald München.'
where slug = 'heizung';

update public.gewerke set
  ausfuehrung = 'fachbetrieb',
  fachbetrieb_hinweis = 'Sanitärarbeiten durch konzessionierten Fachbetrieb. Projektverantwortung: Bärenwald München.'
where slug in ('bad', 'sanitaer');

update public.gewerke set
  ausfuehrung = 'fachbetrieb',
  fachbetrieb_hinweis = 'Dacharbeiten durch zugelassenen Dachdeckerbetrieb. Projektverantwortung: Bärenwald München.'
where slug = 'dach';

-- Beides (eigen + Fachbetrieb)
update public.gewerke set
  ausfuehrung = 'beides',
  fachbetrieb_hinweis = 'Teilleistungen durch geprüfte Partnerbetriebe. Projektverantwortung: Bärenwald München.'
where slug in ('maler', 'boden', 'fassade', 'trockenbau', 'fenster');

-- Eigene Leistung
update public.gewerke set
  ausfuehrung = 'eigen',
  fachbetrieb_hinweis = null
where slug in ('garten', 'reinigung', 'hausmeister', 'winterdienst');
