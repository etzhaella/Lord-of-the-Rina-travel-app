# One-time setup for Google Cloud (run in PowerShell from the project folder):
#   powershell -ExecutionPolicy Bypass -File deploy\1-setup.ps1
#
# Before running:
#   1. Install the Google Cloud CLI: https://cloud.google.com/sdk/docs/install
#   2. gcloud auth login
#   3. gcloud config set project YOUR_PROJECT_ID   (a project with billing enabled)
#   4. Create a free Postgres database on https://neon.tech and copy its connection string

$ErrorActionPreference = "Continue"

function Run($cmd) {
    Write-Host "> $cmd" -ForegroundColor DarkGray
    Invoke-Expression $cmd
    if ($LASTEXITCODE -ne 0) { throw "Command failed: $cmd" }
}

$Project = "$(gcloud config get-value project 2>$null)".Trim()
if (-not $Project) { throw "No project selected. Run: gcloud config set project YOUR_PROJECT_ID" }
Write-Host "Project: $Project" -ForegroundColor Cyan

Write-Host "`n[1/3] Enabling Google services (takes a minute)..." -ForegroundColor Yellow
Run "gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com places.googleapis.com"

Write-Host "`n[2/3] Saving the database connection string as a secret..." -ForegroundColor Yellow
$dbUrl = Read-Host "Paste the Neon connection string (postgresql://...)"
if (-not $dbUrl.StartsWith("postgres")) { throw "That doesn't look like a Postgres connection string." }
$tmp = New-TemporaryFile
[System.IO.File]::WriteAllText($tmp.FullName, $dbUrl.Trim())
gcloud secrets describe db-url *> $null
if ($LASTEXITCODE -eq 0) {
    Run "gcloud secrets versions add db-url --data-file=`"$($tmp.FullName)`""
} else {
    Run "gcloud secrets create db-url --data-file=`"$($tmp.FullName)`""
}
Remove-Item $tmp

Write-Host "`n[3/3] Allowing Cloud Run to read the secrets..." -ForegroundColor Yellow
$Number = (gcloud projects describe $Project --format="value(projectNumber)").Trim()
Run "gcloud projects add-iam-policy-binding $Project --member=serviceAccount:$Number-compute@developer.gserviceaccount.com --role=roles/secretmanager.secretAccessor --condition=None --quiet"

Write-Host "`nSetup done. Next: powershell -ExecutionPolicy Bypass -File deploy\2-deploy.ps1" -ForegroundColor Green
