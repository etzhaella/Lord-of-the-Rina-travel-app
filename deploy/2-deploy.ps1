# Deploy (or re-deploy after changes) to Cloud Run:
#   powershell -ExecutionPolicy Bypass -File deploy\2-deploy.ps1
# Works with or without a Google Places key (without one = demo mode).

param([string]$Region = "europe-west1")
$ErrorActionPreference = "Continue"

function Run($cmd) {
    Write-Host "> $cmd" -ForegroundColor DarkGray
    Invoke-Expression $cmd
    if ($LASTEXITCODE -ne 0) { throw "Command failed: $cmd" }
}

$Root = Split-Path -Parent $PSScriptRoot
$Project = "$(gcloud config get-value project 2>$null)".Trim()
Write-Host "Project: $Project   Region: $Region" -ForegroundColor Cyan

$secrets = "DATABASE_URL=db-url:latest"
gcloud secrets describe places-key *> $null
if ($LASTEXITCODE -eq 0) {
    $secrets += ",GOOGLE_PLACES_API_KEY=places-key:latest"
    Write-Host "Google Places key found - real places." -ForegroundColor Green
} else {
    Write-Host "No Google Places key yet - deploying in demo mode." -ForegroundColor Yellow
}

Write-Host "`n[1/2] Backend (5-10 minutes the first time)..." -ForegroundColor Yellow
Run "gcloud run deploy rina-backend --source `"$Root\backend`" --region $Region --allow-unauthenticated --set-secrets `"$secrets`" --set-env-vars `"DEFAULT_CURRENCY=EUR,PLACES_LANGUAGE=en`" --memory 512Mi --quiet"
$BackendUrl = (gcloud run services describe rina-backend --region $Region --format="value(status.url)").Trim()
Write-Host "Backend: $BackendUrl" -ForegroundColor Cyan

Write-Host "`n[2/2] Frontend..." -ForegroundColor Yellow
Run "gcloud run deploy rina-frontend --source `"$Root\frontend`" --region $Region --allow-unauthenticated --set-env-vars `"BACKEND_URL=$BackendUrl`" --memory 512Mi --quiet"
$FrontendUrl = (gcloud run services describe rina-frontend --region $Region --format="value(status.url)").Trim()

Write-Host "`n==============================================" -ForegroundColor Green
Write-Host " The app is live: $FrontendUrl" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
