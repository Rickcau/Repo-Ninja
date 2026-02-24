Write-Host ""
Write-Host "Starting Repo-Ninja..." -ForegroundColor Cyan
Write-Host ""

docker-compose up -d

Write-Host ""
Write-Host "====================================" -ForegroundColor Green
Write-Host "  Repo-Ninja is ready!" -ForegroundColor Green
Write-Host "  Open: http://localhost:3000" -ForegroundColor Yellow
Write-Host "====================================" -ForegroundColor Green
Write-Host ""
