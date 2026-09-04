# Windows PowerShell entry for UniApp page/navigation tests (UniAutomator mp-weixin).
# Delegates to scripts/verify-uniapp-pages.sh (Git Bash required). The .sh resolves
# HBuilderX CLI via HBUILDERX_CLI or common install paths and fails with a BLOCKED
# message when the CLI is unavailable.
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$sh = Join-Path $repoRoot 'scripts\verify-uniapp-pages.sh'

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
    throw "BLOCKED: bash.exe not found. Install Git for Windows to run the UniApp page tests."
}

if (-not (Test-Path $sh)) { throw "BLOCKED: $sh not found." }
$bash = Resolve-Bash
Write-Host "[verify-uniapp-pages.ps1] using bash: $bash"
& $bash -lc "`"$sh`""
exit $LASTEXITCODE
