# E-WIN WinRT 广播边车（WIN-BRIDGE 模板，2026-09-21 裁决项 #3「先 E-WIN 一壳做模板」）
#
# 行协议（stdin 命令 / stdout 事件，均为单行 JSON，UTF-8）：
#   > {"cmd":"start","companyId":1,"data":[66,76,69]}
#   < {"event":"started"}          （也可能 {"event":"error","message":...}）
#   > {"cmd":"stop"}
#   < {"event":"stopped"}
#   > {"cmd":"exit"} → 停播后退出
#
# 实现要点（PS 5.1 直呼 WinRT 的三连坑，均已在册）：
#   1. 类型加载必须 [T,Assembly,ContentType=WindowsRuntime] 且方括号内不可换行。
#   2. IBuffer：AsBuffer 扩展类的真名是 …WindowsRuntimeBufferExtensions（非
#      WindowsRuntimeSystemExtensions）；且 ManufacturerData 集合在 PS 侧返回
#      未投影 __ComObject（.Add 不可调）——故发射逻辑整体下沉到 C# helper。
#   3. helper 用系统自带 csc.exe 首次编译（命令行可引 winmd；Add-Type 的
#      ReferencedAssemblies 不行）；引用 = Devices/Storage/Foundation 三个合并
#      winmd + GAC System.Runtime（winmd 依赖）。dll 以 PID 后缀落 %TEMP% 防多实例锁。
#
# 平台事实（20260921-XDEV-BROADCAST adv-probe 二分实证）：
#   WinRT 桌面进程仅厂商数据块 0xFF 可发；LocalName/ServiceUuids 一律 Start() 拒绝；
#   空负载被拒。本边车只发厂商块（与 V-WIN 参考实装、F 插件 Windows 后端同口径）。

$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$helperCs = @'
using Windows.Devices.Bluetooth.Advertisement;
using Windows.Storage.Streams;

public static class Wbr {
  static BluetoothLEAdvertisementPublisher _p;
  public static string Start(ushort companyId, byte[] data) {
    if (_p != null) { try { _p.Stop(); } catch {} }
    var p = new BluetoothLEAdvertisementPublisher();
    var m = new BluetoothLEManufacturerData();
    m.CompanyId = companyId;
    var dw = new DataWriter();
    dw.WriteBytes(data);
    m.Data = dw.DetachBuffer();
    p.Advertisement.ManufacturerData.Add(m);
    p.Start();
    _p = p;
    return p.Status.ToString();
  }
  public static string Stop() {
    if (_p != null) { try { _p.Stop(); } catch {} _p = null; }
    return "Stopped";
  }
}
'@

try {
  $W = $env:windir
  $dll = Join-Path $env:TEMP "ewin-wbr-helper-$PID.dll"
  $cs = Join-Path $env:TEMP "ewin-wbr-helper-$PID.cs"
  if (-not (Test-Path $dll)) {
    Set-Content -Path $cs -Value $helperCs -Encoding UTF8
    $sr = Get-ChildItem "$W\Microsoft.NET\assembly\GAC_MSIL\System.Runtime\v4.0_*\System.Runtime.dll" |
      Select-Object -First 1 -ExpandProperty FullName
    & "$W\Microsoft.NET\Framework64\v4.0.30319\csc.exe" -nologo -target:library `
      "-out:$dll" `
      "-r:$W\System32\WinMetadata\Windows.Devices.winmd" `
      "-r:$W\System32\WinMetadata\Windows.Storage.winmd" `
      "-r:$W\System32\WinMetadata\Windows.Foundation.winmd" `
      "-r:$sr" $cs
    if ($LASTEXITCODE -ne 0) { throw "csc exit $LASTEXITCODE" }
    Remove-Item $cs -ErrorAction SilentlyContinue
  }
  Add-Type -Path $dll
  # 编译产物加载后即可删（解除文件占用，供下次干净重建）
  Remove-Item $dll -ErrorAction SilentlyContinue
} catch {
  Write-Output (ConvertTo-Json -Compress @{ event = 'error'; message = "helper build failed: $($_.Exception.Message)" })
  exit 1
}

function Emit($obj) {
  Write-Output (ConvertTo-Json -Compress $obj)
}

while ($null -ne ($line = [Console]::In.ReadLine())) {
  if (-not $line.Trim()) { continue }
  $cmd = $null
  try { $cmd = $line | ConvertFrom-Json } catch {
    Emit @{ event = 'error'; message = "bad json: $line" }
    continue
  }

  switch ($cmd.cmd) {
    'start' {
      try {
        $bytes = @()
        if ($cmd.data) { $bytes = [byte[]]($cmd.data) }
        if ($bytes.Length -eq 0) {
          Emit @{ event = 'error'; message = 'empty manufacturer payload rejected (platform rule)' }
          continue
        }
        $status = [Wbr]::Start([uint16]$cmd.companyId, $bytes)
        # Status 投影成员：Created/Waiting/Started/…（XDEV 平台事实 #6）
        Emit @{ event = 'started'; status = $status; companyId = $cmd.companyId; bytes = $bytes.Length }
      } catch {
        Emit @{ event = 'error'; message = "start failed: $($_.Exception.Message)" }
      }
    }
    'stop' {
      try {
        [void][Wbr]::Stop()
        Emit @{ event = 'stopped' }
      } catch {
        Emit @{ event = 'error'; message = "stop failed: $($_.Exception.Message)" }
      }
    }
    'exit' {
      try { [void][Wbr]::Stop() } catch {}
      Emit @{ event = 'bye' }
      break
    }
    default {
      Emit @{ event = 'error'; message = "unknown cmd: $($cmd.cmd)" }
    }
  }
}
