@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0diagnose-nanotimer.ps1"
if exist "%~dp0nanotimer-diagnose.txt" start "" notepad "%~dp0nanotimer-diagnose.txt"
