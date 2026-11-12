# One-time setup so Cloud Build can deploy from the GitHub repo:
#   powershell -ExecutionPolicy Bypass -File deploy\4-setup-cicd.ps1
# Run 1-setup.ps1 first (it creates the db-url secret).

param([string]$Region = "europe-west1")
$ErrorActionPreference = "Continue"

function Run($cmd) {
    Write-Host "> $cmd" -ForegroundColor DarkGray
    Invoke-Expression $cmd
    if ($LASTEXITCODE -ne 0) { throw "Command failed: $cmd" }
}

$Project = "$(gcloud config get-value project 2>$null)".Trim()
if (-not $Project) { throw "No project selected. Run: gcloud config set project YOUR_PROJECT_ID" }
$Number = "$(gcloud projects describe $Project --format='value(projectNumber)')".Trim()
Write-Host "Project: $Project ($Number)" -ForegroundColor Cyan

Write-Host "`n[1/3] Services..." -ForegroundColor Yellow
Run "gcloud services enable cloudbuild.googleapis.com artifactregistry.googleapis.com run.googleapis.com secretmanager.googleapis.com"

Write-Host "`n[2/3] Docker image repository 'rina' in $Region..." -ForegroundColor Yellow
gcloud artifacts repositories describe rina --location=$Region *> $null
if ($LASTEXITCODE -ne 0) {
    Run "gcloud artifacts repositories create rina --repository-format=docker --location=$Region --description=`"Lord of the Rina images`""
} else {
    Write-Host "already exists"
}

Write-Host "`n[3/3] Permissions for the build service accounts..." -ForegroundColor Yellow
$accounts = @(
    "$Number-compute@developer.gserviceaccount.com",   # default for new triggers
    "$Number@cloudbuild.gserviceaccount.com"            # legacy Cloud Build account
)
$roles = @(
    "roles/run.admin",
    "roles/iam.serviceAccountUser",
    "roles/artifactregistry.writer",
    "roles/secretmanager.secretAccessor",
    "roles/logging.logWriter"
)
foreach ($sa in $accounts) {
    gcloud iam service-accounts describe $sa *> $null
    $isLegacy = $sa -like "*@cloudbuild.gserviceaccount.com"
    if ($LASTEXITCODE -ne 0 -and -not $isLegacy) { Write-Host "skip $sa (not found)"; continue }
    foreach ($role in $roles) {
        gcloud projects add-iam-policy-binding $Project --member="serviceAccount:$sa" --role=$role --condition=None --quiet *> $null
        if ($LASTEXITCODE -eq 0) { Write-Host "  $sa  <-  $role" } else { Write-Host "  (skipped $role for $sa)" -ForegroundColor DarkGray }
    }
}

Write-Host "`nDone. Now create the trigger in the console (Cloud Build -> Triggers), see README-APP.md." -ForegroundColor Green
