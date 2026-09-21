param(
  [Parameter(Mandatory=$true)][string]$ExePath,
  [string[]]$ArgumentList = @(),
  [Parameter(Mandatory=$true)][string]$ProcessName,
  [Parameter(Mandatory=$true)][string]$OutPng,
  [string]$ErrLog = '',
  [int]$WaitSec = 8
)
# P4 打包冒烟通用脚本：启动 -> 等待 -> 进程/主窗口标题 -> 全屏截图 -> 强退
$ErrorActionPreference = 'Continue'
if ($ArgumentList -and $ArgumentList.Count -gt 0) {
  if ($ErrLog -ne '') {
    Start-Process -FilePath $ExePath -ArgumentList $ArgumentList -RedirectStandardError $ErrLog
  } else {
    Start-Process -FilePath $ExePath -ArgumentList $ArgumentList
  }
} else {
  if ($ErrLog -ne '') {
    Start-Process -FilePath $ExePath -RedirectStandardError $ErrLog
  } else {
    Start-Process -FilePath $ExePath
  }
}
Start-Sleep -Seconds $WaitSec
$procs = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue
if (-not $procs) {
  Write-Output ("RESULT alive=0 proc=" + $ProcessName)
  if ($ErrLog -ne '' -and (Test-Path $ErrLog)) {
    Write-Output "---- stderr ----"
    Get-Content $ErrLog -Tail 20 | ForEach-Object { Write-Output $_ }
  }
  exit 2
}
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bmp = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
$bmp.Save($OutPng, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
foreach ($p in $procs) { Write-Output ("PROC pid=" + $p.Id + " title=[" + $p.MainWindowTitle + "]") }
Write-Output ("SHOT " + $OutPng)
Stop-Process -Name $ProcessName -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Output "KILLED"
exit 0
