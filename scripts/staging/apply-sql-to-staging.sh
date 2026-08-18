#!/usr/bin/env bash
# Wendet eine oder mehrere .sql-Dateien NUR auf Staging an.
# Kein Fallback auf .env.local / „verbundene DB“.
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
  echo "ABORT: $name nicht gefunden. brew install libpq" >&2
  exit 1
}

: "${STAGING_DB_URL:?ABORT: STAGING_DB_URL setzen}"
: "${STAGING_PROJECT_REF:=$STAGING_PROJECT_REF_CANON}"
assert_staging_write_target

if [[ "$#" -lt 1 ]]; then
  echo "Nutzung: $0 datei.sql [weitere.sql ...]" >&2
  exit 1
fi

PSQL="$(find_bin psql)"
for f in "$@"; do
  if [[ ! -f "$f" ]]; then
    echo "ABORT: Datei nicht gefunden: $f" >&2
    exit 1
  fi
  echo "==> Staging SQL: $f"
  "$PSQL" "$STAGING_DB_URL" -v ON_ERROR_STOP=1 -f "$f"
done
echo "==> Fertig."
