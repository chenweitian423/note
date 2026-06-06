#!/usr/bin/env bash
set -euo pipefail

HOST="${HOST:-sky195}"
BASE_DIR="/opt/online-notepad"
APP_DIR="${BASE_DIR}/app"
ENV_FILE="${BASE_DIR}/.env"
if [ ! -f "package.json" ] || [ ! -f "docker-compose.yml" ]; then
  echo "Run this script from the online-notepad repository root." >&2
  exit 1
fi

tar \
  --exclude='.git' \
  --exclude='.worktrees' \
  --exclude='.tools' \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='coverage' \
  --exclude='playwright-report' \
  --exclude='test-results' \
  --exclude='.test-data' \
  --exclude='.env' \
  -cf - . | ssh "${HOST}" "set -euo pipefail
mkdir -p '${APP_DIR}'
tar -xf - -C '${APP_DIR}'
test -f '${ENV_FILE}' || {
  echo 'Missing ${ENV_FILE}. Create it before deploying.' >&2
  exit 1
}
cd '${APP_DIR}'
docker compose -p online-notepad up -d --build
for attempt in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS http://127.0.0.1:31300/api/health 2>/dev/null; then
    exit 0
  fi
  sleep 2
done
curl -fsS http://127.0.0.1:31300/api/health
"
