# 20260918-WIN-007（部分执行——环境就绪 + 两轮配网尝试均止于 Wi-Fi 行）

## 范围

WIN-007 Smart HID E2E 的前置环境搭建、设备基线验证，以及两轮真实向导下发
（Playwright 驱动 Electron 全流程到「下发配置」）。快乐路径**未达成**：两轮
均在进度卡第一行 Wi-Fi 失败（✕）。其余失败路径场景未开始。

## 两轮配网尝试（Playwright 驱动真实 Electron 向导）

向导链路本身全部走通（扫描 → SHID 设备卡 → 连接 + Device Info 校验 → 填表 →
二维码回退粘贴配对码 → 下发），两轮均在数秒内到达下发，进度卡 wifi 行 ✕：

| 轮 | 时间 | 下发 SSID | hub | 结果 |
|---|---|---|---|---|
| 1 | 14:09 | HJWY | 192.168.21.77:17892 | wifi ✕ —— 本机多轮 netsh 扫描 HJWY 仅见信道 48（5GHz）单 BSSID，ESP32-S3 仅 2.4GHz。注：8 月配网成功时设备 IP 落 192.168.20.x（与 PC 21.x 不同网段），当时实际加入的可能是同区域另一 SSID；HJWY 是否存在 2.4GHz 射频未证实 |
| 2 | 14:36 | REDMI K80（手机热点，信道 1 = 2.4GHz） | 10.251.51.3:17892 | wifi ✕ —— **未诊断，用户决定另行单独处理**。candidate/staging 链路正常（日志 L2058-2074），设备端 join 即失败进入 ~5s 重试循环直至抓取结束 |

第 2 轮 ControlHub 侧已随迁（bind 0.0.0.0 / advertise 10.251.51.3），测试后
已还原回 HJWY 配置并重启（health ok）。设备 NVS 现存指向热点的 staged 配置，
热点关闭后设备持续重试属已知代价。

## 环境快照

| 组件 | 状态 |
|---|---|
| 固件 | v1.2.0 + 电源管理二件套（smart-hid-workspace f396537），erase_flash 后全新烧录 |
| 设备 | NVS 已擦除，boot 证实 `state=unprovisioned → provisioning mode`，BLE 广播 SHID-00000001（广播竞态修复跨重启稳定） |
| ControlHub | v1.2.0（commit 8317e9d），17890/17891/17892 全部监听；配对会话经回环免鉴权创建；测试后已还原 HJWY 配置并重启 |
| Electron | noble 后端 BLE poweredOn；两轮扫描/连接/下发全链路真实执行 |

## 发现：status_manager 谎报在线（新 bug，已登记 HARDENING_BACKLOG）

`device-reboot-boot.log` 完整链路：boot 即 unprovisioned、无 WiFi 关联、无 MQTT 连接，
但 status_manager 从启动第 11 秒起每 10s 输出 `status published online=1`。

根因（smart-hid-workspace 固件）：
- `status_manager.c:28` 心跳硬编码 `publish_now(true)`，未用现成的 `mqtt_manager_is_connected()`
- `mqtt_manager.c:211` 未连接时静默 no-op；`status_manager.c:42` 无条件打 "published"

诊断误导实录：该假 online 曾被当作"设备已连上某个 broker"排查了 20 分钟
（ControlHub 设备表为空、17891 无外部连接、设备端却无任何 MQTT 错误——三者矛盾
最终由重启抓 boot 日志裁决）。

## 文件

- `device-serial.log` — 12:14-14:42 抓取。L509 起 = 第 1 轮（HJWY）；L2058 起 =
  第 2 轮（REDMI K80，candidate → staged → connecting 后接 "Wi-Fi connect fail"
  重试循环至抓取结束）
- `device-reboot-boot.log` — 13:3x 复位后完整 boot（裁决性证据）
- `electron-wizard-final.png` — 第 2 轮向导失败定格（wifi ✕ · · ·）

脱敏核对：两轮 Wi-Fi 密码均经环境变量注入，日志 0 命中；token 全部 `**redacted**`。
