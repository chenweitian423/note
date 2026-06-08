param(
  [Parameter(Mandatory = $true)]
  [string]$Version,

  [switch]$Yes
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

if ($Version -notmatch '^\d+\.\d+\.\d+$') {
  throw "Version must use MAJOR.MINOR.PATCH, for example 0.4.14."
}

$package = Get-Content -LiteralPath "package.json" -Raw | ConvertFrom-Json
$packageLock = Get-Content -LiteralPath "package-lock.json" -Raw | ConvertFrom-Json
$changelog = Get-Content -LiteralPath "CHANGELOG.md" -Raw

if ($package.version -ne $Version) {
  throw "package.json version is $($package.version), expected $Version."
}

$lockRoot = $packageLock.packages.PSObject.Properties[""].Value
if ($packageLock.version -ne $Version -or $lockRoot.version -ne $Version) {
  throw "package-lock.json root version must be $Version."
}

if ($changelog -notmatch "## $([regex]::Escape($Version)) - ") {
  throw "CHANGELOG.md does not contain a section for $Version."
}

$status = git status --porcelain
if ($status) {
  throw "Working tree is not clean. Commit or stash changes before releasing."
}

Run-Step "update AGENTS handoff" { powershell -NoProfile -ExecutionPolicy Bypass -File scripts/update-handoff.ps1 }
Run-Step "release verification" { powershell -NoProfile -ExecutionPolicy Bypass -File scripts/release-verify.ps1 }

$tag = "v$Version"
if (git rev-parse -q --verify "refs/tags/$tag") {
  throw "Tag $tag already exists."
}

if (-not $Yes) {
  $answer = Read-Host "Create and push release tag $tag? Type $tag to continue"
  if ($answer -ne $tag) {
    throw "Release cancelled."
  }
}

Run-Step "git tag -a $tag" { git tag -a $tag -m "Release $tag" }
Run-Step "git push origin $tag" { git push origin $tag }

$remoteTag = git ls-remote origin "refs/tags/$tag"
if (-not $remoteTag) {
  throw "Pushed tag $tag, but GitHub did not report refs/tags/$tag."
}

Write-Host "Release tag $tag is visible on GitHub."
