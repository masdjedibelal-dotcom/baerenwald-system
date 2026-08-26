# Staging — Schema, Seed, Regeln

Gemeinsame Prod-DB von CRM (`baerenwald-system`) und Website (`baerenwald`).  
Staging ist ein **eigenes** Supabase-Projekt. Prod ist ab jetzt **read-only**.

| | Wert |
|---|---|
| Prod (READ-ONLY) | `wnotlydvhsmfkhexgeol` |
| Staging-Project-Ref | `soqownnkxmtfgvsbrgsl` |
| Staging-Projekt-ID | `2503565e-8a02-4af4-bed6-e240a544235d` |
| Staging-Website (Portal) | `https://staging--baerenwald.netlify.app` |
| Staging-CRM | `https://staging--baerenwald-backend.netlify.app` |

## Mail-Catch (P0-1)

Staging versendet **keine** echten Resend-Mails:

| Ort | Verhalten |
|---|---|
| CRM `src/lib/mail-service.ts` | Bei aktivem Catcher: Log + `email_log` mit `resend_id = staging-catch:<uuid>`, kein `resend.emails.send` |
| Website `src/lib/email/send-branded-mail.ts` | Bei aktivem Catcher: Log + `email_log` mit `resend_id = staging-catch:website-<uuid>`, kein Resend |
| Cron `netlify/functions/cron-dispatcher.mjs` | Mail-/Notify-Jobs (`rechnungen`, `angebot-nachfass`, `einbehalte`, `datenschutz`, `copilot-briefing`) auf Staging-Host **übersprungen** |
| Telegram `src/lib/copilot/telegram.ts` | Auf Staging nur Log |

**Catcher aktiv wenn** `ALLOW_STAGING_REAL_MAIL !== '1'` **und** eine der Bedingungen:

| Repo | Auto-Erkennung | Explizit |
|---|---|---|
| CRM | `NEXT_PUBLIC_SUPABASE_URL` enthält `soqownnkxmtfgvsbrgsl` (`isStagingSupabase()`) | `MAIL_CATCHER=1` |
| Website | Staging-Supabase-Ref, Netlify-Branch `staging`, oder URL enthält `staging--baerenwald` (`isStagingDeploy()`) | `MAIL_CATCHER=1` |

**Prod:** weder Staging-Supabase noch Staging-Netlify-URL → Catcher aus → normaler Resend-Versand (sofern `RESEND_API_KEY` gesetzt).

Override (Notfall, echte Mails auf Staging): `ALLOW_STAGING_REAL_MAIL=1`.

**Netlify (beide Staging-Sites):** Staging-Supabase-URL reicht für Auto-Catcher; optional `MAIL_CATCHER=1` als explizite Absicherung. Prod-Sites: diese Variablen **nicht** setzen.

Nachweis-Skript: `node --env-file=.env.staging scripts/staging/trigger-portal-mail-catch.mjs` → prüft `email_log.resend_id LIKE 'staging-catch:%'`.

Seed Runde 2 (Auftrag/Nachtrag/RE/Tokens): `node --env-file=.env.staging scripts/staging/seed-runde2.mjs`  
Echtdaten-Anonymisierung: `node --env-file=.env.staging scripts/staging/anonymize-echtdaten.mjs`  
Prod-Snapshot → Staging (anonym, `PRODSIM-`): `node --env-file=.env.staging scripts/staging/import-prod-snapshot.mjs`  
(siehe Abschnitt „Prod-Snapshot“ unten)

---

## Harte Regel: Prod nur lesen

- Jedes **Schreib-Skript** prüft die Ziel-Ref/URL und **bricht ab**, wenn `wnotlydvhsmfkhexgeol` vorkommt.
- Kein Skript schreibt gegen „die verbundene DB“ oder stilles `.env.local`.
- MCP: auf Prod keine `apply_migration` / keine schreibende `execute_sql`. Lesen (SELECT, `list_tables`) ist erlaubt.
- `npm run db:*` und `npm run ki:analyse:*` laufen **nicht** mehr gegen Prod (Guard in `scripts/lib/prod-guard.mjs`). Ziel = Staging-Env.

Guard-Dateien: `scripts/lib/prod-guard.sh`, `scripts/lib/prod-guard.mjs`.

---

## Kanon-Regel: neue Migrationen

**Neue SQL-Migrationen nur noch in** `baerenwald-system/supabase/migrations`.

Der Ordner `baerenwald/supabase/migrations` ist **eingefroren**: nur lesen, nichts Neues anlegen, nichts umbenennen. Website-Stubs nicht löschen (Liste unten).

Live-Schema = Prod (Merge beider Historien). File-`db push` aus beiden Repos ist unmöglich (Zeitstempel-Kollisionen).

---

## Schritt 2 — Schema nach Staging (du führst das aus)

Voraussetzungen:

1. Staging-Projekt existiert (Ref `soqownnkxmtfgvsbrgsl`).
2. Connection strings aus beiden Dashboards: **Direct** oder Pooler **Session** (Port **5432**, nicht 6543).
3. `pg_dump` / `psql` (macOS: `brew install libpq`).
4. Env **nicht** aus `.env.local` (das zeigt auf Prod).

Datei: `scripts/staging/dump-prod-schema-to-staging.sh`  
(vollständiger Inhalt im Chat / in der Datei — bitte vor dem Lauf lesen.)

```bash
cd ~/code/baerenwald-system

export PROD_DB_URL='postgresql://postgres:[PROD-DB-PASS]@db.wnotlydvhsmfkhexgeol.supabase.co:5432/postgres'
export STAGING_PROJECT_REF='soqownnkxmtfgvsbrgsl'
export STAGING_DB_URL='postgresql://postgres:[STAGING-DB-PASS]@db.soqownnkxmtfgvsbrgsl.supabase.co:5432/postgres'
export STAGING_RESET_PUBLIC=yes

chmod +x scripts/staging/*.sh scripts/lib/prod-guard.sh
./scripts/staging/dump-prod-schema-to-staging.sh
```

Das Skript:

- dumpt **nur** `--schema-only --schema=public` (kein `auth`, kein `storage`, keine Zeilen)
- bricht ab, wenn Staging nicht `soqownnkxmtfgvsbrgsl` ist oder die Prod-Ref enthält
- bricht ab, wenn der Dump `COPY` oder `INSERT INTO` enthält
- mit `STAGING_RESET_PUBLIC=yes`: `DROP SCHEMA public CASCADE` **nur auf Staging**, dann Restore + Grants

Dump-Datei liegt unter `scripts/staging/dumps/` (gitignored).

---

## Schritt 3 — Buckets, dann Seed

`.env.staging` anlegen (Vorlage: `.env.staging.example`). Nie `.env.local` dafür verwenden.

```bash
export STAGING_PROJECT_REF='soqownnkxmtfgvsbrgsl'
export STAGING_DB_URL='postgresql://postgres:[STAGING-DB-PASS]@db.soqownnkxmtfgvsbrgsl.supabase.co:5432/postgres'
export STAGING_SUPABASE_URL='https://soqownnkxmtfgvsbrgsl.supabase.co'
export STAGING_SERVICE_ROLE_KEY='…'

./scripts/staging/apply-storage-buckets-staging.sh
node --env-file=.env.staging scripts/staging/seed-staging.mjs
```

Buckets: `scripts/sql/storage-buckets-crm-setup.sql` plus `scripts/staging/ensure-extra-storage-buckets.sql`  
(`angebote-pdfs`, `lead-notizen-fotos`, `lead-dokumente`, `kunden-dokumente`, `visualisierungen`, `ki-content`, `vertraege-pdfs`, `gpt-visualisierungen`, `handwerker-uploads`).

Auth-User liegen im Schema `auth` — die kommen **nicht** aus dem Dump, nur aus dem Seed.

---

## Test-Logins (Kunstdaten)

Fester CRM-Admin (auch im Code: `src/lib/auth/staging-admin.ts`).  
Auf der Staging-Loginseite vorausgefüllt, nur wenn die App an `soqownnkxmtfgvsbrgsl` hängt.

| Rolle | E-Mail | Passwort |
|---|---|---|
| **CRM-Admin** | `admin@staging.baerenwald.test` | `StagingTest!2026` |
| HV Nord / Süd / West | `hv-nord@example.test` · `hv-sued@example.test` · `hv-west@example.test` | `StagingTest!2026` |
| Mieter | `mieter-muster@example.test` | `StagingTest!2026` |
| Privat / Gewerbe | `familie.berger@example.test` · `cafe.giesing@example.test` | `StagingTest!2026` |
| Partner | `partner-elektro@example.test` · `-maler` · `-sanitaer` · `-dach` · `-boden` | `StagingTest!2026` |

Alle Kunden und Handwerker auf Staging bekommen ein Portal-Konto (`auth_user_id`, E-Mail bestätigt). Im CRM steht dann **Portal aktiv** mit Login — der Link geht auf **https://staging--baerenwald.netlify.app**, nicht auf die Live-Website.

Nachziehen ohne kompletten Seed:

```bash
node --env-file=.env.staging scripts/staging/register-portal-users.mjs
```

Seed (`scripts/staging/seed-staging.mjs`) legt an:

- 6 Kunden: 3 HV, 1 Mieter, 1 Privat (Berger), 1 Gewerbe (Café Giesing)
- 5 Handwerker: Elektro, Maler, Sanitär, Dach, Boden
- 7 Vorgänge: neu, kontaktiert, termin, angebot, auftrag, abgeschlossen, abgebrochen

Voraussetzung: Schema-Dump ist auf Staging (sonst fehlt `public.kunden`). Danach:

```bash
node --env-file=.env.staging scripts/staging/seed-staging.mjs
```

---

## Prod-Snapshot → Staging (`PRODSIM-`)

Für Ownership-/Historie-Tests (View–Action-Parität): echte **Struktur** aus Prod, **keine** Echtdaten.

```bash
# .env.staging: STAGING_* ; Prod-Lesen: PROD_SUPABASE_URL + PROD_SERVICE_ROLE_KEY
npm run staging:import-prodsim
# oder:
node --env-file=.env.staging scripts/staging/import-prod-snapshot.mjs
node --env-file=.env.staging scripts/staging/import-prod-snapshot.mjs --export-only
node --env-file=.env.staging scripts/staging/import-prod-snapshot.mjs --import-only
node --env-file=.env.staging scripts/staging/import-prod-snapshot.mjs --dry-run
```

| | |
|---|---|
| Tabellen | Kunden, Ansprechpartner, Objekte, Einheiten, Leads, Angebote, Aufträge, Rechnungen, Zuweisungen (`angebot_handwerker` / `auftrag_handwerker` + referenzierte Handwerker), Notiz-/Timeline-**Metadaten** |
| Nicht | Dokumente, Fotos, PDFs, Mail-Bodies, `email_log`, Storage |
| Anonym | Namen → Faker-Style, E-Mails → `prodsim-<hash>@example.test`, Telefon Dummy, Freitexte gekürzt, Tokens rotiert |
| Erhalten | IDs, Status, Beträge, Daten, FKs, `erstellt_von` / `created_by` |
| Kennung | Titel/Namen mit Präfix **`PRODSIM-`** (≠ `ZZTEST-`) |
| Artefakte | `scripts/staging/dumps/prodsim/snapshot-anonymized.json`, `import-report.json` (Zeilenzahlen + Anomalien = erstes Testergebnis) |

Prod bleibt read-only; Schreiben nur nach Staging-Guard (`soqownnkxmtfgvsbrgsl`).

### LEGACY-Edgecases (Alt-Daten-Simulation)

Direktes SQL an der App-Logik vorbei — Ownership, tote FKs, leere Altfelder, Alt-Status, halb-migriert, Extremwerte:

```bash
npm run staging:seed-legacy
# nur aufräumen:
node --env-file=.env.staging scripts/staging/seed-legacy-edgecases.mjs --purge-only
```

Präfix **`LEGACY-`**, feste UUIDs, idempotent. Report: `scripts/staging/dumps/legacy/legacy-seed-report.json`.  
Braucht `STAGING_DB_URL` (Port 5432) und bestehenden Handwerker/Gewerk-Seed.

---

## Leere Stub-Dateien (nicht löschen)

Bekannt, Inhalt leer bzw. 1 Byte. Bleiben liegen, damit Historie/ collidierende Timestamps nicht verschwinden.

**CRM** `baerenwald-system/supabase/migrations/`

- `20260726140000_abnahmeprotokoll_meta.sql`
- `20260728113706_vorgang_datenmodell_spec_w2.sql`
- `20260730120000_kalender_termine_kunde_id.sql`
- `20260803160000_hw_rechnung_eingang_status.sql`
- `20260820120000_handwerker_portal_gesperrt.sql`
- `20260902120000_todos.sql` (1 Byte)

**Website** `baerenwald/supabase/migrations/`

- `20260730120000_kunde_auftrag_aenderung.sql` (1 Byte)
- `20260801120200_lead_kanal_hv_werte.sql` (1 Byte; kanonischer Inhalt steht im CRM)
- `20260820120000_handwerker_portal_gesperrt.sql`
- `20260820130000_kunden_portal_gesperrt.sql`

---

## Dateien (dieser Schritt)

| Datei | Rolle |
|---|---|
| `scripts/lib/prod-guard.sh` / `.mjs` | Prod-Schreib-Abort |
| `scripts/staging/dump-prod-schema-to-staging.sh` | Dump Prod → Restore Staging |
| `scripts/staging/grants-after-schema-restore.sql` | Grants nach Restore |
| `scripts/staging/apply-sql-to-staging.sh` | SQL nur gegen Staging |
| `scripts/staging/apply-storage-buckets-staging.sh` | Buckets |
| `scripts/staging/ensure-extra-storage-buckets.sql` | Extra-Buckets |
| `scripts/staging/seed-staging.mjs` | Kunstdaten + Logins |
| `scripts/staging/register-portal-users.mjs` | Alle Kunden/Handwerker → Portal-Konten |
| `.env.staging.example` | Env-Vorlage ohne Secrets |
