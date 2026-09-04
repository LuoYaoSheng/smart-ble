# Windows PowerShell entry for UniApp verification.
# Delegates to scripts/verify-uniapp.sh (Git Bash required) so the exact same
# gates run on Windows as on macOS — nothing is skipped or re-implemented here.
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$sh = Join-Path $repoRoot 'scripts\verify-uniapp.sh'

function Resolve-Bash {
    $cmd = Get-Command bash -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    foreach ($p in @(
        'C:\Program Files\Git\bin\bash.exe',
        'C:\Program Files (x86)\Git\bin\bash.exe',
        "$env:LOCALAPPDATA\Programs\Git\bin\bash.exe"
    )) {
        if (Test-Path $p) { return $p }
    }
    throw "BLOCKED: bash.exe not found. Install Git for Windows to run the UniApp verification gates."
}

if (-not (Test-Path $sh)) { throw "BLOCKED: $sh not found." }
$bash = Resolve-Bash
Write-Host "[verify-uniapp.ps1] using bash: $bash"
& $bash -lc "`"$sh`""
exit $LASTEXITCODE
