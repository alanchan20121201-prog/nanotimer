$ErrorActionPreference = 'Continue'

$root = $PSScriptRoot
$exe = Join-Path $root 'dist\win-unpacked\NanoTimer.exe'
$report = Join-Path $root 'nanotimer-diagnose.txt'

Remove-Item -LiteralPath $report -Force -ErrorAction SilentlyContinue

function Add-Report([string]$text) {
    $text | Out-File -LiteralPath $report -Append -Encoding utf8
}

Add-Report "NanoTimer diagnostic - $(Get-Date -Format o)"
Add-Report "Project root: $root"
Add-Report "Executable: $exe"
Add-Report "Executable exists: $(Test-Path -LiteralPath $exe)"

if (Test-Path -LiteralPath $exe) {
    $item = Get-Item -LiteralPath $exe
    Add-Report ("Executable bytes: {0}" -f $item.Length)
    Add-Report ("Executable modified: {0}" -f $item.LastWriteTime)
    $vi = $item.VersionInfo
    Add-Report ("FileVersion: {0}; ProductVersion: {1}; Description: {2}" -f $vi.FileVersion, $vi.ProductVersion, $vi.FileDescription)

    $zone = Get-Item -LiteralPath $exe -Stream Zone.Identifier -ErrorAction SilentlyContinue
    if ($zone) {
        Add-Report "Zone.Identifier: present"
        Add-Report (Get-Content -LiteralPath $exe -Stream Zone.Identifier -ErrorAction SilentlyContinue | Out-String)
    } else {
        Add-Report "Zone.Identifier: none"
    }

    $signature = Get-AuthenticodeSignature -LiteralPath $exe -ErrorAction SilentlyContinue
    if ($signature) {
        Add-Report ("Signature: {0} - {1}" -f $signature.Status, $signature.StatusMessage)
    }
}

$asar = Join-Path $root 'dist\win-unpacked\resources\app.asar'
Add-Report "app.asar: $asar"
Add-Report "app.asar exists: $(Test-Path -LiteralPath $asar)"
if (Test-Path -LiteralPath $asar) {
    Add-Report ("app.asar bytes: {0}" -f (Get-Item -LiteralPath $asar).Length)
}

$before = @(Get-Process -Name NanoTimer -ErrorAction SilentlyContinue)
Add-Report ("NanoTimer processes before launch: {0}" -f $before.Count)
if ($before.Count -gt 0) {
    Add-Report ($before | Select-Object Id, ProcessName, MainWindowTitle, Responding, Path | Format-List | Out-String)
}

if (Test-Path -LiteralPath $exe) {
    try {
        $env:ELECTRON_ENABLE_LOGGING = '1'
        $started = Start-Process -FilePath $exe -WorkingDirectory (Split-Path -Parent $exe) -PassThru -ErrorAction Stop
        Add-Report "Started process ID: $($started.Id)"
        Start-Sleep -Seconds 8
        $started.Refresh()
        Add-Report ("Process has exited: {0}" -f $started.HasExited)
        if ($started.HasExited) {
            Add-Report ("Exit code: {0}" -f $started.ExitCode)
        }
    } catch {
        Add-Report "Start-Process failed: $($_.Exception.Message)"
    }
}

$after = @(Get-Process -Name NanoTimer -ErrorAction SilentlyContinue)
Add-Report ("NanoTimer processes after launch: {0}" -f $after.Count)
if ($after.Count -gt 0) {
    Add-Report ($after | Select-Object Id, ProcessName, MainWindowTitle, Responding, Path, StartTime | Format-List | Out-String)
}

Add-Report "Recent Application event log entries mentioning NanoTimer/electron:"
try {
    $events = Get-WinEvent -FilterHashtable @{ LogName = 'Application'; StartTime = (Get-Date).AddMinutes(-15) } -ErrorAction SilentlyContinue |
        Where-Object { $_.Message -match 'NanoTimer|electron' } |
        Select-Object -First 10
    if ($events) {
        Add-Report ($events | Select-Object TimeCreated, Id, LevelDisplayName, ProviderName, Message | Format-List | Out-String)
    } else {
        Add-Report "None found."
    }
} catch {
    Add-Report "Event log query failed: $($_.Exception.Message)"
}

Add-Report "Done. Send this file back with the output."
Write-Host "Diagnostic complete: $report"
