# P3 硬件窗口 · Windows 移动热点开启脚本（设备配网用 WiFi）
# SSID=SHID-P3 密码=P3Test2026（固定值供配网表单）
$ErrorActionPreference = 'Stop'
[void][System.Reflection.Assembly]::Load('System.Runtime.WindowsRuntime, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089')
$null = [Windows.Networking.Connectivity.NetworkInformation,Windows.Networking.Connectivity,ContentType=WindowsRuntime]
$null = [Windows.Networking.NetworkOperators.NetworkOperatorTetheringManager,Windows.Networking.NetworkOperators,ContentType=WindowsRuntime]

function Await($op, $resultType) {
  $task = [System.WindowsRuntimeSystemExtensions]::AsTask($op)
  $task.Wait()
  return $task.Result
}

$profile = [Windows.Networking.Connectivity.NetworkInformation]::GetInternetConnectionProfile()
if (-not $profile) { Write-Output 'ERR_NO_INTERNET_PROFILE'; exit 1 }
$mgr = [Windows.Networking.NetworkOperators.NetworkOperatorTetheringManager]::CreateFromConnectionProfile($profile)

$cur = Await ($mgr.GetCurrentAccessPointConfiguration()) ''
Write-Output ("BEFORE ssid=" + $cur.Ssid + " state(client count)=" + $mgr.ClientCount)

# 固定配置
$config = Await ($mgr.GetCurrentAccessPointConfiguration()) ''
$config.Ssid = 'SHID-P3'
$config.Passphrase = 'P3Test2026'
Await ($mgr.ConfigureAccessPointAsync($config)) '' | Out-Null

$op = $mgr.StartTetheringAsync()
$res = Await $op ''
Write-Output ("START status=" + $res.Status)

$after = Await ($mgr.GetCurrentAccessPointConfiguration()) ''
Write-Output ("AFTER ssid=" + $after.Ssid)
Write-Output 'HOTSPOT_READY ssid=SHID-P3 pass=P3Test2026 gw=192.168.137.1'
