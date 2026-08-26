# CRM-Login Rate-Limit

## Gewählt

**App-seitige Drosselung** im CRM-Login (`src/app/(auth)/login/page.tsx` + `src/lib/rate-limit.ts`):

- Nach **5 fehlgeschlagenen** `signInWithPassword`-Versuchen pro E-Mail (normalisiert) innerhalb von **15 Minuten** wird kein weiterer Auth-Versuch an Supabase gesendet.
- Neutrale Fehlermeldung (keine Enumeration, ob die E-Mail existiert).
- Erfolgreicher Login setzt den Zähler nicht zurück über Success-Pfad nötig — Fenster läuft ab.

## Supabase Auth (ergänzend)

Im Supabase-Dashboard (Staging/Prod) unter **Authentication → Rate Limits** die Standard-Limits belassen bzw. bei Bedarf verschärfen (Sign-in / Token-Refresh). Die App-Drosselung greift zusätzlich und liefert eine klare UI-Meldung, unabhängig vom Dashboard.

## Nicht gewählt

Kein separates Edge-Middleware-IP-Limit nur für `/login` (In-Memory reicht für Einzelinstanz / geringe Teamgröße; bei horizontalem Scale ggf. Redis nachziehen).
