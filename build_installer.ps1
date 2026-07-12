# Builds the distributable PalworldServerAdmin-Setup.exe from source.
# Requires: Node/npm, this project's Python venv (with pyinstaller installed),
# and Inno Setup 6 (winget install JRSoftware.InnoSetup).

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

Write-Host "==> Building frontend..." -ForegroundColor Cyan
Push-Location "$root\web"
npm.cmd run build
Pop-Location

Write-Host "==> Building PalworldServerAdmin.exe with PyInstaller..." -ForegroundColor Cyan
Push-Location $root
$pythonCandidates = @(
    "$root\.venv312\Scripts\python.exe",
    "$root\.venv\Scripts\python.exe"
)
$python = $null
foreach ($candidate in $pythonCandidates) {
    if (Test-Path $candidate) {
        & $candidate -c "import sys" *> $null
        if ($LASTEXITCODE -eq 0) {
            $python = $candidate
            break
        }
    }
}
if (-not $python) {
    throw "No working project Python environment found. Run scripts\setup.bat or recreate .venv first."
}
Write-Host "==> Verifying application version sources..." -ForegroundColor Cyan
& $python "$root\scripts\check_app_version.py"
if ($LASTEXITCODE -ne 0) {
    throw "Application version verification failed."
}
& $python -m PyInstaller PalworldServerAdmin.spec --noconfirm
Pop-Location

$innoCandidates = @(
    "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe",
    "C:\Program Files (x86)\Inno Setup 6\ISCC.exe",
    "C:\Program Files\Inno Setup 6\ISCC.exe"
)
$iscc = $innoCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $iscc) {
    throw "Inno Setup's ISCC.exe wasn't found. Install Inno Setup 6 first: winget install JRSoftware.InnoSetup"
}

Write-Host "==> Compiling installer with Inno Setup..." -ForegroundColor Cyan
& $iscc "$root\installer.iss"

Write-Host "==> Done: $root\installer_output\PalworldServerAdmin-Setup.exe" -ForegroundColor Green
