@echo off
REM Builds AutoPalExpress-Setup.exe from source (frontend + PyInstaller + Inno Setup).
REM Requires: Node/npm, this project's Python venv, and Inno Setup 6.
powershell -NoProfile -File "%~dp0..\build_installer.ps1"
