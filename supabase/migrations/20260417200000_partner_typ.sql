-- Partner vs. Netzwerk (Listen-Tabs)
alter table public.partner
  add column if not exists partner_typ text;

update public.partner set partner_typ = 'partner' where partner_typ is null;

alter table public.partner
  alter column partner_typ set default 'partner';

alter table public.partner
  alter column partner_typ set not null;

alter table public.partner
  drop constraint if exists partner_partner_typ_check;

alter table public.partner
  add constraint partner_partner_typ_check check (partner_typ in ('partner', 'netzwerk'));

comment on column public.partner.partner_typ is 'partner = Lieferant/Partner, netzwerk = Netzwerk';
