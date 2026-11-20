param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("auth", "complaint", "analytics", "gateway")]
    [string]$Service
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$envFile = Join-Path $root ".env"
if (-not (Test-Path -LiteralPath $envFile)) {
    throw "Missing .env. Create it from .env.example and set MONGODB_URI first."
}

foreach ($line in Get-Content -LiteralPath $envFile) {
    if ($line -match '^\s*([^#=]+?)\s*=(.*)$') {
        [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim(), "Process")
    }
}
if (-not $env:MONGODB_URI -or -not $env:MONGODB_URI.StartsWith("mongodb")) {
    throw "MONGODB_URI must be set to a MongoDB connection string in .env."
}

$services = @{
    auth = @{ directory = "backend\auth-service"; port = 8001 }
    complaint = @{ directory = "backend\complaint-service"; port = 8002 }
    analytics = @{ directory = "backend\analytics-service"; port = 8003 }
    gateway = @{ directory = "backend\api-gateway"; port = 8000 }
}
$config = $services[$Service]
if ($Service -eq "gateway") {
    $env:AUTH_SERVICE_URL = "http://127.0.0.1:8001"
    $env:COMPLAINT_SERVICE_URL = "http://127.0.0.1:8002"
    $env:ANALYTICS_SERVICE_URL = "http://127.0.0.1:8003"
}

$python = Join-Path $root ".venv\Scripts\python.exe"
if (-not (Test-Path -LiteralPath $python)) {
    throw "Backend dependencies are not installed. Run .\run-local.ps1 first."
}
Set-Location (Join-Path $root $config.directory)
& $python -m uvicorn app.main:app --host 127.0.0.1 --port $config.port
exit $LASTEXITCODE
