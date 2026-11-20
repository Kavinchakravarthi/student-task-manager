$ErrorActionPreference = "Stop"
$processesFile = Join-Path $PSScriptRoot ".local-processes.json"
if (-not (Test-Path -LiteralPath $processesFile)) {
    Write-Output "No local service process list found."
    exit 0
}

$processes = Get-Content -LiteralPath $processesFile -Raw | ConvertFrom-Json
foreach ($process in $processes) {
    $running = Get-Process -Id $process.id -ErrorAction SilentlyContinue
    if ($running -and $running.ProcessName -eq $process.name) {
        Stop-Process -Id $process.id
        Write-Output "Stopped $($process.service) (PID $($process.id))."
    }
}
Remove-Item -LiteralPath $processesFile
