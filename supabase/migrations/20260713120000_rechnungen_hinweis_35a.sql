-- § 35a-Hinweis auf Rechnungen optional ein-/ausblenden (Wizard)
alter table public.rechnungen
  add column if not exists hinweis_35a boolean;
