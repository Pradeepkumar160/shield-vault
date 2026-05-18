# ShieldVault - PowerShell Setup & Launch Script
# Run this in PowerShell (as Administrator recommended)
# Usage: .\start.ps1           -> Full mode with ClamAV
# Usage: .\start.ps1 -Quick   -> Quick demo mode (no ClamAV)
# Usage: .\start.ps1 -Stop    -> Stop all containers
# Usage: .\start.ps1 -Logs    -> Show app logs

param(
    [switch]$Quick,
    [switch]$Stop,
    [switch]$Logs,
    [switch]$Rebuild
)

$AppName = "ShieldVault"
$AppUrl  = "http://localhost:5000"

function Write-Header {
    Write-Host ""
    Write-Host "  +-----------------------------------------+" -ForegroundColor Cyan
    Write-Host "  |   SHIELD VAULT - Secure File Scanner    |" -ForegroundColor Cyan
    Write-Host "  +-----------------------------------------+" -ForegroundColor Cyan
    Write-Host ""
}

function Check-Docker {
    try {
        $null = docker info 2>&1
        if ($LASTEXITCODE -ne 0) { throw "Docker not running" }
    } catch {
        Write-Host "  [ERROR] Docker is not running or not installed." -ForegroundColor Red
        Write-Host "  Please start Docker Desktop and try again." -ForegroundColor Yellow
        exit 1
    }
    Write-Host "  [OK] Docker is running" -ForegroundColor Green
}

function Check-DockerCompose {
    try {
        $null = docker compose version 2>&1
        if ($LASTEXITCODE -eq 0) { return "docker compose" }
    } catch {}
    try {
        $null = docker-compose version 2>&1
        if ($LASTEXITCODE -eq 0) { return "docker-compose" }
    } catch {}
    Write-Host "  [ERROR] Docker Compose not found." -ForegroundColor Red
    exit 1
}

Write-Header

if ($Stop) {
    Write-Host "  Stopping ShieldVault..." -ForegroundColor Yellow
    docker compose -f docker-compose.yml down 2>$null
    docker compose -f docker-compose.quick.yml down 2>$null
    Write-Host "  [OK] Stopped." -ForegroundColor Green
    exit 0
}

if ($Logs) {
    Write-Host "  Showing logs (Ctrl+C to exit)..." -ForegroundColor Cyan
    docker compose logs -f app
    exit 0
}

Check-Docker
$compose = Check-DockerCompose

if ($Quick) {
    Write-Host "  Mode: QUICK (Demo - no ClamAV, files still encrypted)" -ForegroundColor Yellow
    Write-Host ""
    $composeFile = "docker-compose.quick.yml"
} else {
    Write-Host "  Mode: FULL (with ClamAV real virus scanning)" -ForegroundColor Green
    Write-Host "  Note: ClamAV downloads virus definitions (~250MB on first run)" -ForegroundColor Yellow
    Write-Host ""
    $composeFile = "docker-compose.yml"
}

# Build
Write-Host "  Building ShieldVault image..." -ForegroundColor Cyan
if ($Rebuild) {
    docker compose -f $composeFile build --no-cache
} else {
    docker compose -f $composeFile build
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "  [ERROR] Build failed." -ForegroundColor Red
    exit 1
}

Write-Host "  [OK] Build complete" -ForegroundColor Green
Write-Host ""

# Start
Write-Host "  Starting containers..." -ForegroundColor Cyan
docker compose -f $composeFile up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "  [ERROR] Failed to start containers." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "  [OK] ShieldVault is starting up!" -ForegroundColor Green
Write-Host ""
Write-Host "  +-----------------------------------------------+" -ForegroundColor Cyan
Write-Host "  |   Dashboard : http://localhost:5000           |" -ForegroundColor White
Write-Host "  |   Username  : admin                           |" -ForegroundColor White
Write-Host "  |   Password  : admin123                        |" -ForegroundColor White
Write-Host "  +-----------------------------------------------+" -ForegroundColor Cyan
Write-Host ""

if (-not $Quick) {
    Write-Host "  Waiting for ClamAV to initialize (this can take 2-3 minutes" -ForegroundColor Yellow
    Write-Host "  on first run while it downloads virus definitions)..." -ForegroundColor Yellow
    Write-Host ""
}

# Wait for app to be ready
Write-Host "  Waiting for app to be ready..." -ForegroundColor Cyan
$attempts = 0
$maxAttempts = 30
do {
    Start-Sleep -Seconds 2
    $attempts++
    try {
        $response = Invoke-WebRequest -Uri "$AppUrl/api/health" -TimeoutSec 3 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Host "  [OK] App is ready!" -ForegroundColor Green
            break
        }
    } catch {}
    Write-Host "  ... attempt $attempts/$maxAttempts" -ForegroundColor Gray
} while ($attempts -lt $maxAttempts)

Write-Host ""
Write-Host "  Opening browser..." -ForegroundColor Cyan
Start-Process $AppUrl

Write-Host ""
Write-Host "  Useful commands:" -ForegroundColor Cyan
Write-Host "    .\start.ps1 -Logs    -> View live logs"
Write-Host "    .\start.ps1 -Stop    -> Stop ShieldVault"
Write-Host "    .\start.ps1 -Rebuild -> Rebuild after code changes"
Write-Host ""
