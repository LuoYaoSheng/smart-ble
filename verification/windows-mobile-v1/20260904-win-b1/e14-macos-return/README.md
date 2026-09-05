# E14：macOS → Windows 续做交接

> 2026-09-05。目标是把已经在 macOS 合并、对齐并验证过的代码快进回 Windows，
> 由 Windows 上可现场操作的 Android 手机和 ESP32-S3 完成剩余真机闭环。
> 未真实运行的项目继续标 `NOT_RUN`，不得由编译通过推断真机通过。

## 0. Windows 执行结果（2026-09-05 15:20–15:40，本节为当日续做实录）

快进基线：smart-ble `cda1931 → 3638f66`（ff-only），smart-hid-workspace
`80a5e58 → 0f8548d`（ff-only）；用户脏文件按约定留置未动。

### W1 固件编译与烧录 —— PASS

- ESP-IDF **v5.4.0**（`D:\Espressif\frameworks\esp-idf-v5.4`，`IDF_TOOLS_PATH=D:\Espressif`）
  `fullclean + build`：PASS，`smart-hid-firmware.bin` **0x10acd0**（与 V1 交接记录一致），app 分区余 31%。
  build 后 `dependencies.lock` 的 idf 版本被改写 → **已还原未提交**。
- **无需 BOOT+RST**：DevKit 另一侧 CH343 UART 口（本轮枚举 `COM12`，USB `1A86:55D3`）
  的自动下载电路直接生效；执行 `erase-flash`（清除 E13 遗留状态）+ `flash` 全部成功
  （`evidence/w1-firmware-flash.log`）。COM4 为三星 modem 串口，未触碰。
- 首启串口核验（`evidence/w1-firstboot-serial.log`）：bootloader → app v1.1.0
  （compile Sep 5 2026 15:21:41）→ `[prov] state=unprovisioned`（全擦后无脏状态）→
  `provisioning advertising as SHID-00000001`；空口复核 `BleAdvDump`：
  `10B41DCD238E name=[SHID-00000001] conn=1 uuids=9f1d1001 rssi=-38`。

### W2 连接即配网、零系统配对弹窗 —— PASS（硬断言全绿）

以 U-01 leave 场景为载体（Samsung SM-G9910 `R5CR1284Y7H`，全程真实链路）：

| 硬断言 | 结果 | 证据 |
|---|---|---|
| 无系统配对/PIN 弹窗、无配对流程 | ✓ | `evidence/w2-pairing-watch.log`（时窗 15:27:31–15:28:15 全量 logcat 过滤）：Samsung 安全栈全程 `pairing_state:IDLE`、断链时 `state:IDLE sec_req:0`；无任何 BluetoothPairingDialog/配对启动事件。SMP 固定通道在 ACL 建立时被栈打开（`smp_connect_callback connected:true`）但**从未交换配对协议**，属链路层通道事件，非用户可感知配对 |
| App 不调 `createBond` | ✓ | logcat 全时窗 0 条 createBond；代码侧 `prepareInputWrite()` 已删除（3638f66） |
| bond 前后零变化 | ✓ | `w2-bond-state-before/after.txt` diff 为空（始终仅 DESKTOP 音频一条，无 SHID）；栈内两次 `IsDeviceBonded ... 23:8e is_bonded:false` |
| INPUT 首次写不等 2s 重试 | ✓ | App 日志 `submit frames=2 bytes=149` 一次写入即被设备消化（无 encrypt 错误、无重试分支）；设备串口 `candidate: ssid=e13-leave ...` → `step=received`（`w2-u01-device-serial.log`） |
| 发现→配置→填写页 | ✓ | 一次连接 4s 到达（`configure 阶段已到达（第 1 次连接）`） |

附带结论：E13 T2 的“候选被 ACK 但设备不消化”黑盒已定案——旧固件/旧状态问题；
本轮全擦+V1 固件后候选即时消化（`received → connecting_wifi → wifi_failed(假SSID)`），
且 15:27:53 的断链为测试收尾 App 退出后的正常拆除，非 E13 的 3s 中途掉链病
（`l2c_link_timeout is_bonding:false` 发生在 `tearDownAll` 之后）。

### E13 场景矩阵（V1 固件复验，本轮已完成部分）

| 序 | 场景 | 判定 | 证据 |
|---|---|---|---|
| U-01 | leave 两态（填写/等待） | **PASS**（V1 复验，零配对守护） | `../e13-provision/evidence/u01-leave-v1-app.log`：两态弹窗 ✓ + 全部断言通过 |
| T5a | cancel_wait → timeout | **PASS** | `t5a-cancel-v1-app.log`：`outcome=timeout` + 重新下发 ✓；设备侧 `w3-t5a-device-serial.log` 确认候选消化→wifi_failed→恢复广播 |
| T5b | lost_configure 断连横幅 | **PASS**（手机侧 `svc bluetooth disable` 注入） | `t5b-lost-v1-app.log`：LOST_ARMED 15:35:37 → 注入 15:35:39 → **2.5s** 呈现断开横幅+重新连接 ✓。设备侧串口本轮缺失（COM12 被上一场景捕获占用，起捕获失败——时序失误，非设备问题；空口已确认设备恢复广播） |
| T2/T3/T4 | wifi_fail / pairing_invalid / mqtt_invalid | **BLOCKED（待用户）** | T2 需真实 SSID+错误密码；T3 需真实凭据；T4 另需管理员权限防火墙拦 17891 入站 |
| T1/T6/T7/小米 | 成功链路及后续 | **BLOCKED（待用户）** | 需 HJWY Wi-Fi 真实凭据（只进命令环境变量与 App 内存，不入库不入证据） |

### W4 回归

- `flutter analyze` **0 issues**；`flutter test` **59/59 PASS**（与 Mac 端一致）。
- `./scripts/verify-uniapp.sh`：功能门全过（unit、release metadata、version consistency）；
  唯一失败门为 **[Git whitespace]**，踩的是用户脏文件 diff
  （`e5-realdevice/def006/diag1-full-session.txt` 与 `tests/target/**` CRLF 幻影，
  即交接文档明示留置项），非分支回归，按约定不修不改。

### 本轮环境事实增量

- `IDF_TOOLS_PATH` 实际为 `D:\Espressif`（`C:\Espressif` 是残缺目录，会报
  “Python virtual environment not found”）。
- CH343（COM12）DTR/RTS 可直接硬复位芯片（pyserial setRTS 脉冲）抓首启日志，
  运行态串口日志同样走 COM12（console=UART0）。
- 串口捕获与场景必须严格串行：COM12 单进程独占，并发起捕获会
  `PermissionError(13)`（T5b 教训）。
- T5b 注入后蓝牙非必然自动恢复（本轮 `svc bluetooth enable` 报 -1 但 ~12s 后
  `bluetooth_on=1`）；收尾必须核验并复原。


## 1. 唯一续做分支与远端基线

| 仓库 | Windows 应使用的分支 | 最新功能基线 | 远端状态 |
|---|---|---|---|
| `smart-ble` | `refactor/uniapp-v1` | `332d69d`（另含本交接提交，直接拉远端 tip） | Gitee `origin` 与 GitHub `github` 均已同步 |
| `Smart-HID-Workspace` | `main` | `0f8548d` | Gitee `origin` 已同步；GitHub 因当前 Mac OAuth 缺 `workflow` scope 停在旧基线，Windows 本轮从 Gitee 拉取 |

`spike/macos-extension-v1` 已通过合并提交 `55ec20f` 完整进入
`refactor/uniapp-v1`。Windows **不要再次合并 spike 分支**；后续 App、Mac、Android、
iPhone 和规范修改全部继续落在 `refactor/uniapp-v1`。

### Windows 快进命令

先确认工作树；本地用户文件/CRLF 幻影仍按上一份交接保留，不要为了 pull 全树覆盖：

```bash
cd E:/project/xf/smart-ble
git status --short --branch
git fetch origin
git switch refactor/uniapp-v1
git pull --ff-only origin refactor/uniapp-v1
git log --oneline -6
```

预期首条为本 E14 交接提交，其后依次看到 `332d69d`、`6665fc5`、`55ec20f`、
`cda1931`、`3ed02ab`。

```bash
cd E:/project/xf/Smart-HID-Workspace
git status --short --branch
git fetch origin
git switch main
git pull --ff-only origin main
git log --oneline -3
```

预期看到 `0f8548d`、`80a5e58`、`cb44128`。

若 `--ff-only` 因 Windows 用户本地修改失败，只处理 Git 明确列出的冲突文件；不要提交
`firmware_build_info.h`、`.hbuilderx/launch.json`、Electron lock、`tests/target/**`
CRLF 幻影、ControlHub `config.yaml`/日志等本地件。

## 2. Mac 已完成的实质工作

### `smart-ble`

- `55ec20f`：把 14 个 macOS 原生扩展提交合入 Windows 主开发线。
- `6665fc5`：把 V1 “连接即配网、零系统配对”从 Flutter 扩展到所有活动面：
  - uni-app orchestrator 删除 encrypt 2 秒重试，旧加密固件只写一次并立即失败；
  - Flutter/Dart、macOS/Swift 注释与运行日志改为 INPUT 明文 write；
  - ESP32 Smart HID 模拟夹具删除 SMP 配置与 `WRITE_ENC`；
  - Android high-fi 原型删除 PIN 系统配对覆写；
  - 正典、页面、流程、架构、错误码、安全风险和平台差异文档同步。
- `332d69d`：补录 macOS、iOS、Kotlin Android 的执行证据和跨语言页面覆盖差距。

### `Smart-HID-Workspace`

- `80a5e58`：固件真实行为取消 SMP，INPUT 改普通 write。
- `0f8548d`：修正 CURRENT_STATE、HARDENING_BACKLOG、固件头注释与 sdkconfig 注释，
  清除“代码已明文、活动文档仍写 Just Works 加密”的漂移。

## 3. Mac 已验证结果

| 检查 | 结果 |
|---|---|
| Flutter `analyze` / unit | PASS，0 issue，59/59 |
| uni-app | PASS，28 unit 文件 + 11 静态门；新增 legacy encrypt 单次写 fail-fast |
| 原生 macOS | PASS，CoreUnit 62/62，页面冒烟 17/17；真实 BLE 扫描与连接/服务发现成功 |
| Flutter macOS release build | PASS，47.8 MB |
| 原生 iOS | 真机 arm64 签名构建与安装 PASS；模拟器 build/install/launch PASS；物理真机启动被锁屏拦截 |
| Kotlin Android | `assembleDebug + testDebugUnitTest` PASS（须 Android Studio JBR 21；系统 Java 25 与 Gradle 8.2 不兼容） |
| Smart HID 固件 | ESP-IDF v5.4.4 build PASS；host 36/36；bin `0x10b4d0`，app 分区余 30% |
| `fixture_shid_sim_s3` | PlatformIO build PASS；普通 WRITE、无 SMP |
| Android high-fi P002 | 真实浏览器 PASS；连接→填写→下发状态，全程无 PIN/系统配对层 |

完整 Mac 证据摘要：`verification/macos-mobile-v1/20260905-mac-a1/README.md`。

## 4. Windows 现在应按此顺序继续

### W1：重编并烧录真实 Smart HID 固件

1. 在 `Smart-HID-Workspace/smart-hid-firmware` 用 ESP-IDF v5.4.x 执行 `idf.py fullclean && idf.py build`。
2. 运行态 TinyUSB HID 不暴露串口；按住 BOOT 点 RST，确认新出现的 `303A:1001` 下载串口，
   或改接 CH343 UART 口。不要把三星 modem COM 口当 ESP32。
3. 对实际枚举端口执行 `idf.py -p COMx flash`；保留串口日志完成首次启动核验。

### W2：先证明“连接即配网、零弹窗”

1. 手机蓝牙设置里可删除旧 SHID bond，避免旧状态干扰（不是功能前置）。
2. 安装统一分支构建的 Flutter Android 包。
3. 扫描并连接 `SHID-*`，记录：发现 → 点击“配置 Smart HID” → 到达填写页。
4. 硬断言：过程中没有系统配对/PIN 弹窗；App 不调用 `createBond`；INPUT 首次写不等待 2 秒重试。
5. 若出现 encrypt/auth/bond 类错误，按产品定义判为烧入了旧固件，不能恢复配对逻辑绕过。

### W3：跑 E13 场景矩阵（失败类在成功前）

推荐顺序：`U-01 leave → T2 wifi_fail → T3 pairing_invalid → T4 mqtt_invalid →
T5a cancel_wait → T5b lost_configure → T1 success → T6/T7`。

- READY 会停广播，所以成功场景必须靠后。
- T4 仍需管理员权限临时拦截 MQTT 17891；结束后删除防火墙规则。
- Wi-Fi 密码只通过本机环境/App 内存传入，不写入命令日志、仓库或证据。
- V1 简化后不再启动 `e13-pairing-daemon.py`；只有 LOST 注入所需的复位/断链步骤保留。
- 每个场景按 runbook 记录 App 终态、固件 state/step、是否零系统弹窗和恢复按钮。

### W4：回归与收尾

```bash
cd E:/project/xf/smart-ble/apps/flutter
flutter analyze
flutter test
```

```bash
cd E:/project/xf/smart-ble
./scripts/verify-uniapp.sh
```

Windows Git Bash 若无法直接执行 ESP-IDF，沿用 E13 已验证的 `cmd //c` 临时 bat 方式，
不要把 Smart HID 正式固件误当 PlatformIO 工程。

真机完成后：更新 E13/E14 证据，提交到 `refactor/uniapp-v1`，推 Gitee/GitHub；
固件事实或文档有变化则提交 `Smart-HID-Workspace/main` 并至少推 Gitee。

## 5. 仍需诚实保留的平台差距

原生 SwiftUI iOS 与 Kotlin Compose Android 当前缺 P002/P003/P005/P010；Flutter 对 P003/P005/P010
为合并页/部分覆盖。跨语言页面矩阵在
`docs/specs/09_test/CROSS_IMPLEMENTATION_PARITY_MATRIX.md`。Windows 本轮先完成 Flutter Android +
真实 ESP32 配网闭环，不得把原生 Android 能编译写成 Smart HID 配网已对齐；之后再按同一协议与页面
基准补原生实现。
