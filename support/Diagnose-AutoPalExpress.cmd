@echo off
setlocal

echo AutoPalExpress Diagnostics
echo.

set "APE_DATA=%LOCALAPPDATA%\PalworldServerAdmin\data"
set "APE_REPORT=%LOCALAPPDATA%\PalworldServerAdmin\diagnostics"

net session >nul 2>&1
if not "%errorlevel%"=="0" (
    echo Asking Windows for permission to inspect firewall rules...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath 'powershell.exe' -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File ""%~dp0diagnose-autopalexpress.ps1"" -DataDir ""%APE_DATA%"" -ReportDir ""%APE_REPORT%""' -Verb RunAs"
    exit /b
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0diagnose-autopalexpress.ps1" -DataDir "%APE_DATA%" -ReportDir "%APE_REPORT%"
echo.
pause
