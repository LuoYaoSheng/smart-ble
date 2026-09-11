# W3 T-WIN/E-WIN 真实 GATT 收口（F006-F012 双线 20/20）

- 日期：2026-09-11
- 基线：b2dea5e（开工 `git pull --ff-only` = Already up to date）
- 夹具：ESP32-S3 `fixture_peripheral_s3`（boot JSON `git_sha=835f1cf=HEAD`，firmware_role=peripheral；**注**：主矩阵 §4.6 原记「真 SHID 固件 v1.1.0」已过时，2026-09-10 二次刷回后一直为 peripheral 夹具——W4 前需重刷 SHID）
- 驱动方法：CDP Runtime.evaluate 走真实 DOM/组件/应用方法（E-WIN=Electron --remote-debugging-port=9222；T-WIN=WebView2 --remote-debugging-port=9444）+ 串口旁证（serial-tap，开串口 DTR 复位=每轮会话前清夹具粘性 fault）
- 结果：**E-WIN 20/20 PASS + T-WIN 20/20 PASS**（cdp-result.json 各 20 断言；首轮 18/18·19/20 的 FAIL 均为驱动伪影，已修驱动后复跑，见 run1 存档）

## 本轮修复的潜伏缺陷（首跑真实 GATT 才暴露，全部已修+复验）

| # | 缺陷 | 修复 |
|---|---|---|
| 1 | E-WIN 主进程 `ble:writeCharacteristic` 一律 hex 编码且渲染端 `format` 串被错位塞进 `withoutResponse`（UTF-8 文本写必坏+26a8 无 WRITE_NR 走无响应写会失败） | 签名改 `(…, data, format, withoutResponse)`，`format==='utf8'` 走 `Buffer.from(data,'utf8')`；preload 同步（对齐 T-WIN Rust `WriteFormat` 语义） |
| 2 | E-WIN noble `subscribe(notify, cb)` 两参误用——布尔进 callback 位：promise 悬挂 + `notify=false` 反而再次订阅 | 拆 `subscribe(cb)`/`unsubscribe(cb)` 单参正确调用 |
| 3 | ServicePanel（E-WIN/T-WIN 逐字节同病）`e.target` 取 `data-action`——点到按钮内 `<span>` 文本时 action=undefined 整个失效 | 两线同改 `e.currentTarget`（charItem/action/btn 三处） |
| 4 | T-WIN btleplug 断链后 WinRT 适配器缓存丢弃外设 → 重连 3 连败 `Device not found`（noble 持对象可直连，btleplug 须重扫） | Rust `connect` 未命中时临时 6s 短扫描重建缓存再连（不动用户扫描态）；复验 attempt 1 即重连成功 |

## F006-F012 判定（双线同轮同判据）

| 项 | E-WIN（noble/WinRT） | T-WIN（btleplug/WinRT） |
|---|---|---|
| F006 连接+服务发现 | PASS：扫描命中（-38dBm）→连接→5 服务 | PASS：同（10:B4:1D:CD:23:8D 冒号格式 id） |
| F007 服务树 | PASS：1800/1801/914b/914c/914d；特征 2/1/2/7/3=15 | PASS：同构 15 特征 |
| F008 特征读取 | PASS：26a8=system_info JSON（hex→utf8 含 firmware_version）；26b0=read_only JSON | PASS：同（b0 `{"type":"read_only","value":"这是一个只读特征值"}`） |
| F009 写入 TEXT+HEX | PASS：HEX FF01/FF00 + UTF-8 开灯/关灯 四写四中，回显 write_response led_state on/off 翻转 | PASS：同 |
| F010 Notify 往返 | PASS：26a8+26a9 双订阅（按钮真点）；26a8 回显渲染入行；26a9 周期 device_status 12s +2；退订后 8s 净停 0 条 | PASS：同（周期 +3） |
| F011 通信日志 | PASS：清空→0 条→读取重建；LogPanel dock 常驻=形态差异（移动端为清空即隐藏） | PASS：同 |
| F012 断线重连 | PASS：fault 注入断链→「意外断开」→1/3 重连→服务恢复→用户断开无新重连 | PASS：同（修复 #4 后 attempt 1 即成） |

## 串口交叉验证（固件侧独立证据）

- E-WIN run2（firmware-serial.txt）：connected(73689)→led on/on/off/off（77898-80418，四写四中）→fault(101725)→disconnected(101861)→**re-connected(104730)**→（用户断开）
- T-WIN run2（firmware-serial.txt）：connected(19403)→led on/on/off/off（25531-28051）→device_status 周期→fault(49783)→disconnected(49924)→**re-connected(57974，重扫修复后）**→user disconnected(65723)
- 主进程/Rust 侧：E-WIN `Notify set to: true/false` 订阅往返 + 逐写 `Writing: <payload> format: <fmt>`（main-process.log）；T-WIN 扫描/断链事件（app-rust.log）

## 驱动伪影存档（run1，非产品缺陷）

- E-WIN run1 14/18：服务树读到骨架发射（主进程两阶段：先服务列表特征空、逐服务补齐）→ 驱动加「特征行≥12」等待；`awaitNewLog` 基线取在同步日志之后漏检 → 改外部基线
- T-WIN run1 19/20：唯一真 FAIL=缺陷 #4（重连 Device not found）；修复后 run2 20/20

## 复现

```bash
# 夹具（COM12，boot JSON 验 git_sha=835f1cf）
python verification/windows-mobile-v1/20260905-1726-1b793ca/serial-tap.py <evidence>/firmware-serial.txt 420 &
# E-WIN
cd apps/desktop/electron && npx electron . --remote-debugging-port=9222 --disable-gpu
node23 <driver> <out>.json ewin     # C:\Users\11066\AppData\Local\Temp\w3-dual-gatt-cdp.mjs
# T-WIN（前端改动须 cargo build 重建，Tauri v1 distDir 编译期嵌入）
cd apps/desktop/tauri/src-tauri && cargo build
WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9444 target/debug/smart-ble-tauri.exe
node23 <driver> <out>.json twin
```

门禁：tests/desktop 85/85（ServicePanel 修复后复跑）；cargo build 0 错误（含重连修复）。
