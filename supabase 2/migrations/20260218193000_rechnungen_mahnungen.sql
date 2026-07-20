-- Mahnungen / Erinnerungen für überfällige Rechnungen (Cron-Job)
alter table public.rechnungen
  add column if not exists erinnerung_7_sent_at timestamptz,
  add column if not exists erinnerung_21_sent_at timestamptz,
  add column if not exists intern_warnung_30_at timestamptz;
