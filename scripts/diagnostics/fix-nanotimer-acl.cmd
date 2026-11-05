@echo off
setlocal
set "APPDIR=%~dp0dist\win-unpacked"

net session >nul 2>&1
if errorlevel 1 (
  echo Requesting administrator privileges...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

if not exist "%APPDIR%\NanoTimer.exe" (
  echo NanoTimer.exe was not found at:
  echo   %APPDIR%
  echo.
  echo Build the unpacked app first with: npm run pack
  pause
  exit /b 1
)

echo Granting "ALL RESTRICTED APPLICATION PACKAGES" read/execute access to:
echo   %APPDIR%
echo.
icacls "%APPDIR%" /grant "*S-1-15-2-2:(OI)(CI)(RX)" /T /C

if errorlevel 1 (
  echo.
  echo The permission grant failed.
  echo Right-click this file, choose "Run as administrator", and try again.
  pause
  exit /b 1
)

icacls "%APPDIR%" | findstr /C:"S-1-15-2-2" >nul
if errorlevel 1 (
  echo.
  echo The S-1-15-2-2 permission was not applied.
  echo Right-click this file, choose "Run as administrator", and try again.
  pause
  exit /b 1
)

echo.
echo Permission grant completed.
echo Now double-click this file normally to start NanoTimer:
echo   %APPDIR%\NanoTimer.exe
pause
