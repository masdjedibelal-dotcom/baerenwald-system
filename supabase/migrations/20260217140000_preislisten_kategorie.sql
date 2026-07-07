-- Kategorie für Preislisten-Gruppierung (UI: Tabs → Kategorie-Blöcke)
alter table preislisten
  add column if not exists kategorie text not null default '';

comment on column preislisten.kategorie is 'Gruppierung innerhalb eines Gewerks, z. B. Komplettsanierung';
