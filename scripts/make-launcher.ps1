$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$appDir = Join-Path $projectRoot 'dist\win-unpacked'
$launcher = Join-Path $appDir 'NanoTimer.exe'
$realApp = Join-Path $appDir 'NanoTimerApp.exe'
$source = Join-Path $projectRoot 'src\launcher\NanoTimerLauncher.cs'

if (-not (Test-Path -LiteralPath $launcher)) {
    throw "NanoTimer.exe was not found in $appDir. Run 'npm run pack' first."
}

$launcherSize = (Get-Item -LiteralPath $launcher).Length
if ($launcherSize -gt 1MB) {
    # electron-builder just produced the real Electron executable. Keep it
    # under a private name and put the compatibility launcher in its place.
    if (Test-Path -LiteralPath $realApp) {
        Remove-Item -LiteralPath $realApp -Force
    }
    Rename-Item -LiteralPath $launcher -NewName 'NanoTimerApp.exe'
} elseif (-not (Test-Path -LiteralPath $realApp)) {
    throw "NanoTimerApp.exe is missing and NanoTimer.exe is already a launcher."
}

$csc = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (-not (Test-Path -LiteralPath $csc)) {
    $csc = Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319\csc.exe'
}
if (-not (Test-Path -LiteralPath $csc)) {
    throw 'The .NET Framework C# compiler (csc.exe) was not found.'
}

& $csc /nologo /target:winexe "/out:$launcher" /r:System.Windows.Forms.dll $source
if ($LASTEXITCODE -ne 0) {
    throw "csc.exe failed with exit code $LASTEXITCODE."
}

Write-Host "Launcher ready: $launcher"
Write-Host "Electron app:   $realApp"
