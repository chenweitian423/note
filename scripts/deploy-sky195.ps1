$ErrorActionPreference = "Stop"

$HostName = if ($env:HOST) { $env:HOST } else { "sky195" }
$BaseDir = "/opt/online-notepad"
$AppDir = "$BaseDir/app"
$EnvFile = "$BaseDir/.env"
$Archive = Join-Path $env:TEMP "online-notepad-deploy.tar"
$LocalCommit = git rev-parse --short HEAD

if (!(Test-Path -LiteralPath "package.json") -or !(Test-Path -LiteralPath "docker-compose.yml")) {
  throw "Run this script from the online-notepad repository root."
}

$ExpectedVersion = (Get-Content -LiteralPath "package.json" -Raw | ConvertFrom-Json).version
if (!$ExpectedVersion) {
  throw "Could not read package.json version."
}

if ($env:ALLOW_DIRTY_DEPLOY -ne "1") {
  $Dirty = git status --porcelain
  if ($Dirty) {
    throw "Working tree has uncommitted changes. Commit or stash them before deploying, or set ALLOW_DIRTY_DEPLOY=1 to override."
  }
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

$RemoteScript = @'
set -euo pipefail
mkdir -p '__APP_DIR__'
tar -xf /tmp/online-notepad-deploy.tar -C '__APP_DIR__'
rm -f /tmp/online-notepad-deploy.tar
test -f '__ENV_FILE__' || {
  echo 'Missing __ENV_FILE__. Create it before deploying.' >&2
  exit 1
}
cd '__APP_DIR__'
docker compose -p online-notepad up -d --build
export EXPECTED_VERSION='__EXPECTED_VERSION__'
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
printf 'Commit: __LOCAL_COMMIT__\n'
printf 'Health: http://127.0.0.1:31300/api/health\n'
docker compose -p online-notepad ps
'@

$RemoteScript = $RemoteScript.Replace("__APP_DIR__", $AppDir).Replace("__ENV_FILE__", $EnvFile).Replace("__EXPECTED_VERSION__", $ExpectedVersion).Replace("__LOCAL_COMMIT__", $LocalCommit).Replace("`r`n", "`n")
$RemoteScript | ssh $HostName "bash -s"

Remove-Item -LiteralPath $Archive -Force
