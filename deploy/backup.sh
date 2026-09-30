#!/usr/bin/env bash
# Daily PostgreSQL backup to an S3-compatible bucket (keep it private and separate from media).
# Settings in backup.env, which only this script reads. Schedule it with systemd/voxer-backup.timer.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"
set -a; . ./backup.env; set +a
: "${BACKUP_BUCKET:?set BACKUP_BUCKET in backup.env}"
: "${BACKUP_S3_ENDPOINT:?set BACKUP_S3_ENDPOINT in backup.env}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

# Dead man's switch (healthchecks.io or similar): reports success, and failure through /fail.
ping_healthcheck() {
  [[ -n "${HEALTHCHECK_URL:-}" ]] || return 0
  curl -fsS -m 10 --retry 3 "$HEALTHCHECK_URL$1" >/dev/null || true
}
trap 'ping_healthcheck /fail' ERR

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="voxer-$STAMP.dump"

docker compose exec -T postgres pg_dump -U voxer -d voxer -Fc > "backups/$FILE"
# An empty or truncated dump must not rotate out the good ones.
[[ "$(stat -c %s "backups/$FILE")" -gt 10000 ]] || { echo "suspiciously small dump" >&2; exit 1; }

rclone() {
  docker run --rm -v "$PWD/backups:/backups" \
    -e RCLONE_CONFIG_REMOTE_TYPE=s3 \
    -e RCLONE_CONFIG_REMOTE_PROVIDER="${BACKUP_S3_PROVIDER:-Other}" \
    -e RCLONE_CONFIG_REMOTE_ACCESS_KEY_ID="$BACKUP_S3_ACCESS_KEY_ID" \
    -e RCLONE_CONFIG_REMOTE_SECRET_ACCESS_KEY="$BACKUP_S3_SECRET_ACCESS_KEY" \
    -e RCLONE_CONFIG_REMOTE_ENDPOINT="$BACKUP_S3_ENDPOINT" \
    -e RCLONE_CONFIG_REMOTE_NO_CHECK_BUCKET=true \
    rclone/rclone:1 -q "$@"
}

rclone copyto "/backups/$FILE" "remote:$BACKUP_BUCKET/$FILE"
rclone delete --min-age "${RETENTION_DAYS}d" "remote:$BACKUP_BUCKET"
# Keep the last three on disk for a quick restore without downloading.
ls -1t backups/voxer-*.dump | tail -n +4 | xargs -r rm -f
ping_healthcheck ""
echo "backup ok: $FILE"
