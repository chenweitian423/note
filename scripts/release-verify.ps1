$ErrorActionPreference = "Stop"

function Run-Step {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,

    [Parameter(Mandatory = $true)]
    [scriptblock]$Command
  )

  Write-Host "==> $Name"
  & $Command
}

function Remove-PathIfPresent {
  param([Parameter(Mandatory = $true)][string]$LiteralPath)

  if (Test-Path -LiteralPath $LiteralPath) {
    try {
      Remove-Item -LiteralPath $LiteralPath -Recurse -Force -ErrorAction Stop
    } catch {
      if (Test-Path -LiteralPath $LiteralPath) {
        throw
      }
    }
  }
}

Remove-PathIfPresent ".next"
Remove-PathIfPresent ".test-data"
Remove-PathIfPresent "test-results"

Run-Step "npm run test" { npm run test }
Run-Step "npm run e2e" { npm run e2e }
Run-Step "npm run build" { npm run build }

$localEnv = ".env.local"
if (!(Test-Path -LiteralPath $localEnv)) {
  if (Test-Path -LiteralPath ".env.local.example") {
    Copy-Item -LiteralPath ".env.local.example" -Destination $localEnv
  } else {
    throw "Missing .env.local and .env.local.example. Create one before Docker verification."
  }
}

Run-Step "docker compose config" {
  docker compose -p online-notepad -f docker-compose.yml -f docker-compose.local.yml --env-file $localEnv config
}
