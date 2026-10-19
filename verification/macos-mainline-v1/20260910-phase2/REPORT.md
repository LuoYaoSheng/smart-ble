# Phase 2 · Mac 桌面主线（原生 AppKit）九项回归 — 2026-09-10

执行环境：macOS 25.5.0（arm64）· SmartBLE-mac @ `5e1fbaf`（refactor/uniapp-v1）· 本机 BLE 控制器 BCM_4388C2
环境设备：iphone（-47 dBm，1m 内）/ midea ×3（-87~-92 dBm，可连）/ 未命名 ×2
**无 ESP32 夹具接入**（USB 串口仅蓝牙/调试口）；Android 真机未接（adb 列表空）。

## 结论总表（九项）

| # | 项目 | 判定 | 证据 |
|---|------|------|------|
| 1 | 扫描/过滤/广播展示 | **PASS（真无线电）** | UIS-03 真扫 5s 发现 5 台；UIS-04 筛选链；UIS-05 广播数据弹窗；`snaps/p001-scan-results.png`；probe 独立交叉扫描一致（iphone -47 / midea -87×3 / 未命名×2） |
| 2 | 多设备连接 / 断线重连 | **PASS（重连全环·真无线电）／n≥2 BLOCKED_ENV** | UIS-18：midea 连接成功→被动断线→「被动断线·1s 后自动重连（1/3）」→**自动重连成功**；live 会话 **10 次**自动重连成功（`logs/app-live-midea-session.log`）；`snaps/p006-midea-reconnecting.png`（重连中 1/3 状态 UI）；环境唯一可连设备仅 midea（iphone 拒连/不广播服务），n≥2 并行 UI 口径由 UIS-17 机制 + 状态注入审计覆盖 |
| 3 | 服务/特征发现 | **PASS（真无线电）** | midea：ATT 协商（最大写入 20B / withResponse 512B）→ 服务发现完成（3 服务：FFA0/FF80/FF90，各 2 特征 write+notify）；`snaps/p006-midea-gatt-reconnect-log.png` |
| 4 | HEX/UTF-8 读写 + Notify | **PARTIAL · 写/监听 BLOCKED_ENV** | 读：midea 三服务全部特征仅 write/notify，**无 read 特征**，真读 BLOCKED_ENV；写：有 write 特征但向真实家电写控制字节不安全不执行；Notify：P006 真实订阅路径 + 单测覆盖，环境设备静默无推送（UI 订阅点击与 ~15s 重连周期存在 AX 竞态，未留截图，如实记录）。字节级读写监听 = Phase 7 夹具项（工具已备好：probe 写日志已带 hex= 字段） |
| 5 | Peripheral 广播 + GATT Server | **PASS（本机真实启动）／外部可见性 BLOCKED_OBSERVER** | P008 真实 CBPeripheralManager：开始广播 name=SmartBLE uuid=FFE0 →「广播已启动」→ 停止→「广播已停止」；广播中字段禁用态正确；`snaps/p008-broadcast-on.png`；`logs/app-p008-broadcast-session.log`。外部可见性：**macOS 本机中心收不到本机外设广播（本日实证，两轮对照实验：advertising_started 无错 + 同机 scan 只见环境设备）**，需第二观察端（iPhone App / 另一 Mac / ESP32 observer），Phase 7 |
| 6 | Smart HID 配网/详情/诊断 | **PASS（诚实路径）／真配网链 BLOCKED_FIXTURE** | UIS-15（原 UIS-14 块）：环境设备 → `smart_hid_service_missing` 诚实横幅 + 重新连接可达；UIS-12：P003 详情守卫态 + P005 四诊断态。真配网走链：软件夹具已就绪（`tests/macos/ble-fixture --mode shid`，shid_sim_main.cpp 全行为移植）+ UIS-19 自动用例（广播 9F1D1001 即激活）——同机不可见故今日 SKIP |
| 7 | OTA | **PASS（相位机真实文件驱动）／端到端 BLOCKED_FIXTURE** | UIS-16：无 manifest→ready、无会话→OTA_SESSION_LOST、sha 不符→OTA_HASH_MISMATCH、正确 manifest→ready 四态；软件夹具已就绪（`--mode ota`：CTRL/DATA/STATUS + sha256/size 校验 + 故障注入 + commit 后 2A26 版本切换）+ UIS-18-OTA 用例（广播 4FAFC201 即激活） |
| 8 | 权限/沙盒/签名首启 | **PASS（如实口径）** | `--sandbox-probe`：sandbox=OFF（开发二进制无沙盒 entitlement，写入容器外 ALLOWED — 如实呈现非伪造）；codesign：adhoc 签名；spctl：rejected（未公证，非分发形态，符合 r6 NVD 口径）；entitlements 仅 `get-task-allow`；蓝牙授权链：扫描成功即证明 TCC 已授权（归因宿主进程）；UIS-09 外围模式真实就绪判定 PASS |
| 9 | CoreUnit / 页面冒烟 / 真实 BLE | **PASS** | CoreUnit **62/62**；PageSmoke **19 PASS + 2 SKIP + 0 FAIL**（UIS-18 新真链 PASS；UIS-18-OTA / UIS-19 按设计 SKIP）；真实 BLE 会话证据见 #1-#5 与 logs/ |

自动基线复跑（HEAD `5e1fbaf`）：swift build ✓ · `--unit-core` 62/62 · `--smoke-pages` 全绿。

## 本轮新增资产（已构建、待提交）

1. **`tests/macos/ble-fixture/`** — Smart BLE macOS 软件对端夹具（新 SwiftPM 包）：
   - `--mode shid`：Smart HID 配网模拟器（`hardware/esp32/LightBLE/src/shid_sim_main.cpp` 行为移植：9F1D1001 服务 + INFO/INPUT/STATUS + framed-v1 组装 + candidate 校验 + 7 步走链 + 场景注入 FAIL-WIFI/FAIL-HUB/FAIL-MQTT/FAIL-STORE/token ff·ee·dd/SLOW，另支持 `--scenario` 强制）
   - `--mode ota`：OTA 设备模拟器（`ota_server.cpp` 行为移植：4FAFC201 服务 CTRL/DATA/STATUS + 180A→2A26 版本 + start/commit/abort + sha256/size 校验 + `--fault wrong_size|commit_fail|timeout|abort_next` + commit 成功后 2A26 切换为新版本模拟重启）
   - 自检：两模式均干净启动广播（见 `logs/fixture-selftest-*.log`）
2. **`tests/macos/native-probe/` 增强**：`gatt_write_received` 日志补 `hex=`（字节级写证据）；scan `DEVICE=` 行补 `uuids=`（广播服务 UUID 清单）；connect 模式 `--no-write`（对环境设备安全探测：发现+读达标、通知计数如实记录、不写任何字节）
3. **`PageSmoke` 新增三用例**（环境门控，夹具在场自动转正）：
   - **UIS-18** 真实多设备连接 + 被动断线重连观察（本轮即真机 PASS）
   - **UIS-18-OTA** OTA 真实链（发现 4FAFC201 广播 → 连接 → 2048B 真包 + manifest → start→分块→commit→2A26 回读 → success）
   - **UIS-19** Smart HID 真实配网链（9F1D1001 → 连接 → INFO 身份验证 → candidate 下发 → 走链 → done）

## 平台发现（如实记录，影响后续排期）

- **P-F1 本机外设不可见**：macOS 本机 CBCentralManager 收不到本机 CBPeripheralManager 的广播（两轮对照实证）。⇒ 单机上 App↔软件夹具无法互连；软件夹具需第二观察端使用。Phase 7 ESP32 到场后 UIS-18-OTA/UIS-19 直接转正（固件广播同 UUID）。
- **P-F2 标准服务禁发布**：CBPeripheralManager 不能 add 180A 等标准保留服务（CBErrorDomain code=8）。夹具已按「2A26 挂入自定义服务」收口（App readCharacteristic 跨服务按 UUID 命中，语义等价）。
- **P-F3 带缓存值特征必须只读**：notify/write 特征预缓存 value 会在 add service 时抛异常；夹具改为动态应答读请求 + updateValue 推送。

## 遗留风险（App 侧，供决策）

- **R-1 OTA start 契约差异**：App 发 `{"op":"start","target":<版本号|文件名>,…}`（OtaManager.swift:185）；ESP32 固件要求 `target ∈ {lightble-peripheral, lightble-observer}` + 独立 `target_version` 字段（ota_server.h:18-19）。真固件将以 `invalid_target` 拒绝。⇒ Phase 7 联调前需调和（改 App 或改固件契约，属协议正典层面，未擅动）。
- **R-2 OTA 失败帧漏检**：App 状态解析对 JSON 值做集合**精确**匹配（`contains("fail")` 不命中 `"failed"`，OtaManager.swift:375-380）；固件 `notifyStatus("failed",…)` 失败帧将被漏检，客户端落入 30s 超时而非立即失败。`"error"` 状态可命中。修复属一行级（`contains` 改前缀/子串判定），随 R-1 一并决策。
- **R-3 n≥2 并行**：环境仅一台可连设备；UIS-18/UIS-17 已把口径建好，Phase 7 夹具环境自然覆盖。

## BLOCKED 项登记（全部有既定解锁路径）

| 项 | 原因 | 解锁 |
|----|------|------|
| OTA/SHID 真走链（#6/#7 端到端） | 无夹具 + P-F1 同机不可见 | Phase 7 ESP32（UUID 一致，UIS-18-OTA/UIS-19 零改动转正）或任意第二观察端 |
| 字节级写/Notify（#4 剩余） | 环境设备不可写（安全）/无 read 特征 | Phase 7 夹具；probe 已带 hex= 证据链 |
| 广播外部可见性（#5 剩余） | P-F1 + 无第二观察端 | Phase 7 observer 固件或 iPhone 侧工具 |
| n≥2 并行实测（#2 剩余） | 环境仅 1 台可连 | Phase 7 夹具（双外设） |

## 复现命令

```bash
# 基线
cd apps/desktop/macos/SmartBLE-mac && swift build && ./.build/debug/SmartBLE-mac --unit-core
./.build/debug/SmartBLE-mac --smoke-pages          # 含 UIS-18 真链（环境设备在场即跑）
./.build/debug/SmartBLE-mac --sandbox-probe
# 软件夹具（第二观察端在场时 = 真对端设备）
cd tests/macos/ble-fixture && ./.build/debug/ble-fixture --mode shid --duration 300
./.build/debug/ble-fixture --mode ota --duration 300 --fault commit_fail
# 独立观察/探测
cd tests/macos/native-probe && ./.build/debug/native-probe --mode scan --duration 10
./.build/debug/native-probe --mode advertise --name Probe-A --uuid <HEX-UUID> --duration 60
./.build/debug/native-probe --mode connect --uuid <HEX-UUID> --no-write
```
