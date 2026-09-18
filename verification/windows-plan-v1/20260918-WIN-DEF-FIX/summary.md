# 20260918-WIN-DEF-FIX · 四缺陷修复轮（续 20260918-WIN-ALL）

目标：修复 WIN-ALL 登记的 T-WIN-DEF-001（P1）与 V-WIN-DEF-001/002/003，全部对真机
SHID-00000001（10:B4:1D:CD:23:8E，固件 1.2.0，未重刷、WIN-007 环境保持原样）复测。

代码变更（2 文件）：
- `apps/desktop/tauri/src-tauri/src/lib.rs` — connect 前强制清 btleplug 死缓存 + 连接后自动重建
  GATT 句柄 + DeviceDisconnected 事件处理器收尾通知流/抑制伪事件
- `apps/desktop/avalonia/SmartBLE.Desktop/ViewModels/BleService.cs` — Uncached 枚举（对齐
  btleplug/noble 调用形态）、GattSession/GattDeviceService 显式释放、ConnectionStatusChanged
  接线（含主动断开上报与去重）、写选项按特征能力自适应、全链路错误诊断码化

## 一、T-WIN-DEF-001（P1 重连后 GATT 死句柄）— 已修复 ✅

根因（btleplug 0.11.8 winrtble 源码级）：
- 用户主动断开走 `disconnect()` → 清 `ble_services`（干净）；**被动掉链只走连接状态回调**，
  `ble_services` 保留已关闭的 WinRT 特征句柄
- 重连 `connect()` 复用同一 Peripheral 实例；`discover_services()` 对已存在的 uuid 跳过重枚举
  → 读写永远命中死句柄，HRESULT 0x80000013「该对象已关闭」

修复（lib.rs 三处）：
1. connect 命令：外设未处于连接态时先 `peripheral.disconnect()` 清空死缓存再连（对从未连接
   的设备是无副作用状态复位）
2. connect 成功后内建一次 `discover_services()` 重建全新句柄（覆盖不重发现的重连路径）
3. 事件处理器：收尾该设备全部通知流；仅"曾在本端登记为已连接"的会话丢失去通知前端
   （强制清缓存触发的 disconnect 事件不扰前端）

真机验证：
- `reconnect-retry-characterization.json`（原缺陷精确复现脚本）：修复前 readA/B/C 全灭
  0x80000013；修复后 read1/A/B/C 全部成功返回同一身份帧，disc2services=1
- `ble-chain.json` + 截图：主链 T1–T16 全绿（connect 改动零回归）

## 二、V-WIN-DEF-002（P2 重连特征归零）— 已修复 ✅

根因：GattDeviceService/GattSession 从不显式释放，Windows 将重连后的服务/特征查询归属旧
GATT 会话返回空；无参查询重载命中系统缓存。

修复：ConnectAsync 先完整 DisconnectAsync（Dispose 全部 GattDeviceService + GattSession +
设备）；服务/特征枚举与读全部改 `BluetoothCacheMode.Uncached`；加 GattSession.MaintainConnection
持链。

真机验证（`avalonia-ble-harness.log`）：重连后 chars=3（原 0）、V15 re-read INFO 成功、
identity match SAME（原 DIFFERENT）。

## 三、V-WIN-DEF-003（P2 DeviceDisconnected 从不触发）— 已修复 ✅

修复：接线 `ConnectionStatusChanged`（被动掉链路径）+ DisconnectAsync 主动上报（对齐
E-WIN/T-WIN 语义），`_disconnectReported` 防重复。CS0067 随之消除（构建 0 警告）。

真机验证：harness 日志两次 `[V-disconnect-event] 10B41DCD238E`（V12/V16）。

## 四、V-WIN-DEF-001（P1 INPUT 写失败）— 重新定性：设备侧持久写锁（三栈同受）

修复轮证据链推翻了 WIN-ALL 的前提「noble/btleplug 同特征写成功」：

1. **方法论勘误**：WIN-ALL 驱动脚本的 step「ok」只表示 invoke 未抛异常，`success:false`
   的 Response 同样计 ok——E-WIN F8/F9、T-WIN T9/T10 的"成功"从未核过 success 字段，链
   JSON 也没存写返回。唯一核过的是 `20260918-WIN-ALL/electron/status-probe.json`：
   16:08（本地）writeV1/writeGarbageJson 真实 `success:true`。
2. **时间线**（本地时间，harness 时间戳为 UTC+8）：16:04 E-WIN 链写成功（+17B 无效载荷）、
   16:08 status-probe 写成功（+27B，累计 ~44B 无 schema 候选）→ **16:18 起设备对所有
   INPUT 写请求持久回 ATT 0x0D**（Invalid Attribute Value Length，固件非标准信号）。
   17:20 T-WIN 最小写探针（`twin-write-probe.json`）同样失败 0x8065000D——三栈行为一致。
3. **表征矩阵**（`avalonia-writeprobe-*.log`，plain=精确复刻 btleplug 调用序列）：
   - 带响应写 1/3/14B 全拒 0x0D（1 字节排除真长度问题）
   - 无响应写本地 Success（无 ATT 错误路径，无法证明到达应用层）
   - +0s/+3s/+5s 时序无关（排除 SMP 加密窗口）
   - 无 GattSession 照败、console PairAsync=Failed（Windows 无 SHID 配对记录，isPaired=False）
   - 解卡尝试全败：无响应通道补 `}`/`\n`×4/合法 JSON 均不恢复写请求
   - 跨重连持续 ≥75 分钟
4. **HRESULT 解码**：`WriteValueAsync`（无结果重载）抛 `COMException 0x8065000D` 空消息
   （= WIN-ALL 早晨「空错误」真身）；`WriteValueWithResultAsync` 报 `ProtocolError=13`。
   0x80650000+ATT 码 是 WinRT 对 ATT 协议错误的 HRESULT 编码。

处置：
- **SHID-FW-LOCK-001（设备侧，新登记）**：INPUT 写请求持久拒绝，疑似无效载荷喂入后固件
  输入解析器/写门卡死；恢复手段未知（断电重启验证待硬件窗口）；固件仓库在
  Smart-HID-Workspace，非本仓库范围。
- **app 侧已修**：错误诊断码化（异常类型+HRESULT+status+protocolError，不再出现空错误）、
  写选项按特征能力自适应降级。设备锁清除后写入功能预期即恢复（三栈等价）。

## 环境与偏差声明

- ESP32-S3 未重刷、未动 NVS（WIN-007 暂存 REDMI 配置保持）；CH343/COM12 未接，无串口旁证
- Tauri 用 debug exe（target/debug/smart-ble-tauri.exe），Node 23.8 跑 CDP（PATH node20 无
  WebSocket）
- harness/驱动脚本在 %TEMP%\winall\（不入库）

## 结论

| 缺陷 | 级别 | 处置 | 真机验证 |
|---|---|---|---|
| T-WIN-DEF-001 | P1 | 已修复（lib.rs 三处） | retry 探针 readA/B/C 全绿 + T1–T16 全绿 |
| V-WIN-DEF-002 | P2 | 已修复（会话释放+Uncached） | chars=3、identity SAME |
| V-WIN-DEF-003 | P2 | 已修复（接线+去重） | V12/V16 双断连事件 |
| V-WIN-DEF-001 | P1 | 重新定性→SHID-FW-LOCK-001（设备侧）；app 诊断已修 | 三栈同现 0x8065000D；写锁跨重连持续 |
