# E13 真机执行手册（runbook）

> 修正版。前几跑的教训已固化进本手册：
> 1. **配对码来自 ControlHub 网页**——凡是需要真实 token 的场景，手机跑到"扫码"步骤之前，
>    PC 必须先完成「打开控制台 → 登录 → 点『创建配对会话』→ 二维码上屏」。
>    之前用 curl 直接建会话、跳过网页，测的是逻辑链，不是用户流程；本手册按用户流程排步。
> 2. **控制台必须用 `http://192.168.21.77:17890` 打开**（不要用 127.0.0.1）——
>    QR 的 host 字段按请求来源 IP 生成（`internal/pairing/qr.go` + netaddr Resolver），
>    从 127.0.0.1 打开则 QR 里 host=127.0.0.1，手机不可达。
> 3. **READY 即停广播**（canon PROVISIONING_V1）——失败类场景全部排在成功场景之前，
>    否则设备不再广播、后续场景全部无法发现设备。
> 4. 弹层退场动画期间模态 barrier 仍吞点击（U-01 首跑命中链含
>    `_RenderTheater`+`RenderAbsorbPointer`）——凡点 AppBar 返回键前先等 BottomSheet 退场。

## 0. 本轮环境常量（实测确认）

| 项 | 值 | 确认方式 |
|---|---|---|
| Samsung（主测机） | adb `R5CR1284Y7H` | adb devices |
| Xiaomi（第二手机） | adb `50143338` | adb devices |
| ESP32-S3 固件 | MAC `10:B4:1D:CD:23:8E`，广播名 `SHID-00000001`，Service 9f1d1001 | 空口 BleAdvDump |
| 烧录口 | 本轮实际枚举确认 `COM13`（USB=303A:1001；不写死，逐轮以实际发现为准） | 设备管理器/enum |
| ControlHub | 单进程 PID 监听 17890(HTTP)/17891(MQTT)/17892(pairing) | netstat |
| PC LAN IP | `192.168.21.77`（另有 192.168.16.1/137.1 虚拟网卡，不可用作 host） | ipconfig |
| API key | `smart-hid-workspace/smart-hid-controlhub/data/initial-api-key.txt`（不入库、不入日志、不入证据） | 文件存在 |
| esptool | `C:/Users/11066/.platformio/penv/Scripts/esptool.exe` | 已用其 run 注入复位 |

## 1. 每个场景的通用前置（顺序执行，全绿才开跑）

1. **ControlHub 在跑**：`netstat -ano | grep 1789`（三个端口全 LISTENING）。
2. **手机 adb 在线**：`adb -s <serial> shell echo ok`；`adb devices` 无 offline。
3. **预授权 5 权限 + 亮屏**：wrapper 脚本已内置（location/bluetoothScan/bluetoothConnect/camera/读取态，
   `WAKEUP` + `dismiss-keyguard` + `svc power stayon usb`，跑完自动还原 `stayon false`）。
4. **守护进程在线**（处理 App 外系统弹窗 + LOST 注入）：
   `python e13-pairing-daemon.py --serial <serial> --minutes 12 [--lost-watch --esp-port COM13]`
   （只有 lost_configure 场景需要 `--lost-watch --esp-port`）。
5. **空口确认设备在广播**：`BleAdvDump.exe 3 10B41DCD238E` 应见 adv（T1 成功后此步会变空，属预期）。
6. **需要真实配对码的场景（T4/T1/T7/小米）加做**：
   a. 浏览器打开 `http://192.168.21.77:17890`；
   b. 首次需在 API Key 框粘贴 key（存 localStorage，之后免输）；
   c. 「配对新设备」面板 → 点 **「创建配对会话」** → 页面出现 180×180 二维码 +
      「等待设备配对…」轮询（提示语：手机扫描二维码完成配对）；
   d. 截图存证（evidence/web-qr-<场景>.png）；
   e. 从页面取 `qr_payload`（即二维码编码的全文，形如
      `shid://pair?token=<32hex>&host=192.168.21.77&port=17892`）；
   f. **会话 5 分钟有效——点完按钮立刻开跑手机侧**。
   
   相机说明：真实用户用手机相机扫屏幕上的二维码。自动化无人手持对准，
   走 App 内置「粘贴配对码」入口（与相机同一解析函数 `parsePairingQrPayload`）；
   相机物理扫描列为可选人工步骤（用户在场时可举起手机扫屏复核一次）。

## 2. 场景矩阵与执行顺序（失败先行，成功殿后）

| 序 | 场景 | 网页会话 | 注入 | App 终态断言 | 证据 |
|---|---|---|---|---|---|
| 1 | U-01 leave 两态 | 否（伪 token） | 无 | 填写态/等待态弹窗文案 + 取消后现场保留 | u01-leave-app.log |
| 2 | T2 wifi_fail | 否 | 错密码（define） | `wifi_failed` + 「返回表单修改」 | t2-wifi-app.log |
| 3 | T3 pairing_invalid | 否 | 伪 token（define，真 Wi-Fi 凭据） | `pairing_invalid` + 「重新扫描配对码」 | t3-pairing-app.log |
| 4 | T4 mqtt_invalid | **是** | Windows 防火墙拦入站 TCP 17891（需管理员；无则本场景 BLOCKED） | `mqtt_invalid` + 「运行诊断」→ 诊断面板重读 INFO/STATUS | t4-mqtt-app.log + 防火墙规则截图 |
| 5 | T5a cancel_wait | 否（伪） | 点「取消等待」 | `timeout` + 「重新下发」 | t5a-cancel-app.log |
| 6 | T5b lost_configure | 否 | LOST_ARMED 标记后 esptool run 复位芯片断连 | 断开横幅 + 「重新连接」 | t5b-lost-app.log |
| 7 | T1 success | **是** | 无（全真凭据） | 「配置成功 · 设备 READY」+ provisioned:true | t1-success-app.log + web-qr-t1.png |
| 8 | T6 面板核验 | （沿用 T1 后状态） | 无 | 控制台设备表出现 SHID-00000001 且 online | web-devices.png + /api/v1/devices JSON |
| 9 | T7 重配 | **是**（删除后新建） | 网页/API 删除设备 → 固件 RECOVERY 恢复广播 | 空口重新见广播 + 二次配网成功 | t7-recover-*.log |
| 10 | 小米 happy | **是** | 无 | 同 T1（第二手机） | xm-success-app.log |

伪 token 场景说明（为何不需要网页）：注入本身就是"伪造配对码"，设备端到达该错误分支
（wifi_failed 在连 Wi-Fi 阶段即失败 / pairing_invalid 是 hub 对伪 token 的 404），
网页真实会话反而不是被测对象。这点与"用户流程完整性"不冲突——用户流程完整性由
T1/T4/T7/小米四个真实会话场景覆盖。

## 3. 每场景具体步骤

### 3.1 U-01 离开确认两态（当前正在跑）
1. 通用前置 1–5（无需网页会话）。
2. 守护进程：`python e13-pairing-daemon.py --serial R5CR1284Y7H --minutes 12`。
3. 跑：
   `P002_WIFI_SSID=e13-leave P002_WIFI_PASSWORD=throwaway123 P002_TOKEN=deadbeefdeadbeefdeadbeefdeadbeef P002_HOST=192.168.21.77 bash e13-run-scenario.sh leave R5CR1284Y7H u01-leave`
4. 判定（App 日志标记）：`U-01 填写态弹窗 ✓` + `U-01 等待态弹窗 ✓` + `scenario=leave 全部断言通过`。

### 3.2 T2 错密码
1. 通用前置 1–5；守护进程 12 分钟。
2. `P002_WIFI_SSID=<真SSID> P002_WIFI_PASSWORD=<错误密码> P002_TOKEN=deadbeef… P002_HOST=192.168.21.77 bash e13-run-scenario.sh wifi_fail R5CR1284Y7H t2-wifi`
3. 判定：`outcome=wifi_failed` + 「返回表单修改」存在。
   （凭据只在命令环境变量与 App 内存，日志掩码，不落证据。）

### 3.3 T3 伪 token
1. 通用前置 1–5；守护进程 12 分钟。
2. `P002_WIFI_SSID=<真SSID> P002_WIFI_PASSWORD=<真密码> P002_TOKEN=deadbeef… P002_HOST=192.168.21.77 bash e13-run-scenario.sh pairing_invalid R5CR1284Y7H t3-pairing`
3. 判定：`outcome=pairing_invalid` + 「重新扫描配对码」存在。
4. 空口复核：设备失败后恢复广播（错误不清 NVS pending，仍可被发现）。

### 3.4 T4 mqtt_invalid（需网页会话 + 防火墙）
1. 通用前置 1–5。
2. **网页建会话**（前置 6，截图 web-qr-t4.png，取 qr_payload）。
3. **防火墙**（管理员 PowerShell）：
   `netsh advfirewall firewall add rule name="e13-block-mqtt" dir=in action=block protocol=TCP localport=17891`
   无管理员权限 → 本场景记 BLOCKED，跳过并继续。
4. 跑 wrapper（token 用网页 qr_payload 里的真 token）。
5. 判定：`outcome=mqtt_invalid` + 「运行诊断」→ 诊断面板出现「Provision Status（STATUS 特征）」。
6. **立即删规则**：`netsh advfirewall firewall delete rule name="e13-block-mqtt"`。

### 3.5 T5a/T5b
- T5a：伪凭据直接跑 cancel_wait；判定 `outcome=timeout` + 「重新下发」。
- T5b：守护进程带 `--lost-watch --esp-port COM13`；跑 lost_configure；
  App 打出 `LOST_ARMED` 后守护自动 `esptool run` 复位芯片；判定断开横幅 + 「重新连接」。

### 3.6 T1 成功链路（本轮主目标）
1. 通用前置 1–5；守护进程 12 分钟。
2. **网页建会话**（前置 6；截图 web-qr-t1.png；**点完立刻跑第 3 步，5 分钟窗口**）。
3. `P002_WIFI_SSID=<真SSID> P002_WIFI_PASSWORD=<真密码> P002_TOKEN=<网页token> P002_HOST=192.168.21.77 P002_PORT=17892 bash e13-run-scenario.sh success R5CR1284Y7H t1-success`
4. 判定三路：
   - App：`配置成功 · 设备 READY` + 查看设备面板 `provisioned：true`；
   - 网页：配对面板翻「✓ 已配对」；设备表新增条目 online；
   - 空口：广播停止（BleAdvDump 10s 无 adv）。
5. T6 紧随：控制台截图 + `GET /api/v1/devices` 存 JSON。

### 3.7 T7 重配
1. 网页/API 删除设备（DELETE devices）→ 固件侧检测失配进 RECOVERY → 恢复广播（空口确认）。
2. 网页**新建**配对会话（截图 web-qr-t7.png）。
3. 再跑 success（凭据同 T1，新 token）。
4. 判定：二次 READY + provisioned:true + 设备表再次 online。

### 3.8 小米 happy path
1. `adb -s 50143338` 走一遍通用前置（权限授权/亮屏）。
2. 网页新会话 → 跑 success（serial=50143338）。
3. 判定同 T1（App 路径；该机无 daemon 需求差异，系统配对弹窗同样由守护点按——守护进程 serial 参数换 50143338）。

## 4. 跑完全场景后的复原（一次性）
- 防火墙规则确认已删；两手机 `svc power stayon false` + force-stop App；
- 回刷 canon 固件 fixture_peripheral_s3（erase + 4 image，烧录前按约定再确认端口）；
- 停 ControlHub；删除临时物：config.yaml 本轮副本/独立 exe/initial-api-key 引用/`__pycache__`/`*_ui.xml`/临时探针；
- 证据统一脱敏检查（token=MASKED32HEX、密码=MASKED_PASSWORD）后写 README 汇总表。
