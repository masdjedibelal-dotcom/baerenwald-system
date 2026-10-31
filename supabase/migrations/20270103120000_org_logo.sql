-- Servus TEO: Verwaltung kann ihr Logo hochladen (Drucke: Aushang, Schadenunterlagen, Jahresbericht, QR-Aushang).
-- Bewusst nur das Logo — Farben bleiben fest im TEO-Look.
alter table public.kunden add column if not exists org_logo_url text;
