#!/usr/bin/env bash
# =============================================================================
# SCHEMA-WEG A — Prod-Schema (ohne Daten) nach Staging
# =============================================================================
# Prod  (wnotlydvhsmfkhexgeol): NUR LESEN  — pg_dump --schema-only
# Staging (soqownnkxmtfgvsbrgsl / 2503565e-8a02-4af4-bed6-e240a544235d): SCHREIBEN — psql Restore
#
# Dieses Skript:
#   - dumpt ausschließlich Schema public (keine Zeilen, kein auth, kein storage)
#   - bricht ab, wenn die Staging-URL/Ref die Prod-Ref enthält
#   - bricht ab, wenn der Dump COPY/INSERT (Daten) enthält
#   - schreibt niemals „gegen die verbundene DB“ — Ziel nur über explizite Env
#
# NICHT ausführen, bevor die Env-Werte unten gesetzt sind.
# Direkte Verbindung (Port 5432) oder Pooler Session-Mode — nicht Transaction :6543.
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../lib/prod-guard.sh
source "$SCRIPT_DIR/../lib/prod-guard.sh"
load_env_staging

find_bin() {
  local name="$1"
  if command -v "$name" >/dev/null 2>&1; then
    command -v "$name"
    return 0
  fi
  local p
  for p in \
    /opt/homebrew/opt/libpq/bin \
    /usr/local/opt/libpq/bin \
    /Applications/Postgres.app/Contents/Versions/latest/bin
  do
    if [[ -x "$p/$name" ]]; then
      echo "$p/$name"
      return 0
    fi
  done
  echo "ABORT: $name nicht gefunden. macOS: brew install libpq && brew link --force libpq" >&2
  exit 1
}

PG_DUMP="$(find_bin pg_dump)"
PSQL="$(find_bin psql)"

# --- Pflicht-Env (kein Default auf .env.local / linked project) --------------
: "${PROD_DB_URL:?ABORT: PROD_DB_URL setzen (Prod Direct/Session URI, nur Lesen)}"
: "${STAGING_DB_URL:?ABORT: STAGING_DB_URL setzen (Staging Direct/Session URI)}"
: "${STAGING_PROJECT_REF:=$STAGING_PROJECT_REF_CANON}"

assert_prod_read_source
assert_staging_write_target

if [[ "$STAGING_DB_URL" == "$PROD_DB_URL" ]]; then
  echo "ABORT: STAGING_DB_URL und PROD_DB_URL sind identisch." >&2
  exit 1
fi

# Transaction-Pooler (6543) ist für pg_dump/psql ungeeignet
if [[ "$PROD_DB_URL" == *":6543/"* ]] || [[ "$STAGING_DB_URL" == *":6543/"* ]]; then
  echo "ABORT: Port 6543 (Transaction-Pooler) nicht für Dump/Restore nutzen." >&2
  echo "       Database → Connection string → Session mode (5432) oder Direct." >&2
  exit 1
fi

DUMP_DIR="${DUMP_DIR:-$SCRIPT_DIR/dumps}"
mkdir -p "$DUMP_DIR"
DUMP_FILE="${DUMP_FILE:-$DUMP_DIR/public-schema-only.sql}"
RESET_PUBLIC="${STAGING_RESET_PUBLIC:-}"

echo "==> Quelle (READ): Prod $PROD_PROJECT_REF"
echo "==> Ziel  (WRITE): Staging $STAGING_PROJECT_REF"
echo "==> pg_dump: $PG_DUMP"
echo "==> psql:    $PSQL"
echo "==> Dump:    $DUMP_FILE"

# --- 1) Schema-only Dump (public, keine Daten) -------------------------------
echo "==> Dump --schema-only --schema=public (kein --data)"
"$PG_DUMP" "$PROD_DB_URL" \
  --format=plain \
  --schema-only \
  --no-owner \
  --no-privileges \
  --schema=public \
  --file="$DUMP_FILE"

if [[ ! -s "$DUMP_FILE" ]]; then
  echo "ABORT: Dump-Datei ist leer." >&2
  exit 1
fi

DUMP_BYTES="$(wc -c < "$DUMP_FILE" | tr -d ' ')"
if [[ "$DUMP_BYTES" -lt 10000 ]]; then
  echo "ABORT: Dump ist verdächtig klein ($DUMP_BYTES Bytes). Abbruch." >&2
  exit 1
fi

# CREATE SCHEMA public würde auf Staging kollidieren
# (portable, ohne GNU-sed -i)
STRIPPED="${DUMP_FILE}.stripped"
grep -v -E '^CREATE SCHEMA public;|^ALTER SCHEMA public |^COMMENT ON SCHEMA public ' \
  "$DUMP_FILE" > "$STRIPPED" || true
mv "$STRIPPED" "$DUMP_FILE"

# Daten-Leck: schema-only darf kein COPY und kein INSERT enthalten
if grep -E '^COPY |^INSERT INTO ' "$DUMP_FILE" >/dev/null; then
  echo "ABORT: Dump enthält COPY oder INSERT INTO — das wären Daten. Nicht einspielen." >&2
  grep -n -E '^COPY |^INSERT INTO ' "$DUMP_FILE" | head -n 20 >&2
  exit 1
fi

echo "==> Dump OK ($DUMP_BYTES Bytes, keine COPY/INSERT-Zeilen)"

# --- 2) Optional: public auf Staging leeren (nur mit explizitem Flag) --------
if [[ "$RESET_PUBLIC" == "yes" ]]; then
  echo "==> STAGING_RESET_PUBLIC=yes → DROP SCHEMA public auf Staging"
  "$PSQL" "$STAGING_DB_URL" -v ON_ERROR_STOP=1 <<'SQL'
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT CREATE ON SCHEMA public TO postgres;
SQL
else
  echo "==> Hinweis: ohne STAGING_RESET_PUBLIC=yes kann Restore an bestehenden Objekten scheitern."
fi

# --- 3) Restore nur gegen Staging --------------------------------------------
echo "==> Restore nach Staging"
"$PSQL" "$STAGING_DB_URL" -v ON_ERROR_STOP=1 -f "$DUMP_FILE"

echo "==> Grants nach Restore"
"$PSQL" "$STAGING_DB_URL" -v ON_ERROR_STOP=1 -f "$SCRIPT_DIR/grants-after-schema-restore.sql"

echo "==> Fertig. Nächster Schritt: Storage-Buckets, dann Seed (docs/STAGING.md)."
