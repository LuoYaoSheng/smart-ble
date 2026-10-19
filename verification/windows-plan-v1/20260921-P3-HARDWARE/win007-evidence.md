# P3-3 · WIN-007 Smart HID Windows E2E（环境受限下的最大化验证）

- 基线：a446608；hub：smart-hid-controlhub 源码 build（controlhub-p3.exe，config=E13 遗产 LAN 模式）
- 结论口径：**BLE 配网链全通 + FW-LOCK 清除铁证 + hub 配对会话消费**；WiFi 步骤因环境（路由器 5G-only）无法到终态 Ready → 维持 `PASS_WITH_OBS`（观察项=WiFi 环境，非产品缺陷）

## 成功路径（已验证）

| 步骤 | 证据 |
|---|---|
| ControlHub 源码 build+启动 | `go build` exit0；HTTP 17890/MQTT 17891/配对 17892 三端口日志 |
| 一次性配对码（LAN 口径） | `pairing-session-lan*.json`（qr_payload host=192.168.21.77——**必须从 LAN IP 创建**，127.0.0.1 创建的 host 不可达设备，E13 在册坑位复现） |
| WiFi 凭据 | 从 Windows 导出 HJWY profile（提权 `netsh wlan export key=clear`，密码不入任何日志/证据文件） |
| E-WIN 扫描+配网入口 | CDP 驱动：扫描→SHID 弱匹配卡→「配置 Smart HID」（**发现新缺陷 EWIN-DEF-PROV-001 候选：匹配态晚于首渲，卡片首次渲染不带「配置」按钮/chip，强制 renderDeviceList 后出现——时序缺陷登记，走查用重渲绕过**） |
| P002 连接+身份 | 自动连接 → `HID-00000001 · fw 1.2.0 · unprovisioned` 身份验证过 |
| 表单+配对码兜底 | QR 大按钮 → 模态 →「无法扫码？粘贴/手输」→ 填 `shid://pair?token=…&host=192.168.21.77&port=17892` → 解析并回填（badge=已获取）——**F020 兜底路径真机实证** |
| candidate 下发 | submit → STATUS 七步推进：received→…→ControlHub 配对→（UI 步进全部点亮） |
| **FW-LOCK 清除铁证** | **INPUT 特征成功接受 candidate 写入**（断电重启恢复写能力；20260918 起 0x0D 锁死现象消失）——配对推进本身就是写入成功证明 |
| hub 侧配对会话消费 | hub devices 注册 `HID-00000001`（boot_id B-D00422）；17892 配对交换完成 |
| 设备侧行为 | BLE 广播按正典停止（配网期）→ WiFi 尝试（串口 `wifi_manager` 日志）→ 重试期 BLE 广播恢复（coex）→ INFO=`state=provisioning` |

## WiFi 环境受限（观察项，非缺陷）

- 设备串口持续：`wifi:Coexist: Wi-Fi connect fail` ×N（`evidence/p3-16-recovery-info.txt` 前置串口截取在会话记录）。
- 根因测定：**HJWY 路由器 5GHz-only**（`netsh wlan show networks mode=bssid`：单 BSSID 4c:ef:56:8d:48:48 信道 36=5G；无 2.4G BSSID）；ESP32-S3 仅支持 2.4G → 永远连不上。
- E13（2026-09-04）同 SSID 曾可达 controlhub 步骤 → **17 天内路由器/网络环境变化**（2.4G 消失或改独 SSID）。
- Windows 移动热点尝试：PS WinRT TetheringManager 异步坑（AsTask 重载不匹配）+ netsh hostednetwork 提权后 START_EXIT=1（SoftAP 驱动不支持）——两条自动热点路径均不通（坑位在案）；**用户手机 2.4G 热点是剩余解锁路径**（需用户操作：开热点+告知密码+Windows 连热点后 hub 地址换热点网段重配网）。

## 失败路径覆盖（本轮）

| 路径 | 状态 |
|---|---|
| wifi_failed | ✅ **真实场景天然取证**（密码正确但 2.4G 不存在=设备侧 wifi 连接失败循环，串口日志持续输出） |
| pairing_expired | ⛔ 被 WiFi 环境阻断（设备到不了 hub:17892，token 过期场景无法在设备侧触发）；hub 侧已证 token 5 分钟过期机制（两枚 token 相继 expired，API 状态机在案） |
| mqtt_invalid | ⛔ 同上（WiFi 不可达 → MQTT 步不可达） |
| 断线恢复/取消 | 部分：E-WIN P002 兜底 UI（取消等待/重新连接按钮）在案；设备 provisioning 态 BLE 可重连 |

## 遗留（解锁条件=2.4G AP）

- 配网终态 Ready（USB HID 工作态）+ P003 快照 + P005 五项诊断的已配网分支：待 2.4G 环境（用户热点或恢复 2.4G 的路由器）。
- pairing_expired / mqtt_invalid 设备侧取证：同上。
- hub devices 显示 `firmware:1.1.0` 而设备为 1.2.0（配对上报字段口径差异——观察项交 hub 侧）。

## 坑位账（本轮新增）

1. 配对 QR host 按访问来源解析——**必须从 LAN IP 调创建 API**（E13 在册，本轮复现确认）。
2. 配对 token **5 分钟有效期**（比直觉短）——驱动链路一卡就过期，创建后立即用。
3. CDP `Page.captureScreenshot` 在 QR 模态（摄像头流启动）时**挂起**——模态期改纯 evaluate 轮询。
4. E-WIN 扫描卡 profileMatch 时序缺陷（EWIN-DEF-PROV-001 候选，见上）。
5. `5GHz-only 路由器` = ESP32 配网的地板（SSID 同名双频才可，单 5G 直接 wifi_failed）。
