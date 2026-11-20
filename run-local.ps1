$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$envFile = Join-Path $root ".env"

if (-not (Test-Path -LiteralPath $envFile)) {
    throw "Missing .env. Create it from .env.example and set MONGODB_URI first."
}

$settings = @{}
foreach ($line in Get-Content -LiteralPath $envFile) {
    if ($line -match '^\s*([^#=]+?)\s*=(.*)$') {
        $settings[$matches[1].Trim()] = $matches[2].Trim()
    }
}
if (-not $settings["MONGODB_URI"] -or -not $settings["MONGODB_URI"].StartsWith("mongodb")) {
    throw "MONGODB_URI must be set to a MongoDB connection string in .env."
}

if (-not (Test-Path (Join-Path $root ".venv\Scripts\python.exe"))) {
    python -m venv (Join-Path $root ".venv")
    if ($LASTEXITCODE -ne 0) { throw "Could not create the backend virtual environment." }
}

$python = Join-Path $root ".venv\Scripts\python.exe"
& $python -m pip install -q -r (Join-Path $root "backend\auth-service\requirements.txt") `
    -r (Join-Path $root "backend\complaint-service\requirements.txt") `
    -r (Join-Path $root "backend\analytics-service\requirements.txt") `
    -r (Join-Path $root "backend\api-gateway\requirements.txt")
if ($LASTEXITCODE -ne 0) { throw "Backend dependency installation failed." }

$frontendPath = Join-Path $root "frontend"
if (-not (Test-Path (Join-Path $frontendPath "node_modules\vite\bin\vite.js"))) {
    Push-Location $frontendPath
    try { npm install } finally { Pop-Location }
    if ($LASTEXITCODE -ne 0) { throw "Frontend dependency installation failed." }
}

$ports = @(8001, 8002, 8003, 8000, 5173)
foreach ($port in $ports) {
    if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) {
        throw "Port $port is already in use."
    }
}

$logs = Join-Path $root ".local-logs"
New-Item -ItemType Directory -Force -Path $logs | Out-Null
$processesFile = Join-Path $root ".local-processes.json"
if (Test-Path -LiteralPath $processesFile) {
    $previous = Get-Content -LiteralPath $processesFile -Raw | ConvertFrom-Json
    foreach ($process in $previous) {
        $running = Get-Process -Id $process.id -ErrorAction SilentlyContinue
        if ($running -and $running.ProcessName -eq $process.name) {
            throw "A previously started service (PID $($process.id)) is still running. Stop it before restarting."
        }
    }
}

foreach ($key in $settings.Keys) {
    [Environment]::SetEnvironmentVariable($key, $settings[$key], "Process")
}
$env:AUTH_SERVICE_URL = "http://127.0.0.1:8001"
$env:COMPLAINT_SERVICE_URL = "http://127.0.0.1:8002"
$env:ANALYTICS_SERVICE_URL = "http://127.0.0.1:8003"

$specs = @(
    @{ name = "python"; port = 8001; directory = "backend\auth-service"; app = "app.main:app" },
    @{ name = "python"; port = 8002; directory = "backend\complaint-service"; app = "app.main:app" },
    @{ name = "python"; port = 8003; directory = "backend\analytics-service"; app = "app.main:app" },
    @{ name = "python"; port = 8000; directory = "backend\api-gateway"; app = "app.main:app" }
)
$started = @()
foreach ($spec in $specs) {
    $service = switch ($spec.port) {
        8001 { "auth" }
        8002 { "complaint" }
        8003 { "analytics" }
        8000 { "gateway" }
    }
    $process = Start-Process -FilePath $python `
        -ArgumentList @("-m", "uvicorn", $spec.app, "--host", "127.0.0.1", "--port", "$($spec.port)") `
        -WorkingDirectory (Join-Path $root $spec.directory) `
        -RedirectStandardOutput (Join-Path $logs "$service.out.log") `
        -RedirectStandardError (Join-Path $logs "$service.err.log") `
        -PassThru
    $started += @{ id = $process.Id; name = "python"; service = $service; port = $spec.port }
}

$node = (Get-Command node.exe -ErrorAction Stop).Source
$vite = Start-Process -FilePath $node `
    -ArgumentList @((Join-Path $root "frontend\node_modules\vite\bin\vite.js"), "--host", "127.0.0.1", "--port", "5173", "--strictPort") `
    -WorkingDirectory (Join-Path $root "frontend") `
    -RedirectStandardOutput (Join-Path $logs "frontend.out.log") `
    -RedirectStandardError (Join-Path $logs "frontend.err.log") `
    -PassThru
$started += @{ id = $vite.Id; name = "node"; service = "frontend"; port = 5173 }
$started | ConvertTo-Json | Set-Content -LiteralPath $processesFile

Write-Output "Started CampusCare services:"
foreach ($process in $started) {
    Write-Output ("  {0}: http://localhost:{1} (PID {2})" -f $process.service, $process.port, $process.id)
}
Write-Output "Logs: .local-logs\"
Write-Output "Use .\stop-local.ps1 to stop these services."
