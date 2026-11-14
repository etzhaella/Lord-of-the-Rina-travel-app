# Create the GitHub -> Cloud Build trigger that runs cloudbuild.yaml (the correct trigger type).
#   powershell -ExecutionPolicy Bypass -File deploy\5-create-trigger.ps1
#
# Prerequisite (one time, browser): Cloud Build -> Triggers -> "Connect repository"
#   -> GitHub (Cloud Build GitHub App) -> select etzhaella/Lord-of-the-Rina-travel-app.
#   GitHub authorization can't be scripted; everything else is done here.

param(
    [string]$Project = "lord-of-the-rina-travel-app",
    [string]$Owner   = "etzhaella",
    [string]$Repo    = "Lord-of-the-Rina-travel-app",
    [string]$Branch  = "main",
    [string]$Name    = "deploy-main"
)
$ErrorActionPreference = "Continue"

$Number = "$(gcloud projects describe $Project --format='value(projectNumber)')".Trim()
if (-not $Number) { throw "Project $Project not found or no access." }
$SA = "projects/$Project/serviceAccounts/$Number-compute@developer.gserviceaccount.com"

Write-Host "Existing triggers in ${Project}:" -ForegroundColor Cyan
gcloud builds triggers list --project $Project --format="table(name,filename,build.steps[0].args[0]:label=INLINE_FIRST_STEP)"
Write-Host "A trigger WITHOUT a FILENAME (inline Dockerfile build) causes the 'lstat /workspace/Dockerfile' error." -ForegroundColor Yellow
Write-Host "Disable or delete it in the console (this script does not touch existing triggers).`n" -ForegroundColor Yellow

gcloud builds triggers describe $Name --project $Project *> $null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Trigger '$Name' already exists - nothing to do." -ForegroundColor Green
    exit 0
}

gcloud builds triggers create github `
    --project $Project `
    --name $Name `
    --description "Build & deploy rina-backend + rina-frontend to Cloud Run" `
    --repo-owner $Owner `
    --repo-name $Repo `
    --branch-pattern "^$Branch$" `
    --build-config cloudbuild.yaml `
    --service-account $SA
if ($LASTEXITCODE -ne 0) {
    throw "Creating the trigger failed. Is the repo connected (Cloud Build -> Triggers -> Connect repository)?"
}

Write-Host "`nTrigger '$Name' created. Start it now with:" -ForegroundColor Green
Write-Host "  gcloud builds triggers run $Name --branch=$Branch --project $Project"
