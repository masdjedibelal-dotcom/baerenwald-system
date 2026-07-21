-- HV-manueller Vorgang ohne Mieter (TC-03)

do $$
begin
  alter type public.lead_kanal add value if not exists 'hv_manuell';
exception when duplicate_object then null;
end $$;
