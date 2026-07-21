-- Formular: Subtyp, Regiebericht-/Abnahme-Felder, Behinderungs-Mail-Flag

alter table public.formular_templates
  add column if not exists subtyp text;

comment on column public.formular_templates.subtyp is
  'bautagebuch | regiebericht | behinderung | pruefprotokoll | standard';

alter table public.formular_eintraege
  add column if not exists unterschrift_kunde text;

comment on column public.formular_eintraege.unterschrift_kunde is
  'Base64-Signatur oder Text z. B. „akzeptiert“';

alter table public.formular_eintraege
  add column if not exists unterschrift_at timestamptz;

alter table public.formular_eintraege
  add column if not exists gesamtstunden numeric(6, 2);

alter table public.formular_eintraege
  add column if not exists material_kosten numeric(10, 2);

alter table public.formular_eintraege
  add column if not exists behinderung_intern_mail_at timestamptz;

comment on column public.formular_eintraege.behinderung_intern_mail_at is
  'Interne Resend-Mail zu Behinderung bereits versendet';
