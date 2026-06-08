$ErrorActionPreference = "Stop"

$AgentsPath = "AGENTS.md"
if (!(Test-Path -LiteralPath $AgentsPath)) {
  throw "AGENTS.md not found."
}

function Decode-Utf8Base64 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Value
  )

  return [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($Value))
}

$validMarker = Decode-Utf8Base64 "QWdlbnQg6aG555uu6K+05piO"
$versionTemplate = Decode-Utf8Base64 "LSDlvZPliY3niYjmnKzvvJpgezB9YOOAgg=="
$commitTemplate = Decode-Utf8Base64 "LSDlvZPliY3mnIDmlrDmj5DkuqTvvJpgezB9IHsxfWDjgII="
$tagTemplate = Decode-Utf8Base64 "LSDlvZPliY3mnIDmlrAgdGFn77yaYHswfWDvvIzlj5HluIPlrozmiJDlkI7lupTlt7LmjqjpgIHliLAgR2l0SHVi44CC"
$healthOkTemplate = Decode-Utf8Base64 "LSDmnIDov5HkuIDmrKHnoa7orqTvvJrov5znq68gYC9hcGkvaGVhbHRoYCDov5Tlm54gYG9rOiB0cnVlYO+8jOeJiOacrOS4uiBgezB9YO+8jOiHquWKqOWkh+S7veW8gOWQr+S4lOaXoOacgOi/kemUmeivr+OAgg=="
$healthFailLine = Decode-Utf8Base64 "LSDmnIDov5HkuIDmrKHnoa7orqTvvJrov5znq68gYC9hcGkvaGVhbHRoYCDmmoLmnKrmo4Dmn6XmiJDlip/vvIzor7flnKjlj5HluIPlkI7miYvliqjnoa7orqTjgII="

$package = Get-Content -LiteralPath "package.json" -Raw | ConvertFrom-Json
$version = $package.version
if (!$version) {
  throw "Could not read package.json version."
}

$commit = (git rev-parse --short HEAD).Trim()
if (!$commit) {
  throw "Could not resolve current commit."
}

$commitSubject = (git log -1 --pretty=%s).Trim()

$tag = (git describe --tags --abbrev=0 2>$null).Trim()
if (!$tag) {
  $tag = "(none)"
}

$healthVersion = $null
try {
  $health = Invoke-RestMethod -Uri "http://192.168.123.195:31300/api/health" -TimeoutSec 10
  if ($health.ok) {
    $healthVersion = [string]$health.version
  }
} catch {
  $healthVersion = $null
}

$resolvedPath = (Resolve-Path -LiteralPath $AgentsPath).Path
$content = [System.IO.File]::ReadAllText($resolvedPath, [System.Text.Encoding]::UTF8)

if (!$content.Contains($validMarker)) {
  throw "AGENTS.md does not look like valid Chinese UTF-8 content. Restore the file before updating handoff fields."
}

$lines = [System.Collections.Generic.List[string]]::new()
$lines.AddRange([string[]]($content -split "`r?`n", -1))

$remoteTargetIndex = -1
for ($i = 0; $i -lt $lines.Count; $i += 1) {
  if ($lines[$i].Contains("192.168.123.195:31300")) {
    $remoteTargetIndex = $i
    break
  }
}

if ($remoteTargetIndex -lt 0) {
  throw "Could not locate handoff remote target entry in AGENTS.md."
}

$versionIndex = $remoteTargetIndex - 4
$commitIndex = $remoteTargetIndex - 2
$tagIndex = $remoteTargetIndex - 1
$healthIndex = $remoteTargetIndex + 2

foreach ($index in @($versionIndex, $commitIndex, $tagIndex, $healthIndex)) {
  if ($index -lt 0 -or $index -ge $lines.Count) {
    throw "AGENTS.md handoff section has an unexpected shape."
  }
}

$lines[$versionIndex] = $versionTemplate -f $version
$lines[$commitIndex] = $commitTemplate -f $commit, $commitSubject
$lines[$tagIndex] = $tagTemplate -f $tag
if ($healthVersion) {
  $lines[$healthIndex] = $healthOkTemplate -f $healthVersion
} else {
  $lines[$healthIndex] = $healthFailLine
}

$updated = [string]::Join("`r`n", $lines)
$utf8Bom = New-Object System.Text.UTF8Encoding($true)
[System.IO.File]::WriteAllText($resolvedPath, $updated, $utf8Bom)

Write-Host "Updated AGENTS.md handoff: version $version, commit $commit, tag $tag."
