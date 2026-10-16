-- Hochgeladene Dokumente (Anfrage/Auftrag bzw. Kunde): beim Upload wählen „intern“ oder „Kunde“.
-- fuer_kunde = true → im Kundenportal sichtbar (Vorgang bzw. „Ihre Unterlagen“).
alter table public.lead_dokumente add column if not exists fuer_kunde boolean not null default false;
alter table public.kunden_dokumente add column if not exists fuer_kunde boolean not null default false;
comment on column public.lead_dokumente.fuer_kunde is 'Im Kundenportal beim Vorgang sichtbar (beim Upload gewählt, in der Akte umschaltbar).';
comment on column public.kunden_dokumente.fuer_kunde is 'Im Kundenportal unter „Ihre Unterlagen“ sichtbar.';
