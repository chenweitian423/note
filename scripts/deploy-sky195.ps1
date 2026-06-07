$ErrorActionPreference = "Stop"

$HostName = if ($env:HOST) { $env:HOST } else { "sky195" }
$BaseDir = "/opt/online-notepad"
$AppDir = "$BaseDir/app"
$EnvFile = "$BaseDir/.env"
$Archive = Join-Path $env:TEMP "online-notepad-deploy.tar"

if (!(Test-Path -LiteralPath "package.json") -or !(Test-Path -LiteralPath "docker-compose.yml")) {
  throw "Run this script from the online-notepad repository root."
}

$ExpectedVersion = (Get-Content -LiteralPath "package.json" -Raw | ConvertFrom-Json).version
if (!$ExpectedVersion) {
  throw "Could not read package.json version."
}

if (Test-Path -LiteralPath $Archive) {
  Remove-Item -LiteralPath $Archive -Force
}

tar `
  --exclude=.git `
  --exclude=.worktrees `
  --exclude=.tools `
  --exclude=node_modules `
  --exclude=.next `
  --exclude=coverage `
  --exclude=playwright-report `
  --exclude=test-results `
  --exclude=.test-data `
  --exclude=.env `
  -cf $Archive .

scp $Archive "${HostName}:/tmp/online-notepad-deploy.tar"

ssh $HostName @"
set -euo pipefail
mkdir -p '$AppDir'
tar -xf /tmp/online-notepad-deploy.tar -C '$AppDir'
rm -f /tmp/online-notepad-deploy.tar
test -f '$EnvFile' || {
  echo 'Missing $EnvFile. Create it before deploying.' >&2
  exit 1
}
cd '$AppDir'
docker compose -p online-notepad up -d --build
export EXPECTED_VERSION='$ExpectedVersion'
for attempt in 1 2 3 4 5 6 7 8 9 10; do
  HEALTH_JSON="\$(curl -fsS http://127.0.0.1:31300/api/health 2>/dev/null || true)"
  if [ -n "\${HEALTH_JSON}" ] && HEALTH_JSON="\${HEALTH_JSON}" python3 -c 'import json, os; data=json.loads(os.environ["HEALTH_JSON"]); raise SystemExit(0 if data.get("ok") and data.get("version") == os.environ["EXPECTED_VERSION"] else 1)' 2>/dev/null; then
    printf '%s\n' "\${HEALTH_JSON}"
    exit 0
  fi
  sleep 2
done
HEALTH_JSON="\$(curl -fsS http://127.0.0.1:31300/api/health)"
printf '%s\n' "\${HEALTH_JSON}"
HEALTH_JSON="\${HEALTH_JSON}" python3 -c 'import json, os; data=json.loads(os.environ["HEALTH_JSON"]); raise SystemExit(0 if data.get("ok") and data.get("version") == os.environ["EXPECTED_VERSION"] else 1)'
"@

Remove-Item -LiteralPath $Archive -Force
