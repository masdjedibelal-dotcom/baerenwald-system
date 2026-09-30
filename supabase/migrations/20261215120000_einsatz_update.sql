-- Partner-Updates gehören zum Einsatz (intern, nie für Kunden sichtbar).
-- Neue Art „update“ neben Regie und Behinderung. Status „offen“ = ungelesen.
alter table public.einsatz_mitteilungen drop constraint if exists einsatz_mitteilungen_typ_check;
alter table public.einsatz_mitteilungen
  add constraint einsatz_mitteilungen_typ_check check (typ in ('update', 'regie', 'behinderung'));
