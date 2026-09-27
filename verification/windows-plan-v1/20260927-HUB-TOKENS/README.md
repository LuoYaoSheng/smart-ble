# 20260927-HUB-TOKENS 无 ESP32 硬件测试窗口（Hub 控制面 + release 包回归）

## 背景

用户报告「已连接→扫描」Tab 切换崩溃，并指示：测试可以不用 ESP32，
两部安卓 + Windows 足够。本窗口在该拓扑下完成：

1. 崩溃诊断（实锤=旧包 clinit NPE，见下）
2. 含六连修的新 release 签名包 + 华为装机回归
3. ControlHub pairing token 生命周期矩阵（T4 剩余项的 hub 侧半场）
4. MQTT READY / 命令下行 / 幂等重放模拟（E2E 终局的 hub+broker 半场）
5. release 包 × G-WIN 广播三窗空口回归 + 广播弹窗

## 一、崩溃诊断（用户报告：已连接→扫描→崩溃）

- dropbox 取证：最后一条 app crash = 15:10:11，栈为
  `BottomNavItem.getRoute() on null` @ `SmartBLEApp$switchTab`（旧
  MainActivity.kt:130）——即 20260927-ANDROID-E2E 已修的 companion clinit
  竞态 NPE（f668ac9 entries getter + getOrNull）。
- 15:29:48 装上六连修 debug 包后**零新增 data_app_crash**。
- 修复包暴力复现：已连接→扫描常规序列 / 40 连击交替 / 冷启动+0.6s 点
  Tab / 冷启动零延迟乱点全 Tab —— 全部 ALIVE，logcat 0 FATAL。
- 结论：用户崩的是**修复前的构建**（最大嫌疑=第二台手机上的
  20260926 release 包，早于六连修）。处置：从 f668ac9 出新 release。

### 新 release 包

- `apps/desktop/wails` 同级产物：
  `apps/android/app/build/outputs/apk/release/SmartBLE-v1.0.0-fix6-release.apk`
  （assembleRelease → zipalign → apksigner，debug keystore 原地升级，
  SHA-256 72d31678fa90c1b4…与 debug 同证书）
- 华为 TAS-AN00 16:02:23 装机：Tab 导航回归（含 40 连击）ALIVE、
  扫描管线正常（360 行 adv 日志）、四 Tab 齐。
- 证据：`evidence/r1-release-tabnav.png`（扫描页健康）、
  `evidence/r2-release-advpopup.png`（广播弹窗模态完整）。

## 二、Hub pairing token 生命周期矩阵（端口勘误：sessions=17890，device=17892）

| # | 场景 | 期望 | 实测 | 判定 |
|---|------|------|------|------|
| T-A | 消费从未创建的随机 32hex | 404 | 404 `pairing_token_invalid` | PASS |
| T-C1 | 首次消费合法 token | 200+MQTT 凭据 | 200，凭据齐全（mqtt_host 按 G3 由请求路径解析） | PASS |
| T-C2 | 同 token 二次消费 | 409 | 409 `pairing_token_used` | PASS |
| T-C3 | 消费后 session 状态 | consumed/success | `status:"success"` + used_at | PASS |
| T-D | 取消会话后消费 | 文档未定义 | **400 `pairing_failed` "state conflict (status=cancelled)"** | OBS（见下） |
| T-B | TTL 过期后消费 | 410 | 410 `pairing_token_expired`；TTL 精确 300s；status=expired | PASS |
| T-B2 | 过期后 session 查询 | expired | `status:"expired"` | PASS |

### OBS-HT-001（契约缺口，smart-hid 侧）

固件 `provisioning.c:151-153` 只映射 -404/-410/-409，default 一律
`PROV_ERR_HUB_UNREACHABLE` → 真机上「取消后消费」（hub 返回 400）会被
App 显示为 `controlhub_unreachable`（提示"检查 hub 地址"，方向全错）。
建议：hub 对 cancelled 态消费返回 409/410 语义，或固件为 400 增加
映射；PROVISIONING_V1.md 错误表同步补 cancelled 行。

## 三、MQTT READY / 命令下行模拟（hub+broker 半场，设备侧由脚本扮演）

脚本 `mqtt_ready_sim.py` / `mqtt_cmd_roundtrip.py`（paho 1.x API），
凭据来自 T-C1 签发的一次性凭据（只存本地 `evidence/consume1.json`，不提交）：

1. **T-E READY**：broker 连接 rc=0；command 主题订阅 granted qos=1
   （ACL 只放行本设备）；retained `online:true` → hub
   `GET /devices/{id}` 立即 `online:true, usb_hid_ready:true`；
   `online:false` → 视图即时翻转。PASS
2. **T-F 命令闭环**：hub `POST /devices/{id}/commands`（keyboard tap
   ENTER）→ 设备主题收到 1 次 → 回 executed ACK → POST **200 终态
   executed**。PASS
3. **T-F2 幂等重放**：同 request_id 重放 → 返回既有终态，设备 rx
   计数保持 1（M1-G2 幂等在 hub 级实证）。PASS
4. 清理：offline retained + `DELETE /devices/HID-TESTA1B2` 200，hub
   设备列表恢复原状（仅剩历史 HID-00000001 记录）。

### 覆盖边界（诚实声明）

以上证明 hub+broker 控制面全链路健康。仍未证明（需真 ESP32）：
BLE 表单写入（手机→设备）、真固件 WiFi 关联后执行上述 HTTP/MQQT、
STATUS BLE 通知回传 App 显示 pairing_success/ready。

## 四、release 包 × G-WIN 三窗空口回归

`winbridge_air_test.go` env 门控（AIR_TAG=GWIN AIR_HOLD=14），手机侧
`logcat -s BleManager` 三窗法：

| 窗 | ff0100 命中 | 判定 |
|----|------------|------|
| A 基线（未播） | 0 | PASS |
| B 广播中 | **43 包** `07ff01004757494e`（GWIN 字节保真，RSSI -37~-42） | PASS |
| C 停播后 | 0 | PASS |

广播弹窗（AAND-ADVPOPUP-R2 正典形态）：模态遮罩 + kv 五行 + AD 逐段
解析（07 ff / 0100 / 47474f→GWIN）+ 复制/连接双按钮，release 包完整
复现（`evidence/r2-release-advpopup.png`）。发射地址每轮随机轮换
（03:FA:E1…→0A:32:B8…），与 20260924-AIR-GQT 平台事实一致。

## 五、第二台手机参与方案（nRF Connect 模拟 SHID 外设，待用户配合）

BLE 客户端半场（App 表单→写→STATUS 通知）可用第二台手机扮演设备：
nRF Connect → Server → Add Service `9f1d1001-e73b-4c8f-9d2a-6f0b5e8a1c04`
→ 三个特征：1002 READ|NOTIFY / 1003 WRITE / 1004 READ|NOTIFY →
Advertising 里广播该 service UUID（App 首页扫描按 Profile 注册表识别）。
华为侧走真实配网表单提交，第二台手机上可实时看到分帧写入的 JSON 并
手动/自动回 STATUS 通知。该方案可测：连接、订阅、表单写入、分帧拼装、
状态机渲染（pairing/wifi_failed/ready 等错误路径逐个模拟）。

## 证据索引

- `evidence/r1-release-tabnav.png` — release 包 Tab 回归后扫描页
- `evidence/r2-release-advpopup.png` — release 包广播弹窗
- `evidence/air-events.jsonl` / `air-events2.jsonl` — G 壳发射事件（started/stopped）
- `evidence/session-*.json` / `consume*.json` / `expired-consume.json` —
  **含 token/凭据，仅本地留存不提交**（token 已全部 dead：used/expired/cancelled）
- `hub-token-matrix.scrubbed.txt` — 脱敏后的完整 curl 会话记录（提交用）
- `mqtt_ready_sim.py` / `mqtt_cmd_roundtrip.py` — 模拟脚本（无内嵌密钥，可提交）

## 设备/环境归还态

- 华为 TAS-AN00：装 SmartBLE-v1.0.0-fix6-release.apk（升级，签名同 debug keystore）
- ControlHub：继续运行（17890/17891/17892），测试设备已删除，设备列表原状
- Windows 热点保持关闭（未启用）

## 六、K80 热点拓扑预检（用户提供热点：SSID K80；板子仍在并行会话手中）

用户提出用小米手机热点（K80）绕开 HJWY 23 段隔离。执行时 K80 尚未广播
（PC 扫描 120s 仅见 HJWY/HJWY-GUEST/chejian），COM12 仍被并行会话占用
（PermissionError 拒绝访问）。已完成可预铺的全部前置验证：

1. **域网 TCP 直连**（HJWY 24 段手机 → 192.168.21.77:17892）：
   浏览器实达 `404 page not found`（evidence/tcp17892-from-phone.png）——
   同时反证 20260927-ANDROID-E2E 层 3 归因成立（24 段 TCP 通而 23 段
   设备超时=子路由隔离，非防火墙）。
2. **热点段入站防火墙风险排除**（等价测试）：Windows 热点 LYS 6679 起，
   手机 cmd wifi 入网（192.168.137.25，2.4G 信道 11）→ 浏览器访问
   http://192.168.137.1:17892 → 实达 `404 page not found`
   （evidence/tcp17892-hotspot-from-phone.png）。hub 入站在热点（公用
   profile）段不拦——K80 段同理可达。
3. 还原：手机 WiFi 回办公网（EMUI 自动选主 HJWY）、Windows 热点 Off。

### K80 就绪后的 E2E runbook（板子回归我方固件后）

PC `netsh wlan connect K80`（IP 应为 192.168.43.x）→ hub 三端口照常
（0.0.0.0 监听）→ 17890 建 token（host=PC 的 43.x IP）→ 华为 App 表单：
SSID=K80 密码=用户热点密码 hub=<PC 43.x IP>:17892 + token → 下发 →
串口（COM12 空闲时）+hub 日志看 POST→MQTT→READY→App 终态。
