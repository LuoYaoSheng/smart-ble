# P3-4 · WIN-008 Windows OTA 全链 E2E（两线完整闭环，20260921）

- 基线：a446608；固件：LightBLE fixture 双版本（pio 新构建，SHA 在案）
- 结论：**E-WIN/T-WIN 两线 OTA 版本迁移真实成功**（start→ready→DATA→commit→success→reboot→设备侧版本回读），WIN-008 验收主体达成；取消路径未显式走查（OBS）

## 固件与 manifest

| 项 | 值 |
|---|---|
| 基线 | `fixture_peripheral_s3`（FIRMWARE_VERSION=1.0.0），sha256=`0387b23c…e1d537`，570,480B，pio 构建后烧录 COM12 |
| 目标 | `fixture_peripheral_s3_cdc`（1.0.1-cdc，前人设计的 OTA target 变体），sha256=`50e93f67…15869de4`，556,544B |
| manifest | `ota-target-manifest.json` 六字段（target=`lightble-peripheral` 枚举、version、size、sha256 实测比对 + product/role） |

## E-WIN 线（`ewin-ota-e2e.mjs`，CDP 9236/9237 + DOM.setFileInputFiles 注入）

| 步骤 | 结果 |
|---|---|
| 扫描→连接 BLEToolkit-Server→P006→OTA 入口 | ✅（OTA 服务 4fafc201 在场 → 右上固件更新图标） |
| 选包（bin+manifest） | ✅ 包校验通过（sha256/size 实测比对） |
| start→ready | ✅（首轮无 target 字段被**设备侧拒绝 `OTA_ERR_STATE missing_target`**——参数校验拦截实证；修正后通过） |
| DATA 传输 | ✅ 556,544B 全量（~400s，~1.4KB/s 稳定） |
| commit→success→reboot | ✅ UI「✅ OTA 完成！设备正在重启……」100% |
| **重启后版本回读（设备侧独立证据）** | ✅ BLE 直读双特征：OTA 状态 `{"status":"idle",...,"firmware_version":"1.0.1-cdc"}` + INFO `{"firmware_version":"1.0.1-cdc","hardware":"esp32-wroom-32","uptime":116}`；GATT 树重启后健康（1800/1801/4faf×4） |
| 传输中断重开 | ✅ 天然覆盖：首轮被驱动超时误杀于 64%→重连→重新 start 全程成功（中断后再升级可行） |

## T-WIN 线（`twin-ota-e2e.mjs`，release exe + WebView2 CDP 9238）

同全链：扫描→连接→OTA 对话框→注入文件→start→**370s 传输 100%→重启**→bleak 版本回读 `1.0.1-cdc`（uptime=82s）。**与 E-WIN 行为一致**（同 ota-contract.js 契约层）。

## 拦截类（验收步骤 2）

- manifest 校验：target 枚举/SemVer/size/sha256 链在 ota-contract.js（tests/desktop 95/95 覆盖）。
- **设备侧 start 参数校验实证**：missing_target 拒绝（上表）。
- 缺 manifest/目标错/大小错/Hash 错的 UI 前置拦截：契约测试覆盖（本轮未逐项真机重放，OBS）。

## 取消恢复（验收步骤 4）

- 显式「取消发送 abort」路径未走查（OBS）。
- 传输中断后重开会话升级成功（天然场景，上表）。

## 设备归位

- OTA 测试完成与验收后：`esptool erase_flash`（8MB 全擦）+ 按 flash_args 四分区归位烧录 SHID 固件（bootloader 0x0/partition-table 0x8000/ota_data 0x11000/app 0x20000）→ **SHID-00000001 广播恢复（-37dBm，原 MAC 10:B4:1D:CD:23:8E）**=出厂 unprovisioned 干净态（FW-LOCK 已清+配网 NVS 已重置）。

## 坑位账

1. manifest **target 是设备侧必填**（UI 可选/设备必需的错位）——枚举 `lightble-peripheral|lightble-observer`。
2. OTA 556KB@~1.4KB/s ≈ 6.5 分钟——**驱动轮询上限须 ≥10 分钟**（首轮 240s 上限把 64% 传输误杀）。
3. electron 崩溃后重启偶发 `0xC0000142`（自愈型，等数秒重试即可）。
4. esptool 新版 flash_mode/freq/size 参数须放 `write_flash` 子命令之后。
5. fixture 烧录后 BLE MAC 尾字节变化（派生差异），扫描断言勿硬编码 MAC。
