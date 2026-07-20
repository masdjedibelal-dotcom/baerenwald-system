-- HV-Melde-Kanäle für leads.kanal (Postgres-Enum lead_kanal)

do $$
begin
  alter type public.lead_kanal add value if not exists 'hv_melder_link';
exception when duplicate_object then null;
end $$;

do $$
begin
  alter type public.lead_kanal add value if not exists 'hv_direkt';
exception when duplicate_object then null;
end $$;

do $$
begin
  alter type public.lead_kanal add value if not exists 'hv_einladung';
exception when duplicate_object then null;
end $$;

do $$
begin
  alter type public.lead_kanal add value if not exists 'hv_katalog';
exception when duplicate_object then null;
end $$;
