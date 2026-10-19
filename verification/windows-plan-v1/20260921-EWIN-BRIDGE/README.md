# EWIN-BRIDGE · E-WIN WinRT 广播模板（用户裁决项 #3「先 E-WIN 一壳做模板」）

- 裁决：用户 2026-09-21 选定「先 E-WIN 一壳做模板」——本目录即 **Node 侧接 WinRT BluetoothLEAdvertisementPublisher 的接入模板**，模式确立后可复制到 T/G/Q。
- 基线：`65024b4` 之上。

## 模板架构（PowerShell 边车 + C# helper）

```
renderer(app.js P008)
  └─ ipcRenderer.invoke('ble:startAdvertising', name, uuids[], mfgId, mfgData, includeName)
       └─ index.js win32 分支（name/uuid 参数按平台事实忽略，仅厂商块）
            └─ spawn powershell -File win-broadcast-bridge.ps1   ← 常驻边车，stdin/stdout 行协议 JSON
                 └─ %TEMP% 首次 csc.exe 编译 helper（PID 后缀 dll 防锁，加载后删）
                      └─ C# helper: BluetoothLEAdvertisementPublisher + ManufacturerData(0xFF) + Start()
```

| 文件 | 角色 |
|---|---|
| `apps/desktop/electron/src/main/win-broadcast-bridge.ps1` | 边车：行协议（start/stop/exit → started/stopped/bye/error）、helper 首编译、厂商块发射 |
| `apps/desktop/electron/src/main/index.js` | win32 分支 IPC + 边车生命周期（惰性单例/等待者/超时/`before-quit` killWinBridge） |
| `apps/desktop/electron/public/app.js`（+G 镜像） | initBLE 完成回调不再把广播中徽章打回 idle（时序缺陷，翻 Tab 后暴露） |

Linux(noble) 路径不变；macOS 仍拒绝（归 Mac）；renderer IPC 契约零改动。

## PS 5.1 直呼 WinRT 的坑位账（模板的可复制知识）

1. **ps1 无 BOM + 中文注释 = GBK 乱码破坏代码结构**（症状：部分分支静默消失）——边车文件必须 **UTF-8 with BOM**。
2. WinRT 类型加载 `[T,Assembly,ContentType=WindowsRuntime]` 方括号内**不可换行**。
3. `AsBuffer` 扩展类真名 `System.Runtime.InteropServices.WindowsRuntime.WindowsRuntimeBufferExtensions`（不是 WindowsRuntimeSystemExtensions）；PS 侧可静态调用拿 IBuffer。
4. 但 `Advertisement.ManufacturerData` 集合在 PS 侧返回未投影 `__ComObject`（`.Add` 不可调）→ **发射逻辑必须下沉 C# helper**。
5. csc.exe 命令行可引 winmd；Add-Type 的 ReferencedAssemblies 不行。引用=Devices/Storage/Foundation 三个**合并** winmd（无 per-namespace winmd）+ GAC System.Runtime（winmd 依赖）。
6. C# helper 里 IBuffer 用 `DataWriter.WriteBytes + DetachBuffer()`（C# 编译期绑定 winmd 类型；跨 facade 的 AsBuffer 会 CS0029 IBuffer→IBuffer 身份冲突）。
7. csc 用老编译器 C#5 语法（Framework64\v4.0.30319\csc.exe，Win10 自带）。

## 端到端双端验证（`ewin-bridge-e2e.mjs`，CDP 9234 + 华为 A-AND）

| 断言 | 结果 |
|---|---|
| A1 开播（CDP 点 Tab→开始广播，表单默认 0001/"BLE"） | ✅ 截图 02：徽章「● 广播中」+「停止广播」按钮 + bLog「广播已启动」+ 平台 chip `Desktop · Windows`；main 日志 `win advertising started {companyId:1, bytes:3}`（status=Waiting→Started 异步，XDEV 平台事实 #6 口径） |
| A2 手机空口收厂商块 | ✅ `2E:F0:3C:17:61:21 name=null rssi=-48 adv=06ff0100424c45…`（44 包；随机 MAC 同 V-WIN/F 口径） |
| A3 停播对照 | ✅ **after=0**——E-WIN 边车 stop() 空口真停（与 F 插件 FWIN-BC-001 行为相反，自研边车优势） |
| A4 进程退出后空口 | ✅ 0 包（包源=E-WIN 边车确凿） |

首轮脚本的徽章探针在冷启动窗口内查询偏早（csc 首编译 ~3s），读值滞后；以截图+空口+main 日志三重证据定稿。超时余量已放宽 8s。

## 门禁

- `node --check`：index.js / E/G app.js √；E/G app.js diff 一致
- `node --test tests/desktop/*.test.mjs`：**95/95**
- 边车管道测试：started/stopped/bye 三事件齐全（BOM 修复后）

## 遗留

- 模板复制到 T（Rust 侧直接用 windows crate 反而更简单）/G（Go 走 csc 边车同款或 go-ole）/Q（winsdk 原生支持）——各壳按本目录架构与坑位账推进，待用户排期。
- StatusChanged 事件（Started/Aborted 回传）未挂（Register-ObjectEvent 跨 runspace 输出不可达）；当前以 Start() 同步异常+空口验证覆盖。
- csc 首编译 ~3s 仅首次；后续 start/stop 走常驻边车毫秒级。
