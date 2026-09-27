# HJWY 配网失败三层根因诊断（2026-09-27）

**触发**：用户确认 HJWY 为 2.4/5G 双频融合并给出密码，问「为啥配不了 ESP32 的网」。
上轮（20260921 P3-HARDWARE）结论「HJWY 5GHz-only → ESP32 永不可连」**为误诊**。

## 空口真相（netsh 双频扫描）

- HJWY 2.4G BSSID `20:20:27:b0:b8:c1`：802.11n，**信道 13**，WPA2-个人/CCMP
- HJWY 5G BSSID `4c:ef:56:8d:47:fe`：802.11ax
- 上轮「信道 36 单 BSSID」来自**配网页的 host 侧 WiFi 扫描**（显示融合 SSID 最优
  BSSID=5G），并非设备侧视角——设备自己的扫描里根本没有 2.4G 条目（见层 1）。

## 层 1（已修复✅）：国家码默认 01 只扫信道 1-11

ESP-IDF v5.4 `esp_wifi.h:803`：默认国家 `"01"` 世界安全模式 `{schan=1, nchan=11}`。
固件从未调 `esp_wifi_set_country` → 2.4G BSSID 在信道 13 上对设备不可见 →
`NO_AP_FOUND` → wifi_failed（密码正确也连不上）。

**修复**：`wifi_manager_init()` 在 `esp_wifi_start()` 后加
`esp_wifi_set_country_code("CN", false)`（信道 1-13）。
**实证**（evidence/serial-cap12.txt，DEV Kconfig 直填无 BLE 干扰）：

```
I (1359) wifi_manager: connecting to ssid=HJWY ...
I (4346) wifi_manager: got ip: 192.168.23.48     ← 3 秒拿到 IP
```

## 层 2（已定位，Windows 中央下未解⚠️）：BLE 连接态 coex 饥饿 reason=210

修完层 1 后配网仍失败，串口（本轮新打通，见下）实锤：

```
candidate: ssid=HJWY hub=... → connecting to ssid=HJWY ...
W disconnected reason=210 → release_all + retry   （每 3.1s 循环 ×N）
I (395658) wifi:Coexist: Wi-Fi connect fail, apply reconnect coex policy
```

**对照矩阵**：
| 场景 | WiFi 关联 |
|---|---|
| 无 BLE 连接（DEV 直填，广播可开） | ✅ 3 秒拿 IP |
| BLE 连接（WinRT 中央，E-WIN 配网会话） | ❌ 210 循环至 15s 超时 |

已试缓解（全部无效于 Windows 中央）：`esp_coex_preference_set(PREFER_WIFI)`、
从机 CPUP 参数放松请求（`ble_gap_update_params` 200-300ms，rc=0 但 Windows 不接受）、
关联窗口 `WIFI_PS_MIN_MODEM`。CPUP 放松代码保留在固件中（对 Android 中央
大概率有效——产品主路径历史配网成功均走手机端）。

## 层 3（新事实，非阻塞）：2.4G 侧为 192.168.23.x 段

设备从 HJWY 2.4G 侧拿到 `192.168.23.48`（Windows/hub 在 21 段，ping 设备不通=
跨段正常表现）。产品链路为设备**外连** hub（POST 17892 配对 + MQTT 17891），
方向上可穿 NAT；终态待层 2 解后实测。

## 本轮固件改动（smart-hid-workspace，见该仓提交）

- `wifi_manager.c`：国家码 CN + 断链 reason 码日志 + 关联窗口 PS_MIN_MODEM/恢复
- `ble_provision.c/.h`：`ble_provision_relax_connection()`（CPUP 请求 API）
- `main.c`：WiFi 关联前调用 relax
- 注意：本机 IDF 解析为 5.4.0（原 lock 记录 5.4.4），lock 已还原未提交

## 诊断能力与坑位账（本轮新增）

- **COM12 CH343 串口日志全通**（115200）——旧「无串口」结论仅适用 COM13 的
  USB-CDC 口；开串口会 DTR 复位板子（有时不复位，时序对齐要按「最后一次 boot」）
- **status_manager 的 `online=1` 是心跳无条件写死**（`publish_now(true)` 硬编码），
  不能当连接证据；连接证据只有 `got ip` / reason 码
- E-WIN 长会话 WinRT BLE 栈会楔死（假连接：显示已连、写才失败=ble_disconnected，
  设备侧零日志；重启 electron 即愈）——已两次实证
- adb `input text` 的 `%26` 不解码（原样打入）；EMUI 输入自动化四坑叠加
  （%26/DEL 清不净/BACK 歧义/CDN 截图同名缓存串图），手机端配网自动化性价比低
- 手机手动配网（产品主路径）未完成——**待用户在场时手填一次**（payload 现生成，
  5 分钟时效）
- IDF Windows：Git Bash export.sh 明确拒 MSys；`idf_cmd_init.bat` 用 DOSKEY 仅交互
  有效——正解=手工组 PATH（python_env+cmake+ninja+xtensa-elf）跑 `python idf.py`
- grep 管道接 `idf.py build` 会因匹配 `error_capture.c.obj` 提前关管道掐死构建

## Evidence（evidence/）

- `serial-cap12.txt` — **层 1 修复实证**（DEV 直填 3 秒 got ip）
- `serial-cap6.txt` — 210 循环首次捕获（reason 日志固件）
- `serial-cap11.txt` — E-WIN 重启后完整配网会话 + 210（coex 偏好版）
- `serial-cap14.txt` — CPUP relax 请求发出（rc=0）仍 210
- `serial-cap19.txt` — PS_MIN_MODEM 窗口仍 210
- `serial-cap5/9.txt` — boot/复位行为观察（心跳假象辨析素材）
- `prov-run*.log` — E-WIN CDP 驱动各轮 App 侧结果（wifi_failed/ble_disconnected）
- `ewin-prov-cnfix.mjs` — 一体化 CDP 驱动（密码走 env 不落盘；截图已移除：
  captureScreenshot 在 QR 模态挂起）
