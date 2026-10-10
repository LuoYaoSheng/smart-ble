param(
    [Parameter(Mandatory=$true)][string]$Executable,
    [int]$ProcessId = 0,
    [string]$ExpectedTitle = 'BLE Toolkit+',
    [Parameter(Mandatory=$true)][string]$OutputDirectory
)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
Add-Type -AssemblyName UIAutomationClient,UIAutomationTypes,System.Drawing
New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$process = if($ProcessId -gt 0) {Get-Process -Id $ProcessId} else {Start-Process -FilePath $Executable -WorkingDirectory (Split-Path $Executable) -PassThru}
if([IO.Path]::GetFullPath($process.Path) -ine [IO.Path]::GetFullPath($Executable)) {throw 'Process executable differs from the requested application'}
$deadline = [DateTime]::UtcNow.AddSeconds(25)
do {
    Start-Sleep -Milliseconds 200
    $process.Refresh()
    if ($process.HasExited) { throw "Application exited before opening a window: $($process.ExitCode)" }
} while (($process.MainWindowHandle -eq 0 -or [string]::IsNullOrWhiteSpace($process.MainWindowTitle)) -and [DateTime]::UtcNow -lt $deadline)
if ($process.MainWindowHandle -eq 0 -or [string]::IsNullOrWhiteSpace($process.MainWindowTitle)) { throw 'No titled application window appeared before the deadline' }
$window = [System.Windows.Automation.AutomationElement]::FromHandle($process.MainWindowHandle)
if($window.Current.Name -ne $ExpectedTitle) {throw "Unexpected window title: $($window.Current.Name)"}
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class SmartBLEWindow {
 [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
 [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
 [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
}
'@
[SmartBLEWindow]::ShowWindow($process.MainWindowHandle,9) | Out-Null
[SmartBLEWindow]::SetForegroundWindow($process.MainWindowHandle) | Out-Null
try {
    $focus = $window.FindFirst([System.Windows.Automation.TreeScope]::Descendants,(New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::IsKeyboardFocusableProperty,$true)))
    if($focus) {$focus.SetFocus()}
} catch { }

function Read-Tree {
    $items = $window.FindAll([System.Windows.Automation.TreeScope]::Descendants,[System.Windows.Automation.Condition]::TrueCondition)
    $rows = @()
    foreach($item in $items) {
        try {
            $c = $item.Current
            $rows += [ordered]@{Name=$(if($c.IsPassword){'[password field]'}else{$c.Name});Id=$c.AutomationId;Type=$c.ControlType.ProgrammaticName;Enabled=$c.IsEnabled;Offscreen=$c.IsOffscreen}
        } catch { }
    }
    return $rows
}
$rows = @(Read-Tree)
if($rows.Count -eq 0) {throw 'Application exposes no child controls; launch alone cannot verify UI readiness'}
for($attempt=0;$attempt -lt 5;$attempt++) {
    if([SmartBLEWindow]::GetForegroundWindow() -eq $process.MainWindowHandle) {break}
    [SmartBLEWindow]::SetForegroundWindow($process.MainWindowHandle) | Out-Null
    Start-Sleep -Milliseconds 150
}
if([SmartBLEWindow]::GetForegroundWindow() -ne $process.MainWindowHandle) {throw 'Target window could not be foregrounded; screenshot would be unreliable'}
$rect = $window.Current.BoundingRectangle
$bitmap = New-Object System.Drawing.Bitmap([int]$rect.Width,[int]$rect.Height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
try {
    $graphics.CopyFromScreen([int]$rect.X,[int]$rect.Y,0,0,$bitmap.Size)
    $bitmap.Save((Join-Path $OutputDirectory 'window.png'),[System.Drawing.Imaging.ImageFormat]::Png)
} finally {$graphics.Dispose();$bitmap.Dispose()}
$report = [ordered]@{Executable=$process.Path;Pid=$process.Id;StartedByHarness=($ProcessId -eq 0);SessionId=$process.SessionId;Title=$window.Current.Name;WindowOpened=$true;WindowWidth=$rect.Width;WindowHeight=$rect.Height;Controls=$rows;Navigation='NOT_RUN';Hardware='NOT_RUN'}
$report | ConvertTo-Json -Depth 6 | Set-Content -Encoding UTF8 (Join-Path $OutputDirectory 'launch.json')
Write-Output ('WINDOW_LAUNCH_PASS: '+$report.Title+'; controls='+$rows.Count+'; pid='+$process.Id)
