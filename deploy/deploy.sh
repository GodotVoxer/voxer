#!/usr/bin/env bash
# Zero-downtime deploy of an image tag: migrate, then replace app-blue and app-green one at a time,
# rolling a copy back if it does not become healthy. Usage: ./deploy.sh <tag>
# CI can call it over SSH with a key whose authorized_keys forces this script; the tag then arrives
# in SSH_ORIGINAL_COMMAND and is the only input, so it is validated.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"
env_value() { grep -m1 "^$1=" .env | cut -d= -f2- || true; }
VOXER_IMAGE_REPO="$(env_value VOXER_IMAGE_REPO)"
[[ -n "$VOXER_IMAGE_REPO" ]] || { echo "set VOXER_IMAGE_REPO in .env (e.g. ghcr.io/you/voxer)" >&2; exit 2; }

TAG="${1:-${SSH_ORIGINAL_COMMAND:-}}"
if [[ ! "$TAG" =~ ^[0-9a-f]{7,40}$ ]]; then
  echo "invalid tag: '$TAG'" >&2
  exit 2
fi

exec 9>.deploy.lock
flock -n 9 || { echo "a deploy is already running" >&2; exit 3; }

IMAGE="$VOXER_IMAGE_REPO:$TAG"
PREVIOUS="$(cat .current-image 2>/dev/null || echo "$VOXER_IMAGE_REPO:latest")"

docker pull -q "$IMAGE" >/dev/null
docker pull -q "$VOXER_IMAGE_REPO-migrate:$TAG" >/dev/null

# Migrations run before touching the app, so they must work with the version still running.
VOXER_MIGRATE_IMAGE="$VOXER_IMAGE_REPO-migrate:$TAG" docker compose --profile tools run --rm migrate

wait_healthy() {
  local svc="$1" id status
  for _ in $(seq 1 60); do
    id="$(docker compose ps -q "$svc")"
    status="$(docker inspect -f '{{.State.Health.Status}}' "$id" 2>/dev/null || echo starting)"
    [[ "$status" == healthy ]] && return 0
    sleep 3
  done
  return 1
}

for svc in app-blue app-green; do
  VOXER_IMAGE="$IMAGE" docker compose up -d --no-deps "$svc"
  if ! wait_healthy "$svc"; then
    echo "$svc is not healthy with $IMAGE; rolling back to $PREVIOUS" >&2
    docker compose logs --tail 50 "$svc" >&2 || true
    VOXER_IMAGE="$PREVIOUS" docker compose up -d --no-deps "$svc"
    exit 1
  fi
done

# A CDN caching static pages would keep serving the previous HTML, which points at chunks that no
# longer exist.
CLOUDFLARE_PURGE_TOKEN="$(env_value CLOUDFLARE_PURGE_TOKEN)"
CLOUDFLARE_ZONE_ID="$(env_value CLOUDFLARE_ZONE_ID)"
CLOUDFLARE_PURGE_HOSTS="$(env_value CLOUDFLARE_PURGE_HOSTS)"
if [[ -n "$CLOUDFLARE_PURGE_TOKEN" && -n "$CLOUDFLARE_ZONE_ID" ]]; then
  purge() {
    curl -fsS -X POST "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/purge_cache" \
      -H "Authorization: Bearer $CLOUDFLARE_PURGE_TOKEN" -H "Content-Type: application/json" -d "$1" >/dev/null
  }
  if [[ -n "$CLOUDFLARE_PURGE_HOSTS" ]]; then
    hosts="$(printf '"%s",' ${CLOUDFLARE_PURGE_HOSTS//,/ })"
    purge "{\"hosts\":[${hosts%,}]}" || purge '{"purge_everything":true}' ||
      echo "WARNING: could not purge the Cloudflare cache" >&2
  else
    purge '{"purge_everything":true}' || echo "WARNING: could not purge the Cloudflare cache" >&2
  fi
fi

echo "$IMAGE" > .current-image
# So that a server reboot starts this version rather than `latest`.
sed -i "s|^VOXER_IMAGE=.*|VOXER_IMAGE=$IMAGE|" .env
docker image prune -f --filter "until=168h" >/dev/null
echo "deploy ok: $IMAGE"
