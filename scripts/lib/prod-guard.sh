#!/usr/bin/env bash
# Harte Regel: Prod-Supabase ist READ-ONLY.
# Von Schreib-Skripten sourcen:  source "$(dirname "$0")/../lib/prod-guard.sh"
# (Pfad anpassen, wenn das Skript nicht in scripts/staging/ liegt.)

PROD_PROJECT_REF="wnotlydvhsmfkhexgeol"
STAGING_PROJECT_ID_CANON="2503565e-8a02-4af4-bed6-e240a544235d"
STAGING_PROJECT_REF_CANON="soqownnkxmtfgvsbrgsl"

# Nur .env.staging — niemals .env.local (Prod).
load_env_staging() {
  local root f
  root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
  f="$root/.env.staging"
  if [[ -f "$f" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$f"
    set +a
    echo "==> Env geladen: $f"
  fi
}

assert_not_prod_write() {
  local label="${1:-Ziel}"
  shift
  local blob="$*"
  if [[ "$blob" == *"$PROD_PROJECT_REF"* ]]; then
    echo "ABORT: $label enthält Prod-Ref $PROD_PROJECT_REF. Schreibzugriff ist verboten." >&2
    exit 1
  fi
}

assert_staging_write_target() {
  local ref="${STAGING_PROJECT_REF:-}"
  local id="${STAGING_PROJECT_ID:-}"
  local urls="${STAGING_DB_URL:-} ${STAGING_SUPABASE_URL:-}"
  local blob="${id} ${ref} ${urls}"

  if [[ -z "${ref}${STAGING_DB_URL:-}${STAGING_SUPABASE_URL:-}" ]]; then
    echo "ABORT: STAGING_PROJECT_REF oder STAGING_DB_URL / STAGING_SUPABASE_URL müssen explizit gesetzt sein (kein Fallback auf eine verbundene DB)." >&2
    exit 1
  fi

  assert_not_prod_write "Staging-Ziel" "$blob"

  if [[ -n "$ref" && "$ref" != "$STAGING_PROJECT_REF_CANON" ]]; then
    echo "ABORT: STAGING_PROJECT_REF muss $STAGING_PROJECT_REF_CANON sein, ist: $ref" >&2
    exit 1
  fi

  if [[ -n "$id" && "$id" != "$STAGING_PROJECT_ID_CANON" ]]; then
    echo "ABORT: STAGING_PROJECT_ID muss $STAGING_PROJECT_ID_CANON sein, ist: $id" >&2
    exit 1
  fi

  if [[ "$blob" != *"$STAGING_PROJECT_REF_CANON"* ]]; then
    echo "ABORT: Staging-Ziel muss die Project-Ref $STAGING_PROJECT_REF_CANON enthalten." >&2
    exit 1
  fi

  if [[ -n "${STAGING_DB_URL:-}${STAGING_SUPABASE_URL:-}" && "$urls" != *"$STAGING_PROJECT_REF_CANON"* ]]; then
    echo "ABORT: STAGING_DB_URL / STAGING_SUPABASE_URL müssen $STAGING_PROJECT_REF_CANON enthalten." >&2
    exit 1
  fi
}

assert_prod_read_source() {
  local url="${PROD_DB_URL:-}"
  if [[ -z "$url" ]]; then
    echo "ABORT: PROD_DB_URL muss explizit gesetzt sein (Dump nur von Prod, Read-only)." >&2
    exit 1
  fi
  if [[ "$url" != *"$PROD_PROJECT_REF"* ]]; then
    echo "ABORT: PROD_DB_URL muss die Prod-Ref $PROD_PROJECT_REF enthalten (sonst falsche Quelle)." >&2
    exit 1
  fi
}
