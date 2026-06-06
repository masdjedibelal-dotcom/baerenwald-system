-- Korrigiert Vorname/Nachname aus Website-Funnel (funnel_daten), nicht aus falsch gesplittetem name
update public.kunden k
set
  vorname = nullif(trim(coalesce(l.funnel_daten->>'vorname', '')), ''),
  nachname = nullif(trim(coalesce(l.funnel_daten->>'nachname', '')), ''),
  name = trim(
    concat_ws(
      ' ',
      nullif(trim(coalesce(l.funnel_daten->>'vorname', '')), ''),
      nullif(trim(coalesce(l.funnel_daten->>'nachname', '')), '')
    )
  )
from public.leads l
where
  l.kunde_id = k.id
  and (
    nullif(trim(coalesce(l.funnel_daten->>'vorname', '')), '') is not null
    or nullif(trim(coalesce(l.funnel_daten->>'nachname', '')), '') is not null
  );
