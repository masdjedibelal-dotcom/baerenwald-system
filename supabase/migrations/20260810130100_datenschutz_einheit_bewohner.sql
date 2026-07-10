-- Welle 3d: Löschfrist Bewohner-Daten (Objektakte, nicht Melde-Flow)

insert into public.datenschutz_fristen (kategorie, bezeichnung, frist_monate, beschreibung, gesetzliche_grundlage)
values
  (
    'einheit_bewohner',
    'Bewohner in Objektakte (HV-Portal)',
    36,
    'einheit_bewohner — getrennt von leads.melder_*; keine automatische Synchronisation',
    'DSGVO Art. 17'
  )
on conflict (kategorie) do nothing;
