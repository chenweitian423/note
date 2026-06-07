#!/usr/bin/env bash
set -euo pipefail

HOST="${HOST:-${APP_HOST:-}}"
BASE_DIR="/opt/online-notepad"
APP_DIR="${BASE_DIR}/app"
ENV_FILE="${BASE_DIR}/.env"
ARCHIVE="${TMPDIR:-/tmp}/online-notepad-deploy.tar"
LOCAL_COMMIT="$(git rev-parse --short HEAD)"
if [ ! -f "package.json" ] || [ ! -f "docker-compose.yml" ]; then
  echo "Run this script from the online-notepad repository root." >&2
  exit 1
fi
if [ -z "${HOST}" ]; then
  echo "Set HOST or APP_HOST to the remote SSH host before deploying." >&2
  exit 1
fi
EXPECTED_VERSION="$(sed -n 's/.*"version": "\([^"]*\)".*/\1/p' package.json | head -n 1)"
if [ -z "${EXPECTED_VERSION}" ]; then
  echo "Could not read package.json version." >&2
  exit 1
fi
if [ "${ALLOW_DIRTY_DEPLOY:-0}" != "1" ] && [ -n "$(git status --porcelain)" ]; then
  echo "Working tree has uncommitted changes. Commit or stash them before deploying, or set ALLOW_DIRTY_DEPLOY=1 to override." >&2
  exit 1
fi

rm -f "${ARCHIVE}"
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
  -cf "${ARCHIVE}" .

scp "${ARCHIVE}" "${HOST}:/tmp/online-notepad-deploy.tar"

ssh "${HOST}" "APP_DIR='${APP_DIR}' ENV_FILE='${ENV_FILE}' EXPECTED_VERSION='${EXPECTED_VERSION}' LOCAL_COMMIT='${LOCAL_COMMIT}' bash -s" <<'EOF'
set -euo pipefail
mkdir -p "${APP_DIR}"
tar -xf /tmp/online-notepad-deploy.tar -C "${APP_DIR}"
rm -f /tmp/online-notepad-deploy.tar
test -f "${ENV_FILE}" || {
  echo "Missing ${ENV_FILE}. Create it before deploying." >&2
  exit 1
}
cd "${APP_DIR}"
docker compose -p online-notepad up -d --build
for attempt in 1 2 3 4 5 6 7 8 9 10; do
  HEALTH_JSON="$(curl -fsS http://127.0.0.1:31300/api/health 2>/dev/null || true)"
  if [ -n "${HEALTH_JSON}" ] && printf '%s' "${HEALTH_JSON}" | python3 -c 'import json, os, sys; data=json.load(sys.stdin); raise SystemExit(0 if data.get("ok") and data.get("version") == os.environ["EXPECTED_VERSION"] else 1)' 2>/dev/null; then
    break
  fi
  HEALTH_JSON=''
  sleep 2
done
if [ -z "${HEALTH_JSON:-}" ]; then
  HEALTH_JSON="$(curl -fsS http://127.0.0.1:31300/api/health)"
  printf '%s' "${HEALTH_JSON}" | python3 -c 'import json, os, sys; data=json.load(sys.stdin); raise SystemExit(0 if data.get("ok") and data.get("version") == os.environ["EXPECTED_VERSION"] else 1)'
fi
printf '%s\n' "${HEALTH_JSON}"
printf '\nDeployment summary\n'
printf 'Version: %s\n' "${EXPECTED_VERSION}"
printf 'Commit: %s\n' "${LOCAL_COMMIT}"
printf 'Health: http://127.0.0.1:31300/api/health\n'
docker compose -p online-notepad ps
EOF

rm -f "${ARCHIVE}"
