# Build and Run Script for Dual Terminal App (Windows PowerShell)

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Dual Terminal App - Docker Build" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is installed
if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Docker is not installed. Please install Docker first." -ForegroundColor Red
    exit 1
}

# Check if Docker Compose is installed
if (!(Get-Command docker-compose -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Docker Compose is not installed. Please install Docker Compose first." -ForegroundColor Red
    exit 1
}

# Build the Docker image
Write-Host "[INFO] Building Docker image..." -ForegroundColor Blue
docker-compose build --no-cache

if ($LASTEXITCODE -eq 0) {
    Write-Host "[SUCCESS] Docker image built successfully!" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Failed to build Docker image" -ForegroundColor Red
    exit 1
}

# Start the container
Write-Host "[INFO] Starting container..." -ForegroundColor Blue
docker-compose up -d

if ($LASTEXITCODE -eq 0) {
    Write-Host "[SUCCESS] Container started successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "[INFO] Application is running at: http://localhost" -ForegroundColor Blue
    Write-Host "[INFO] To view logs: docker-compose logs -f" -ForegroundColor Blue
    Write-Host "[INFO] To stop: docker-compose down" -ForegroundColor Blue
} else {
    Write-Host "[ERROR] Failed to start container" -ForegroundColor Red
    exit 1
}

# Wait a bit and check health
Start-Sleep -Seconds 5
Write-Host "[INFO] Checking application health..." -ForegroundColor Blue

try {
    $response = Invoke-WebRequest -Uri "http://localhost/health" -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "[SUCCESS] Application is healthy and running!" -ForegroundColor Green
    }
} catch {
    Write-Host "[ERROR] Application health check failed. Check logs with: docker-compose logs" -ForegroundColor Red
}

Write-Host ""
Write-Host "[SUCCESS] Setup complete! Visit http://localhost to access the application." -ForegroundColor Green
