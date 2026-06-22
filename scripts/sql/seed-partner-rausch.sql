-- Partner aus Referenz-Nachunternehmervertrag (Rausch ProjektBAU, WDVS Krumptnerstr.)
insert into public.handwerker (
  name, firma, email, telefon, adresse, steuernummer, gewerke, aktiv, notizen
)
select
  'Rausch ProjektBAU – Innen & Außenbau',
  null,
  null,
  '015151384775',
  'Baumgartnerstraße 9, 81373 München',
  '159/247/70845',
  array['wdvs', 'fassade']::text[],
  true,
  'Nachunternehmer WDVS Krumptnerstr. 17'
where not exists (
  select 1 from public.handwerker
  where name = 'Rausch ProjektBAU – Innen & Außenbau'
    and telefon = '015151384775'
);
