#!/usr/bin/env bash
# Updates the infrastructure images, which OS patches do not touch; the app itself updates with each
# deploy. Schedule it with systemd/voxer-update-infra.timer.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"
exec 9>.deploy.lock
flock -w 600 9 || { echo "a deploy is running" >&2; exit 3; }

service_image() {
  docker compose config --format json | python3 -c "import sys, json; print(json.load(sys.stdin)['services'][sys.argv[1]]['image'])" "$1"
}
image_id() { docker image inspect -f '{{.Id}}' "$1" 2>/dev/null || echo none; }
running_id() { docker inspect -f '{{.Image}}' "$(docker compose ps -q "$1")" 2>/dev/null || echo none; }

for svc in $(docker compose config --services); do
  case "$svc" in app-*|migrate) continue ;; esac
  image="$(service_image "$svc")"
  docker pull -q "$image" >/dev/null
  [[ "$(image_id "$image")" == "$(running_id "$svc")" ]] && continue
  echo "updating $svc ($image)"
  if [[ "$svc" == postgres ]]; then
    # Restarting PostgreSQL takes a few seconds: show the maintenance page meanwhile.
    touch maintenance/ON
    trap 'rm -f maintenance/ON' EXIT
    docker compose up -d --no-deps postgres
    for _ in $(seq 1 60); do
      [[ "$(docker inspect -f '{{.State.Health.Status}}' "$(docker compose ps -q postgres)")" == healthy ]] && break
      sleep 2
    done
    rm -f maintenance/ON
  else
    docker compose up -d --no-deps "$svc"
  fi
done
docker image prune -f >/dev/null
echo "infrastructure up to date"
