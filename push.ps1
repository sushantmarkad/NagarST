param (
    [string]$CommitMessage = "Update NagarST Real-Time Bus Tracking"
)

Write-Host "[1/3] Staging changes..." -ForegroundColor Cyan
git add .

$status = git status --porcelain
if (-not $status) {
    Write-Host "No changes to commit." -ForegroundColor Yellow
    exit 0
}

Write-Host "[2/3] Committing: '$CommitMessage'..." -ForegroundColor Cyan
git commit -m "$CommitMessage"

Write-Host "[3/3] Pushing to GitHub (origin/main)..." -ForegroundColor Cyan
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "Successfully pushed to GitHub!" -ForegroundColor Green
} else {
    Write-Host "Push failed. Check credentials or connection." -ForegroundColor Red
}
