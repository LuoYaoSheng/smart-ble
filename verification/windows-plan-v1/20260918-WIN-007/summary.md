# 20260918-WIN-007（部分执行——环境就绪 + 重大发现）

## 范围

WIN-007 Smart HID E2E 的前置环境搭建与设备基线验证。快乐路径（配网全流程）
**未执行**：向导等待用户输入 Wi-Fi 密码，当日未进行。失败路径场景未开始。

## 环境快照

| 组件 | 状态 |
|---|---|
| 固件 | v1.2.0 + 电源管理二件套（smart-hid-workspace f396537），erase_flash 后全新烧录 |
| 设备 | NVS 已擦除，boot 证实 `state=unprovisioned → provisioning mode`，BLE 广播 SHID-00000001（广播竞态修复跨重启稳定） |
| ControlHub | v1.2.0（commit 8317e9d），17890/17891/17892 全部监听；配对会话经回环免鉴权创建，过期未使用 |
| Electron | noble 后端 BLE poweredOn；扫描/连接零操作（日志为证） |

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

- `device-serial.log` — 12:14-13:32 抓取（仅 status 心跳流，窗口内无任何其他事件）
- `device-reboot-boot.log` — 13:3x 复位后完整 boot（裁决性证据）

脱敏核对：设备未配网，日志不含 Wi-Fi 凭据；无 token 内容。
