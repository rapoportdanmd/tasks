#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB_PATH="${DB_PATH:-"$ROOT_DIR/tasks.db"}"
BACKUP_DIR="${BACKUP_DIR:-"$ROOT_DIR/backups"}"
TIMESTAMP="$(date +"%Y-%m-%d_%H-%M-%S")"
DB_BASENAME="$(basename "$DB_PATH")"
BACKUP_PATH="$BACKUP_DIR/${DB_BASENAME%.db}_$TIMESTAMP.db"

mkdir -p "$BACKUP_DIR"

if [[ ! -f "$DB_PATH" ]]; then
  echo "Database file not found: $DB_PATH" >&2
  exit 1
fi

sqlite3 "$DB_PATH" ".backup '$BACKUP_PATH'"
echo "SQLite backup created at: $BACKUP_PATH"
