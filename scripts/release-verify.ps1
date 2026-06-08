param(
  [switch]$SkipE2E,
  [switch]$SkipDocker,
  [switch]$OnlyDocker,
  [switch]$DockerUp
)

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

function Ensure-LocalEnv {
  $localEnv = ".env.local"
  if (!(Test-Path -LiteralPath $localEnv)) {
    if (Test-Path -LiteralPath ".env.local.example") {
      Copy-Item -LiteralPath ".env.local.example" -Destination $localEnv
    } else {
      throw "Missing .env.local and .env.local.example. Create one before Docker verification."
    }
  }

  return $localEnv
}

function Get-ComposeArgs {
  param([Parameter(Mandatory = $true)][string]$LocalEnv)

  return @(
    "compose",
    "-p",
    "online-notepad",
    "-f",
    "docker-compose.yml",
    "-f",
    "docker-compose.local.yml",
    "--env-file",
    $LocalEnv
  )
}

function Invoke-HealthCheck {
  param(
    [string]$Uri = "http://127.0.0.1:31300/api/health",
    [int]$Attempts = 30,
    [int]$DelaySeconds = 2
  )

  for ($attempt = 1; $attempt -le $Attempts; $attempt += 1) {
    try {
      $health = Invoke-RestMethod -Uri $Uri -TimeoutSec 5
      if ($health.ok) {
        Write-Host "Health check passed: $Uri"
        return
      }
    } catch {
      if ($attempt -eq $Attempts) {
        throw
      }
    }

    Start-Sleep -Seconds $DelaySeconds
  }

  throw "Health check did not pass: $Uri"
}

if (!$OnlyDocker) {
  Remove-PathIfPresent ".next"
  Remove-PathIfPresent ".test-data"
  Remove-PathIfPresent "test-results"

  Run-Step "npm run test" { npm run test }

  if (!$SkipE2E) {
    Run-Step "npm run e2e" { npm run e2e }
  }

  Run-Step "npm run build" { npm run build }
}

if (!$SkipDocker) {
  $localEnv = Ensure-LocalEnv
  $composeArgs = Get-ComposeArgs $localEnv

  Run-Step "docker compose config" {
    & docker @composeArgs config
  }

  if ($DockerUp) {
    try {
      Run-Step "docker compose up -d --build" {
        & docker @composeArgs up -d --build
      }
      Run-Step "local health check" {
        Invoke-HealthCheck
      }
    } finally {
      Run-Step "docker compose down -v --remove-orphans" {
        & docker @composeArgs down -v --remove-orphans
      }
    }
  }
}
