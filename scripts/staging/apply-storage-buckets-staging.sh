#!/usr/bin/env bash
# Storage-Buckets auf Staging anlegen (kein Prod).
# Reihenfolge: CRM-Setup aus scripts/sql/, dann Extra-Buckets, die der Code erwartet.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

exec "$SCRIPT_DIR/apply-sql-to-staging.sh" \
  "$ROOT/scripts/sql/storage-buckets-crm-setup.sql" \
  "$SCRIPT_DIR/ensure-extra-storage-buckets.sql"
