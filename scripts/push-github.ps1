param(
  [Parameter(Mandatory = $false, Position = 0)]
  [string]$Message = ""
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$branch = (git branch --show-current).Trim()
if (-not $branch) {
  throw "Cannot determine current git branch"
}

$remote = (git remote get-url origin).Trim()
if (-not $remote) {
  throw "Cannot determine origin remote"
}

$status = git status --porcelain
if (-not $status) {
  Write-Host "No local changes to push on $branch"
  git push -u origin $branch
  exit $LASTEXITCODE
}

if (-not $Message) {
  $Message = "Update portfolio"
}

Write-Host "Branch: $branch"
Write-Host "Remote: $remote"
Write-Host "Commit: $Message"

git add -A
git commit -m $Message
git push -u origin $branch
