# Codex 提示词：TP-G4——Android、微信、ESP32 与 Smart HID E5 验证

> 前置：对应 Target 自动化已在 TP-G3 达到 `AUTOMATED_PASS / HARDWARE_PENDING`。
> 本轮只做固定 Commit、固定固件 SHA、指定设备的硬件验证；失败后不在同一轮顺手修代码。

---

## 可直接复制给 Codex

```text
你现在执行 Smart BLE 的 TP-G4：真实设备 E5 验证。

工作区：

/Users/luoyaosheng/Desktop/project/Open/smart-ble

输入：

RUN_SCOPE=<COMMON_BLE | OTA | SMART_HID | FULL>
EXPECTED_APP_COMMIT=<完整 commit>
EXPECTED_PERIPHERAL_SHA256=<sha>
EXPECTED_OBSERVER_SHA256=<sha>
ANDROID_DEVICES=<型号/系统列表>
WECHAT_DEVICE=<型号/系统/微信版本>
PERIPHERAL_PORT=<明确串口>
OBSERVER_PORT=<明确串口 | SECOND_PHONE>
SMART_HID_COMMIT=<需要时>
SMART_HID_FIRMWARE_SHA=<需要时>
CONTROLHUB_VERSION=<需要时>

没有明确输入、专用测试板或用户烧写授权时，输出 `HARDWARE_INPUT_INCOMPLETE` 并停止。

必须读取 APPROVED target-product、target-tests、gap/remediation 和对应 Test ID。

==================================================
一、安全纪律
==================================================

- 只使用指定端口，不自动选择其他串口；
- 烧写前显示板型、端口、环境、firmware SHA；
- Peripheral 与 Observer 端口必须不同；
- 不执行 erase-all，除非测试规范和用户另有明确授权；
- 不执行 Smart HID efuse、Secure Boot、Flash Encryption；
- 不记录密码、token、私钥、个人设备 ID；
- 固件/App commit 或 SHA 不匹配立即停止；
- 测试失败只记录第一断点，不在验证中修业务代码；
- 开发者工具结果不能替代微信真机；
- 结束时 tracked worktree clean。

==================================================
二、证据包
==================================================

创建 ignored 或仓库外目录：

```text
verification/smart-ble-e5/<RUN_ID>/
├── environment.md
├── baseline.md
├── build-and-artifacts.md
├── operation-results.md
├── page-results.md
├── android/
├── wechat/
├── esp32-peripheral/
├── esp32-observer/
├── smart-hid/
├── screenshots/
├── videos/
├── logs/
├── checksums.txt
└── summary.md
```

RUN_ID：

`YYYYMMDD-HHMM-<app-sha>-<firmware-sha>-<scope>`

每条 Test 记录：

- Test/Target/Page/OP ID；
- 前置；
- 步骤；
- 预期 UI；
- 预期 Runtime；
- 预期设备/Observer；
- 实际；
- 第一断点；
- 截图/视频/日志；
- 清理结果；
- PASS/FAIL/BLOCKED。

==================================================
三、基线和构建
==================================================

确认：

- HEAD == EXPECTED_APP_COMMIT；
- target docs/tests APPROVED；
- 统一自动化 PASS；
- App 构建环境；
- Peripheral/Observer 干净 build；
- 产物 SHA 与 expected 一致；
- 测试手机、微信、基础库、权限初始状态；
- 工作区 clean。

不允许使用旧 build 或不明来源 bin。

==================================================
四、Peripheral 与 Observer
==================================================

Peripheral：

- 烧写 fixture_peripheral；
- 记录 boot/version/mode/name/UUID；
- 串口 JSON 保存 advertising/connect/read/write/notify/ota/disconnect/fault。

Observer：

- ESP32：烧写 fixture_observer，记录扫描解析；
- SECOND_PHONE：记录观察 App、版本和导出数据；
- 正式广播 E5 优先使用 ESP32 Observer，第二手机只补充。

==================================================
五、COMMON_BLE Android
==================================================

按 APPROVED `08_ANDROID_HARDWARE_TEST_MATRIX.md` 全部执行，至少覆盖：

PAGE-001：
- 蓝牙关闭；
- 权限拒绝/允许/设置恢复；
- start/stop/timeout/hide；
- 第二轮；
- 名称、RSSI、去重、数量、筛选；
- 广播详情和复制；
- 卡片与连接/Profile 动作。

PAGE-006：
- 连接、服务、空/错误/重试；
- Read；
- TEXT/HEX Write 和 LED；
- 非法写；
- Notify 开/值/关和跨页语义；
- 日志；
- 主动断开、断电、重连、耗尽；
- Fault Injection。

PAGE-007：
- 两设备；
- Session 复用；
- 同 UUID Notify 不串；
- 单断/全断/部分失败；
- 重连状态和清理。

PAGE-008：
- 平台能力；
- 系统接管字段；
- 默认 Payload；
- 31 成功、32 阻止；
- Observer 对比；
- start/stop/hide/unload；
- 活动 Central 保护；
- 模式恢复。

PAGE-009/010：
- 版本、状态、链接、反馈、分享、Privacy/Security/License；
- VERSION/Metadata 一致。

至少 Android 12+ 和另一不同厂商/系统设备完成核心 Must。

==================================================
六、COMMON_BLE 微信
==================================================

使用正式 AppID、稳定基础库和真实微信，独立执行：

- 权限与定位真实行为；
- 两轮扫描、名称、广播详情；
- GATT Read/Write/Notify；
- 跨 Tab 和多设备；
- 微信 Peripheral 与 Observer；
- Central/Peripheral owner；
- 外链复制；
- 小程序跳转；
- 好友/朋友圈分享；
- 页面和版本。

不能复制 Android 结果。

==================================================
七、OTA
==================================================

仅 RUN_SCOPE 含 OTA 且具备批准的可恢复固件与恢复方案时执行。

顺序必须客观证明：

```text
STATUS subscribe
→ CTRL start
→ ready
→ DATA chunks
→ CTRL commit
→ success
→ reboot
→ re-scan/reconnect
→ firmware_version match
```

失败：

- invalid file；
- ready timeout；
- chunk fail/断线；
- abort；
- size mismatch；
- commit fail；
- no success；
- version mismatch；
- 中断后可恢复。

无恢复方案则 `BLOCKED_BY_SAFETY`，不冒险执行，不标 PASS。

==================================================
八、Smart HID
==================================================

仅 RUN_SCOPE 含 SMART_HID/FULL 且输入完整时执行：

- 强/弱匹配；
- Device Info；
- 错设备断开；
- QR、Wi-Fi、Hub；
- candidate framing；
- waiter；
- 正常 READY；
- 八类错误；
- token/password 不泄露；
- 历史快照；
- 自动诊断；
- owned/borrowed Session；
- 重配移交；
- READY 后 ControlHub→MQTT→ESP32→USB HID。

固定记录 Smart HID commit、firmware SHA、ControlHub version。

==================================================
九、结果与状态更新
==================================================

每个 Test 只有同时满足以下才 PASS：

- UI 正确；
- Runtime 行为正确；
- ESP32/Observer/Smart HID 结果正确；
- 后续状态正确；
- 清理正确；
- 证据完整。

失败后：

- 不修代码；
- 生成新的 FIX ID 或重新打开原 FIX；
- 状态改 HARDWARE_FAIL；
- 记录第一断点。

通过后：

- 更新 report/gap/remediation；
- 关联 EVID ID；
- 仍不自动更新公开页面为 VERIFIED，留给 TP-G5。

==================================================
十、结束检查与报告
==================================================

- 停止广播；
- 断开设备；
- 关闭串口；
- 释放测试资源；
- 计算 Evidence SHA；
- 工作区 clean。

最终报告：

RUN_SCOPE / RUN_ID
BASELINE / ARTIFACT SHA
ENVIRONMENT
TEST COUNTS PASS/FAIL/BLOCKED
PAGE RESULTS
ANDROID / WECHAT
PERIPHERAL / OBSERVER
OTA
SMART HID
FIRST FAILURE
EVIDENCE ROOT / CHECKSUMS
SOURCE CHANGES: NONE
NEXT: 返回 TP-G3 修失败，或全部通过后进入 TP-G5

没有执行的 Test 不得写 PASS。
```
