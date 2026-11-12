# Connect (or replace) the Google Places API key on the live app - no redeploy needed:
#   powershell -ExecutionPolicy Bypass -File deploy\3-add-google-key.ps1

param([string]$Region = "europe-west1")
$ErrorActionPreference = "Continue"

$secure = Read-Host "Paste the Google Places API key (input is hidden)" -AsSecureString
$key = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)).Trim()
if (-not $key.StartsWith("AIza")) { throw "That doesn't look like a Google API key (should start with AIza)." }

$tmp = New-TemporaryFile
[System.IO.File]::WriteAllText($tmp.FullName, $key)
gcloud secrets describe places-key *> $null
if ($LASTEXITCODE -eq 0) {
    gcloud secrets versions add places-key --data-file="$($tmp.FullName)"
} else {
    gcloud secrets create places-key --data-file="$($tmp.FullName)"
}
$ok = $LASTEXITCODE
Remove-Item $tmp
if ($ok -ne 0) { throw "Saving the key failed." }

gcloud run services update rina-backend --region $Region --update-secrets "GOOGLE_PLACES_API_KEY=places-key:latest" --quiet
if ($LASTEXITCODE -ne 0) { throw "Updating the backend failed." }

$BackendUrl = (gcloud run services describe rina-backend --region $Region --format="value(status.url)").Trim()
Write-Host "`nKey connected. Check: $BackendUrl/api/config  ->  should show `"mock`": false" -ForegroundColor Green
