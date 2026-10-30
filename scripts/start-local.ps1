param(
  [int]$Port = 4173,
  [switch]$Watch
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$Server = Join-Path $Root "server.js"
$StdoutLog = Join-Path $Root "dev-server.log"
$StderrLog = Join-Path $Root "dev-server.err.log"
$Node = "C:\Program Files\nodejs\node.exe"

function Test-LocalServer {
  param([int]$Port)

  try {
    $response = Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:$Port/" -TimeoutSec 2
    return $response.StatusCode -eq 200 -and $response.Headers["X-Portfolio-Server"] -eq "sphr-portfolio"
  } catch {
    return $false
  }
}

if (-not (Test-Path $Server)) {
  throw "Cannot find server.js at $Server"
}

if (-not (Test-Path $Node)) {
  $nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
  if (-not $nodeCommand) {
    throw "Cannot find node.exe"
  }

  $Node = $nodeCommand.Source
}

if (Test-LocalServer -Port $Port) {
  Write-Host "Already running at http://127.0.0.1:$Port/"
  exit 0
}

# A responding port is not necessarily this portfolio. Never reuse another project.
try {
  $PortResponse = Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:$Port/" -TimeoutSec 2
} catch {
  $PortResponse = $_.Exception.Response
}
if ($PortResponse) {
  throw "Port $Port is occupied by another service. Stop that specific service or choose another port; it was not reused."
}

[Environment]::SetEnvironmentVariable("PATH", $null, "Process")
[Environment]::SetEnvironmentVariable("Path", "C:\Program Files\nodejs;C:\Windows\System32;C:\Windows", "Process")

$ServerArguments = if ($Watch) { @("--watch", "--watch-preserve-output", $Server, $Port) } else { @($Server, $Port) }
$process = Start-Process `
  -FilePath $Node `
  -ArgumentList $ServerArguments `
  -WorkingDirectory $Root `
  -RedirectStandardOutput $StdoutLog `
  -RedirectStandardError $StderrLog `
  -WindowStyle Hidden `
  -PassThru

for ($attempt = 0; $attempt -lt 20; $attempt++) {
  Start-Sleep -Milliseconds 250
  if (Test-LocalServer -Port $Port) {
    Write-Host "Started http://127.0.0.1:$Port/ pid=$($process.Id) watch=$Watch"
    exit 0
  }
}

if ($process.HasExited) {
  Write-Host "Server exited with code $($process.ExitCode)"
} else {
  Write-Host "Started pid=$($process.Id), but http://127.0.0.1:$Port/ did not respond yet"
}

if (Test-Path $StderrLog) {
  Get-Content $StderrLog
}

exit 1
