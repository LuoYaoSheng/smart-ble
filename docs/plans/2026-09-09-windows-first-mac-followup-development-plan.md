# 2026-09-09 Windows 先行、Mac 收尾开发计划

> 主线澄清：**"Windows / Mac" 是开发主机分工，不是目标平台分工。**
> 正确主线是：
>
> Windows 主机完成所有可开发、可验证平台的核心功能 → Windows 端 UI 对齐 → 提交完整交接点 → Mac 主机完成 Apple 专属功能和剩余验证 → Mac 端 UI → 全平台发布。
>
> 当前不应继续做 P006 等页面视觉对齐；下一个开发任务应回到功能层。

基线：远端 `refactor/uniapp-v1@5cb449c`（gitee 与 github 双远端一致，Windows 工作区精确快进，禁止 merge commit）。

---

## 第一阶段：Windows 主机——功能开发主战场

Windows 阶段覆盖：

- Flutter Android（F-AND）
- uni-app Android（U-AND）
- 微信小程序（U-WX）
- Kotlin Android（K-AND）
- Electron Windows（E-WIN）
- Tauri Windows（T-WIN）
- ESP32 Peripheral / Observer
- 跨语言协议、测试与公共脚本

### W0：同步和冻结基线

1. Windows 工作区精确快进到 `5cb449c`，禁止 merge commit。
2. 检查 Android/JBR 21、Flutter、Node、HBuilderX、微信开发者工具、Rust、PlatformIO、ADB、ESP32 串口。
3. 跑修改前基线：
   - `node scripts/verify-target.mjs --mode=all`
   - `./scripts/verify-uniapp.sh`
   - `cd apps/flutter && flutter analyze && flutter test`
   - `cd apps/android && ./gradlew assembleDebug testDebugUnitTest`
   - `cd hardware/esp32/LightBLE && pio run`
4. 新建本轮 verification 目录，保存原始结果。

退出条件：工作区干净、基线问题已分类，不能把环境错误当产品缺陷。

### W1：先修测试可信度和协议基座

这是功能开发的前置，不涉及 UI。

1. 完成 `TEST-BRIDGE-TS-001`：
   - 解决 Node 执行 TypeScript 协议时的 `Unexpected identifier 'as'`。
   - 让 Smart HID Target tests 真正执行，而不是被测试桥阻断。
2. 建立跨语言 Smart HID V1 测试向量：
   - 新增 `core/protocols/smart-hid-v1-vectors.json`
   - 新增 `scripts/check-platform-parity.mjs`
   - 扩展 `scripts/check-smart-hid-contract.mjs`
   - 覆盖 UUID、QR、分帧、MTU、INFO 校验、8 个错误码和恢复动作。
3. 先接入 JavaScript、Dart、Kotlin；Swift 留到 Mac 阶段接入。

退出条件：

- Target System/Harness 零失败。
- Smart HID 测试不再因 TS 导入失败而假失败。
- JS、Dart、Kotlin 使用同一组协议向量。

建议提交：`test(contract): establish executable Smart HID parity vectors`

### W2：BLE 基础功能闭环 F001–F013

先处理会影响后续 Smart HID 的底层功能，不做页面美化。

#### Flutter Android

主要文件：

- `apps/flutter/lib/core/ble/command_queue.dart`
- `apps/flutter/lib/core/ble/ble_manager.dart`
- `apps/flutter/lib/ui/pages/device_detail_page.dart`
- `apps/flutter/lib/ui/pages/connected_devices_page.dart`

必须完成：

- F005 显示名完整 fallback。
- F006 连接超时从 30 秒统一为 10 秒。
- F009 写队列：同设备串行、跨设备并行、深度 16、单写 5 秒。
- F012 重连改为 1/3/5 秒、最多三次。
- F013 双设备管理补齐 F-AND 真机证据。

#### Kotlin Android

主要文件：

- `apps/android/app/src/main/java/com/smartble/core/ble/BleManager.kt`
- `apps/android/app/src/main/java/com/smartble/core/ble/CommandQueue.kt`
- `apps/android/app/src/main/java/com/smartble/ui/viewmodel/DeviceDetailViewModel.kt`

优先修功能缺陷：

- `WIN-AAND-008`：Notify 事件因无缓冲 `SharedFlow.tryEmit` 丢失。
- `WIN-AAND-007`：读写通知后服务列表重复、展开态被重置。
- `WIN-AAND-006`：普通连接未请求 MTU，JSON 通知被截成 20 字节。
- `WIN-AAND-004`：读取结果没有进入可观察状态。
- F013 双设备连接、单断、重连、全部断开。

`WIN-AAND-002/003/005` 中纯命名、布局、日志外观部分留到 Windows UI 阶段。

#### uni-app / 微信

- 回归扫描、连接、读写、Notify、重连和多设备。
- 只修真实行为问题，不进行页面重排或样式统一。

退出条件：

- Windows 可运行实现的 F001–F013 无 `NOT_RUN`。
- 不剩 P0/P1 功能缺陷。
- 真机证据包含 App 日志与 ESP32 串口交叉证明。

### W3：Smart HID 核心闭环 F018–F024

这是 Windows 阶段的核心任务。

#### 先关闭 `WIN-UAND-003b`

顺序必须是：

1. 用 `5cb449c` 重新生成 uni-app App 资源。
2. 用 HBuilderX 重打自定义基座。
3. 在新基座复现 10007。
4. 如果新基座不复现，关闭为旧基座问题。
5. 如果仍复现，再检查：
   - `apps/uniapp/services/provisioning/transport.js`
   - `apps/uniapp/services/provisioning/orchestrator.js`
   - `apps/uniapp/services/smart-hid/provisioning.js`
   - 服务发现完成时机、characteristic UUID、连接 generation 和读操作顺序。

不能在旧基座上盲改业务代码。

#### Kotlin Android 补齐 Smart HID

当前 K-AND 缺 P002/P003/P005 对应的真实功能，Windows 阶段完成：

- Profile STRONG/WEAK 识别和双入口。
- V1 无 SMP、无系统配对弹窗。
- INFO `1002` 身份校验。
- INPUT `1003` 明文分帧写入。
- STATUS `1004` 跟踪。
- 60 秒状态机。
- 8 个错误码到唯一恢复动作。
- P003 会话详情和 P005 五项诊断。
- F023 删除红线与零持久化。

核心文件：

- 新建 `core/profile/SmartHidProtocol.kt`
- 新建 `core/profile/HidProvisionManager.kt`
- 修改 `BleManager.kt`、`MainActivity.kt`、`DeviceCard.kt`
- 新增相应 JUnit 测试

Flutter、U-AND、U-WX 同时按相同向量回归 F018–F024。

退出条件：

- F-AND、U-AND、K-AND 完成真实 Smart HID 验证。
- U-WX 在登录环境可用时执行；否则只允许登记明确的外部工具链阻塞。
- `WIN-UAND-003b` 必须有明确根因，不能保持"未知 10007"。
- F023 全仓无页面、路由和持久化残留。

### W4：广播功能 F014–F017

1. U-WX 验证微信 Peripheral API。
2. U-AND 验证自定义基座原生广播正路径，不能只保留降级路径。
3. F-AND、K-AND 跑启停和非法输入。
4. ESP32 Observer 验证：
   - 服务 UUID
   - 名称
   - 厂商数据
   - 停止后净停
5. 验证 31 字节预算和超限拦截。

退出条件：所有适用实现均有发送侧和观察侧双证据。

### W5：剩余功能 F025–F030

- F025：维持 P-03 BLOCKED，不做虚假的 OTA 成功；只验证选包、校验、取消、受限状态和错误路径。
- F026：统一日志脱敏，锁定 SSID、密码、Token、配对码等敏感字段。
- F027：版本元数据必须来自 Release Metadata。
- F028：微信直跳与非微信落地页分支。
- F029：微信分享、Android 系统分享、桌面分享分支。
- F030：明确不做国际化，增加静态守卫，禁止重新出现产品级语言切换。

退出条件：F026–F029 在适用实现中完成；F025 保持诚实 BLOCKED；F030 不被误实现。

### W6：Windows 可运行桌面实现

功能完成后验证：

- E-WIN：Electron 全页面与 BLE 功能。
- T-WIN：安装/恢复 Rust 工具链，构建并运行 Tauri。
- 桌面端扫描、GATT、日志、版本、分享及不支持能力必须如实显示。
- 不把浏览器 mock 当成真实 BLE PASS。

### Windows 功能总 Gate

在通过这个 Gate 前，禁止启动新的 UI 对齐工作。

必须满足：

- Windows 主机可执行的 F001–F030 全部为 `PASS / PASS_WITH_LIMITATION / 明确 BLOCKED / NOT_APPLICABLE`。
- 除 Mac/Apple 专属项外，不允许留下无解释的 `NOT_RUN`。
- 不剩 P0/P1 功能缺陷。
- F025 是唯一允许按产品决议保留的能力级 BLOCKED。
- 自动测试、Android 构建、uni-app 构建和 ESP32 构建全绿。
- 每个真机 PASS 都有日志、截图或串口证据。

## 第二阶段：Windows 主机——UI 对齐

功能 Gate 通过后再处理 UI。

顺序：

1. P001：只补运行截图和剩余视觉验收，现有结构改动不返工。
2. P006：GATT 工作台。
3. P007：已连接与多设备。
4. P008：广播。
5. P002：Smart HID 配网。
6. P003：HID 详情。
7. P005：诊断。
8. P009：关于。
9. P010：版本。

覆盖 U-WX、U-AND、F-AND、K-AND、E-WIN、T-WIN 中适用的实现。

每页采用固定流程：

1. 对照正典列差异。
2. 写失败测试或截图基线。
3. 只改结构、文案、Token、组件和可访问性。
4. 行为变化必须退回功能缺陷流程处理。
5. 更新四张 parity 矩阵和证据目录。
6. 每页一个独立提交。

## 第三阶段：Windows → Mac 交接

Windows 阶段完成后提交一个明确交接点：

- 两个远端指向同一 commit。
- 工作区干净。
- 提交 Windows 功能矩阵、UI 矩阵和 verification 索引。
- 列出仅能在 Mac 完成的任务。
- 记录 Android APK、ESP32 固件、Node/Flutter/Kotlin 测试结果及 SHA。
- 不携带机器本地构建日志垃圾。

建议交接提交：`docs(handoff): freeze Windows-complete baseline for Mac continuation`

## 第四阶段：Mac 主机——剩余功能

Mac 从 Windows 交接 commit 开始，不另起产品线。

### M1：Apple 共享 Smart HID Core

- 创建 `core/apple/SmartHidCore`
- 接入 Windows 阶段冻结的协议向量
- 提供协议、分帧、状态、错误恢复纯逻辑
- AppKit 与 SwiftUI 共用，CoreBluetooth 保持平台适配层

### M2：原生 iOS 功能补齐

完成当前缺失的：

- P002 Smart HID 配网
- P003 HID 详情
- P005 五项诊断
- P010 版本记录
- Profile 双入口
- V1 无 SMP
- QR/粘贴回退
- 会话所有权、断线和错误恢复

先跑 XCTest 和模拟器，再跑物理 iPhone + ESP32。

### M3：Mac 可执行实现回归

覆盖：

- N-IOS
- N-MAC
- F-MAC
- Electron macOS
- Tauri macOS

验证所有已有功能没有因 Windows 阶段公共协议与 Runtime 修改而回退。

### Mac 功能 Gate

- Apple 实现没有缺失的活动页面。
- N-IOS/N-MAC/F-MAC 的核心功能均有自动化或真机结论。
- 不能用模拟器构建代替真实 BLE PASS。
- 所有允许差异都有 `10_platform` 文档依据。

## 第五阶段：Mac UI 与全平台总验收

1. Apple 端按同一原型完成 UI 对齐。
2. 统一截图尺寸和证据格式。
3. 回填全实现线一致性矩阵。
4. 执行 clean-machine E6。
5. 完善 Release Pipeline：
   - uni-app Android
   - Kotlin/Flutter Android
   - ESP32 Peripheral/Observer
   - Windows/macOS 桌面产物
   - Apple 签名产物
   - checksums 与 Release Metadata
6. Gitee、GitHub 双远端同步。

最终完成条件：所有活动实现线功能一致；UI 差异只有平台规范明确允许的部分；安装包、固件、版本信息和公开声明全部诚实可验证。

---

## 执行记录

- **2026-09-09（W0）**：Windows 工作区已确认 HEAD = origin(gitee) = github = `5cb449c`（ff-only，无 merge；此前"落后 22 提交"为过期信息，fetch 后 github 引用快进到 `5cb449c`）。修改前基线五件套已启动，原始结果存 `verification/windows-mobile-v1/20260909-win-b2/baseline-prechange/`。环境：node 20.19.3（nvm 另有 23.8.0 可跑 .ts）、便携 JDK21 `C:\Users\11066\tools\jdk-21`、Flutter 3.38.3、PlatformIO penv、ADB 35.0.2、COM12/COM4、HBuilderX `D:\HBuilderX`、微信开发者工具已装；Rust/cargo 缺失（T-WIN 留 W6 恢复）。工作区存在上一轮未提交的 K-AND splash 改动与 win-b1 证据更新（用户脏文件，按约定不提交不动）。

  **修改前基线分类**：verify-target —— 7 checker 全 PASS、unit 197/199（2 FAIL：TEST-U-015=TS-001 桥病、known-devices TTL=F023 取代型陈旧断言），随后 `runPageSpecs` 在 Windows 崩溃（spawnSync('npx') ENOENT → `out.match` TypeError）；verify-uniapp —— 在 hid-navigation 陈旧断言处 set -e 早停（后续 hid-navigation/phase3/ui-contract/smart-hid-profile/资产门禁共 6 处被掩盖的失败）；flutter analyze+test ✅；android gradle assembleDebug+testDebugUnitTest ✅（45s）；esp32 pio 两环境 ✅。
- **2026-09-09（W1 完成）**：
  - **TEST-BRIDGE-TS-001 关闭**：`tests/target/lib/import-target.mjs` 对内联 `.ts` 依赖做类型剥离（`node:module.stripTypeScriptTypes`，data URL 不吃文件级剥离故必须桥内转换）；`scripts/verify-target.mjs` 启动时按 NODE_BIN → 当前 Node → NVM_HOME 解析 TS-capable Node（≥22.18/≥23.6）并自重执行，Node 20 下测试给可行动 TS_BRIDGE 信息；同时修 `runPageSpecs` Windows npx 崩溃（shell 解析 + spawn 失败降级 BLOCKED）。
  - **测试可信度修复（set -e 掩盖链全清）**：TEST-U-015 按正典重写（matchAdvertisement/UUID→STRONG/SHID- 前缀/ERROR_CLASSES 补定义）；known-devices 三处（target 层/history-retention、unit 层/phase3、harness 参照层）按 F023 零持久化红线改写为反向守卫；hid-navigation 删 buildHidHistoryUrl 断言改路由反向守卫；smart-hid-profile 文案对齐 PRD/b801b56；ui-contract 移除 pruneKnownDevices/icon 断言（F023/86952f4 取代）；真实产品缺陷 2 处修复：broadcast/index.vue 废弃 getSystemInfoSync→getDeviceInfo、share.png 压至 224KiB；check-uniapp-assets.mjs 身份段改 abbr 徽章口径；verify-uniapp 空白门禁排除 verification/ 原始证据。
  - **协议向量基座**：新增 `core/protocols/smart-hid-v1-vectors.json`（50 例：UUID/QR/candidate/分帧/MTU/INFO/STATUS/8 错误码恢复动作，常量与正典 contract JSON 对锁）；新增 `scripts/check-platform-parity.mjs`（js 68/68 PASS——TS 镜像+framing+workflow 经桥执行；dart 59/59 PASS——新 `apps/flutter/tool/smart_hid_parity.dart` 纯 Dart runner；kotlin NOT_IMPLEMENTED 如实登记待 W3；swift DEFERRED_TO_MAC）；`check-smart-hid-contract.mjs` 扩展为向量×正典对锁；parity 挂入 verify-uniapp.sh 第 12 静态门禁（FAIL 阻断，BLOCKED/NOT_IMPLEMENTED 在册放行）。
  - **W1 退出条件核验**：verify-target --mode=all 七层零失败（unit 199/0、integration 48/0、firmware 60/0、release 10/0、pages Playwright 11 specs 230 断言真跑全过、system 412/0、harness 108/0）；verify-uniapp 28 unit + 12 门禁全过；flutter analyze 零问题 + 69 测试全过。证据存 `verification/windows-mobile-v1/20260909-win-b2/w1-test-bridge/`。
- 下一项：W2 BLE 基础功能闭环 F001–F013（F-AND 写队列/超时/重连 + K-AND WIN-AAND-004/006/007/008 + U 回归）。
- **2026-09-10（W2 代码层完成）**：
  - **F-AND 四项**（flutter analyze 0 + test 87/87，新增 18 测试）：F006 连接超时 30s→10s（`defaultConnectTimeout` 契约常量）；F012 重连退避 2/4/6s→1/3/5s（`reconnectDelaysMs=[1000,3000,5000]`）；F009 写队列深 16（enqueue/batch 整批拒绝+isFull）+ 单写 5s 超时（挂死 write 标记失败放行下一条）+ 同设备串行/跨设备并行（per-device 队列）锁进 `command_queue_test.dart`；F005 显示名批准链 Dart 镜像（name→advName→profile→「未命名 BLE · ID后四位」，`device_display_name.dart`），BleScanResult/BleDevice 统一，前缀过滤改按显示名（SHID 仅广播名设备可命中）。
  - **K-AND 四缺陷**（gradle testDebugUnitTest+assembleDebug 全绿，新增 BleGattContractTest 3 例）：WIN-AAND-008 `characteristicChanges` 加缓冲（extraBufferCapacity=64 + DROP_OLDEST）；WIN-AAND-006 连接即 `requestMtu(247)`→`onMtuChanged`→`discoverServicesOnce` 串行编排（requestMtu 失败兜底直发现；移除 ViewModel 并发补发避免 GATT 互斥）；WIN-AAND-004 `onCharacteristicRead` 读值进 `characteristicChanges` 流（事件带 `kind=Notify/Read`，日志区分「读取结果/收到通知」）；WIN-AAND-007 展开态 key 改服务 UUID 集合（值更新不再重置）+「发现 N 个服务」只在 UUID 集合变化时播报（`shouldAnnounceServices` 纯函数）+ `discoverServicesOnce` 幂等。
  - 证据 `verification/windows-mobile-v1/20260909-win-b2/w2-ble-basics/`。**未完**：F013 双设备真机证据（需 E5+ESP32 刷回 peripheral 夹具的硬件编排，E5 已在线）；uni-app/微信行为回归（W2 收尾项）。
  - 备注：用户并行提交 1ccc085（A-AND splash）与 ee41e68（A-AND 全页对齐）已入库，与本轮文件零重叠。
- **2026-09-10（W2 真机窗口·首轮）**：ESP32 已刷回 `fixture_peripheral_s3`（固件 git_sha=4c9d31a，`verification/.../w2-ble-basics/kand-recheck/` 有烧录与串口记录）；F-AND/K-AND 修复版 APK 已装 E5。**发现并修复 4c9d31a 引入的 K-AND 连接即崩**（`3e28452`）：`lastAnnouncedServiceUuids` 声明在 init 块后，`viewModelScope` 的 Main.immediate 使「连接并进入」完成服务发现后进页时 StateFlow 首个发射在 `<init>` 期间同步执行，属性未初始化 → `shouldAnnounceServices` 非空参数收 null → NPE；JUnit 只测纯函数未覆盖构造路径。修复=声明前移 + 参数改 `Set<String>?`（null=无历史即播报）+ null 语义回归锁。**真机复验被硬件占用阻断**：E5+COM12 正被 steering-ble 并行会话使用（前台 `com.steering.ble.g0` 自动重连循环 + 其串口记录器占 COM12），K-AND 004/006/007/008 复验与 F-AND F005/F006/F009/F012 实机证据顺延至硬件窗口空闲；F013 双外设还需华为 TAS-AN00 上线。
- **2026-09-10（W3 部分完成·纯代码线）**：
  - **K-AND Smart HID 协议镜像落地**：`apps/android/.../core/profile/SmartHidProtocol.kt`（GATT UUID/名称前缀/QR 解析/candidate 构造/分帧 chunk+buildFrames/DeviceInfo+Status 解析/错误码表+提示/恢复动作/状态行映射，与 TS/Dart 逐字段一致；candidate 手工拼 JSON 保键序，org.json 不保序不可用于构造）。
  - **kotlin parity 车道接线**：`SmartHidVectorParityTest.kt` 读同一向量 JSON，结果双出口（`app/build/smart-hid-parity-kotlin.json` + `@@PARITY@@` stdout）；`check-platform-parity.mjs` kotlin 车道改为 gradle 执行（任务 `--rerun` 防 UP-TO-DATE 跳过、结果文件先删防陈旧、JDK 17–19 自动解析 env JAVA_HOME→~/.jdks，Gradle 8.2 运行时上限 19，本机用 corretto-18）。**kotlin PASS 71/71**。
  - **js 车道静默失败修复（W1 遗留）**：js 车道实际 3 例常量比较失败（TS 导出 RegExp 字面量，`String()` 带斜杠≠向量 pattern 串）但 `runJsLane` 无条件返回 PASS，W1 证据「js 68/68」实为 71 中 3 静默失败；修正比较式取 `.source` + FAIL 状态按 failures 判定，**js 71/71 真绿**。
  - 全量核验：parity 四车道 js 71/71 + dart 59/59 + kotlin 71/71 + swift DEFERRED_TO_MAC；gradle testDebugUnitTest 全绿；verify-uniapp 28 unit + 12 门禁（含 parity 新车道）全过。证据 `verification/windows-mobile-v1/20260909-win-b2/w3-smart-hid/`。
  - **W3 未完**：WIN-UAND-003b（重建 uniapp 资源 + HBuilderX 自定义基座复现 10007，需 E5）；K-AND HidProvisionManager（配网会话编排，UI 后置）；F018-F024 三线回归（需硬件）；F023 零持久化静态扫（纯代码，可继续）。
- **2026-09-10（W3 续·配网会话编排落地）**：
  - **BleManager 三扩展**：`CharacteristicChangeKind.Write`（onCharacteristicWrite 成功进同一特征事件流，配网分帧逐帧确认用；ViewModel 日志三分支「写入完成/读取结果/收到通知」）；`_negotiatedMtus` + `currentMtu(deviceId)`（onMtuChanged 记录协商值，缺失保守 23）。
  - **`HidProvisionTransport.kt`**：接口 + `BleManagerHidTransport`（镜像 Flutter transport：连接→等服务表出现配网服务→三特征确认→开 notify；读特征先挂采集再发起防丢事件；写帧 15s 单帧超时；断线即停 BleManager 静默自动重连并上报 onLost）+ `buildCandidateFrames`。
  - **`HidProvisionController.kt`**：P002 三阶段状态机 Kotlin 镜像（StateFlow<ProvisionUiState> 单一不可变快照；CompletableDeferred+withTimeoutOrNull 对齐 Dart Completer+Timer；步进→行推进单调表；错误码→行/提示/恢复映射走 SmartHidProtocol；cancelWait/backToForm/诊断快照/2s STATUS 轮询保活；F023 红线：token/密码仅作 submit 参数不落字段）。
  - **测试**：`HidProvisionControllerTest` 14 例全绿（happy 帧头契约+载荷重组=candidate、wifi_failed/pairing_used 行映射、60s 虚拟时间超时、下发中断线、写失败分类、单调推进（旧 step 回放/迟到 error 不回退）、cancelWait、backToForm、轮询刷新）；FakeTransport 双形态对齐 Flutter。全仓 34 测试 0 失败 + assembleDebug 过。UI 接线（P002 页面）留 Windows UI 阶段。
  - 真机窗口仍被 steering-ble 并行会话占用（前台 com.steering.ble.g0），K-AND/F-AND 复验继续顺延。
- **2026-09-10（W3 续·F023 零持久化静态门禁）**：
  - **全仓静态扫落地**（`scripts/check-f023-zero-persistence.mjs`，接入 verify-uniapp 第 13 门禁）：① Z-2 存储/文件持久化调用（js/dart/kt/swift/rs/cs 六语言模式 × uniapp/flutter/K-AND/iOS/E-WIN/T-WIN/macOS/avalonia/core 共 299 文件）；② F023 旧存储键 `smart_ble.smart_hid.known_devices(.v1)` 与 `pruneKnownDevices`；③ PAGE004 hid history 路由残留；④「已配置 Smart HID」/「全部历史」面板字符串；⑤ uniapp pages.json 结构检查（hid 路由白名单仅 add/detail/diagnostics + 不占 Tab）。排除测试目录与注释行（W1 反向守卫测试合法提及禁用 API）；provisioning.js FORBIDDEN_TOKEN_SINKS 守卫清单靠调用式正则不误报。**门禁自检：注入 4 类违规（含 pages.json 结构）全部检出后还原**（gate-selftest.log）。
  - **扫出并修复唯一真实残留**：E-WIN 与 T-WIN 的 `I18nManager.js` 用 localStorage 持久化 `app_lang` 键（违反 Z-2；该 i18n 脚手架本身与 F030「不做国际化」红线冲突，整体移除留 W5）。修复=语言改会话内状态，每次启动按系统语言检测，不落任何存储。
  - 其余实现线全干净；uniapp `knownDevices` 为内存会话快照概念（STORAGE_POLICY §3 内存实体），不属残留；K-AND CommandQueue history 为内存命令历史，与设备历史无关。
  - 证据 `verification/windows-mobile-v1/20260909-win-b2/w3-smart-hid/f023-zero-persistence/`（自检注入日志 + verify-uniapp 全量 28 单测 + 13 门禁）。**W3 纯代码项全部完成**，未完仅剩硬件依赖项：WIN-UAND-003b（HBuilderX 基座）、F018-F024 三线真机回归。
- **2026-09-10（W2 真机复验第二轮）**：硬件窗口空闲后（steering-ble 会话释放 E5+COM12），ESP32 刷回 `fixture_peripheral_s3`（串口 boot JSON git_sha=835f1cf），K-AND/F-AND 修复版复验完成。
  - **K-AND 四缺陷真机复验全过**（三源交叉：App logcat `SmartBLE_Logger` pid 13869 + ESP32 串口 + 系统 BT 日志）：WIN-AAND-004 读值可观察——`[Receive] 读取结果: 7B 22 66 69 72 6D 77 61 72 65...`（system_info JSON）；WIN-AAND-006——系统日志 `BluetoothGatt: configureMTU() ... mtu: 247` + `gatt_api: GATTC_ConfigureMTU ... user mtu=247`；WIN-AAND-007——连接后「发现 5 个服务」单次播报（切片内唯一一次）；WIN-AAND-008——通知零丢失，logcat 143 条 `[Receive]` + 串口 device_status notify 按 uptime 连续。3e28452 崩溃修复验证：修复版 APK 连接进页正常（fix3e28452-01..04.png）。
  - **附带发现并登记缺陷**：K-AND 写入弹窗「批量/循环」模式不生效——`WriteDialog.kt` 收集了 `SendMode.Batch/Loop` 与次数/间隔/无限循环参数（L53/L70-72），但 `onConfirm(payload)` 只传出单条 ByteArray（L220），批量多行被当一条整包发送、循环零执行；唯一调用点 `DeviceDetailScreen.kt:294` 也只调一次 `writeCharacteristic`。注释「发送逻辑沿用旧实现（含批量/循环参数）」与实现不符。留 W2 遗留待办。
  - **F-AND F005 真机发现实缺陷并修复**：扫描卡片对仅广播名（advName）设备显示「未命名 BLE 设备」——卡片直读 `device.name` 绕过批准链。修复 `device_card.dart`：标题改 `device.displayName`、副标题固定 `device.deviceId`（链在模型层早已存在，卡片未用）。flutter analyze 0 + test 87/87 复跑通过；截图 `fand-recheck/01-adv-sheet-name.png`（BLEToolkit-Server 行 + 「未命名 BLE · 238D」兜底）。F006/F009 机制层以 eae482a 的 18 例 Dart 单测为判定基线（已过），真机层不做 UI 驱动取证。
  - **F012 真机证据 BLOCKED（→ WIN-FAND-009）**：`svc bluetooth disable/enable` 重启路径尝试中 FBP 遭 GATT error 22/133 连接失败循环，疑因 FBP 对幽灵设备 `10:B4:1D:CD:23:8F` 的陈旧 autoConnect 抢占（见下条独立登记）。F-AND 侧原生日志本轮未成功归档（仅存 F005 截图），待 WIN-FAND-009 处理后重取。
  - **uniapp 同型疑点在册**：`DeviceCard.vue` 直读 `device.name`（'未命名设备'/'未命名 BLE 设备' 兜底），未走 displayName 批准链——留 U 行为回归时对齐（W2 收尾项）。
  - 证据 `w2-ble-basics/kand-recheck/`（recheck-session-logcat.txt 切片 + recheck-session-serial.txt + serial-live.txt + fix3e28452-*.png；logcat-live.txt 11.6MB 与 kand-logcat-full.log 29MB 留本地不入库）+ `fand-recheck/01-adv-sheet-name.png`；串口工具 `serial_reader.py` 入库。
- **2026-09-10（缺陷登记 WIN-FAND-009）**：FBP（flutter_blue_plus）对幽灵设备 `10:B4:1D:CD:23:8F` 的陈旧 autoConnect 钩子：`svc bluetooth disable/enable` 重启蓝牙后仍抢占连接，致 23:8D 目标连接遭 GATT error 133/22 失败循环，**阻塞 F012 真机重连证据**（与上条 F012 BLOCKED 交叉引用，用户已批准独立登记）。待办：清 FBP 连接缓存（isConnected/autoConnect 残留路径排查或冷启 App）复现验证，恢复 23:8D 可连后重取 F012 证据。注：登记依据为第二轮会话现场观察，F-AND 原生日志（fbp-connect-gatt/bt-dumpsys）未归档，复现时需重新取证。
- **2026-09-10（W5 纯代码·F026 日志脱敏三线闭环）**：
  - 正典=BUSINESS_FLOW §7 / DATA_FLOW §7（任意日志产生点→脱敏：token/password/secret…→`***`，保护键白名单不脱敏）。uniapp 线已有实现+集成测试（`tests/target/integration/logging-target.test.mjs` 覆盖 BLE/OTA/Smart HID 三 logger，本轮未改动）。
  - **F-AND**：新增 `core/utils/log_redaction.dart`（uniapp JS 锁定镜像：敏感键 10 片段/保护键 7 片段+uuid 规则/6 组字符串模式/JSON 解析分支/循环引用守卫）；接线 `Logger._emit`（UI 日志面板+debugPrint 的唯一漏斗）与 command_queue 两处旁路打印（超时 hex/异常文案）；`test/log_redaction_test.dart` 13 向量（V1-V12 含 Logger 漏斗集成断言）；**analyze 0 + 99/99 全绿**。
  - **K-AND**：新增 `core/utils/LogRedaction.kt` 同镜像；接线 `Logger.emit`；`LogRedactionTest` 12 向量（**gradle testDebugUnitTest XML 实证 12/12**）；build.gradle.kts 补 `testOptions.unitTests.isReturnDefaultValues`（JVM 单测过 Logger→android.util.Log 调用）。
  - **镜像坑（三线同源对齐的关键差异）**：①正典 JS 多趟模式替换在 `authorization: Bearer x` 上产出 `authorization: Bearer *** ***`（P1 整段替换后 P3 再命中前缀段）——正典既有行为、三线一致，测试锁语义（密文不出现+Bearer 已脱敏）不锁精确串；②JVM 测试类路径 org.json(20240303) 为 HashMap **不保序**（真机 Android 平台版 LinkedHashMap 保序）→ Kotlin JSON 向量用按键取值断言；③Kotlin `JSONObject(Any)` 会解析到 bean 反射构造器 → 必须 `as Map<*,*>` 显式选 Map 构造器；④Kotlin 参数智能转换未生效 → `input ?: return null` elvis 收窄。
  - 矩阵 F026 行回填：三线 E1 PASS（U-AND 沿用既有集成测试、F-AND/A-AND 本轮单测）；E5 真机 logcat 抽查留硬件窗口。
- **2026-09-10（页面正确性静态分析——F005 批准链与写入弹窗三线横评）**：
  - **F005 显示名批准链（name→advName→profile→「未命名 BLE · ID后四位」）**：F-AND ✅（9116813 修复+真机验证）。**K-AND 结构性缺失**：BleManager 扫描回调 `name = device.name` 只取 GAP 名（BleManager.kt:501，ScanRecord 亦未带广播名/厂商数据——注释「Simplified for now」），DeviceCard.kt:89 兜底「未命名 BLE 设备」≠批准链兜底；A-AND 当年 F005 13/13 为旧矩阵口径（旧 F005=写双入口，矩阵错位已重建），按重建口径应视为 NOT_RUN。**uniapp 同型缺口**：DeviceCard.vue:74 直读 `props.device.name || '未命名 BLE 设备'`，未接已有 `services/ble-runtime/device-display-name.js`（链已存在且含 profile/advNames 解析）；U-AND F005 亦为旧口径，待 U 行为回归。修复成本：uniapp=卡片接 display-name；K-AND=扫描层先补 advName 捕获再接链。
  - **写入弹窗（正典 C9：TEXT/HEX + 单次/批量/循环）**：F-AND ✅ 参照实现（device_detail_page.dart:248-325：单次/enqueueBatch/startLoop(loopCount/intervalMs)）；**K-AND 缺陷在册**（上轮已登记：WriteDialog 收集模式参数但 onConfirm 只发单条）——修法明确：弹窗回传 mode+参数，调用方改调 CommandQueue **已有**的 `enqueueBatch`/`startLoop`（CommandQueue.kt:103/112 队列层已就绪，纯 UI 接线断点；interval 参数队列层是否支持待查）；**uniapp 对齐缺口**：write-dialog.vue 无单次/批量/循环分段（功能不可达，属正典 C9 对齐缺口，并入 U 行为回归清单）。
- **2026-09-10（W5 纯代码·F027 版本元数据三线闭环）**：
  - 正典=PRD §5 F027 / R26 · FEATURE_IMPLEMENTATION_MATRIX「F027 版本元数据展示」：P009 版本三态（运行时渠道成功→覆盖 / 回退 Release Metadata 投影 verFallback / 元数据亦空→dev.unknown）+ P010 整页 Release Metadata 纯投影（当前版本/平台状态/限制列表/releases/previews，禁止手写版本事实）。uniapp 线既有实现+3 份测试（version-release-metadata-target / version-page-model-target / page-version-projection），本轮未改动任何 uniapp 代码。
  - **管线扩展一源六产物**：`scripts/generate-release-metadata.mjs` 新增 Dart/Kotlin 镜像产物——`apps/flutter/lib/core/config/release_metadata_generated.dart`（const 镜像，单引号+$ 转义适配 flutter_lints，dart format 稳定）与 `com.smartble.core.config.ReleaseMetadataGenerated.kt`（mapOf 镜像）；`--check` 漂移守卫自动纳入（本轮复跑 4 个既有产物字节不变，U 线零漂移）。
  - **F-AND**：新增 `core/utils/version_metadata.dart`（uniapp services/version-metadata.js 锁定镜像：buildVersionString 三态/platformPublicStatuses 七键序/versionPageModel 纯函数，typed 化但字段名/语义与正典一致）；接线 about_page（_version 基准=metadataVersionLabel，PackageInfo 成功才覆盖，修掉原「失败直接 dev.unknown」）与 versions_page（整页消费 versionPageModel：渠道/平台四行/限制 8 条/releases/previews 全投影，移除 PackageInfo；原「暂无预览记录」手写空态修正为实况 1 条 1.0.5 Preview）；`test/version_metadata_test.dart` 14 向量；**analyze 0 + 113/113 全绿**。
  - **K-AND**：新增 `core/utils/VersionMetadata.kt` 同镜像；接线 AboutScreen（BuildConfig.VERSION_NAME 非空才覆盖，否则 metadataVersionLabel）与 VersionsScreen（整页 versionPageModel；**清除假事实「Release tag 已登记（preview）」**——元数据 release_tag=null 该行应隐藏；「暂无预览记录」错误空态修为投影实况；移除 BuildConfig 依赖）；`VersionMetadataTest` 14 向量（**gradle testDebugUnitTest XML 实证 14/14**）。
  - 向量组（F/A 各 14，M2/M3 与 U 正典注入向量对齐）：V1-V5 buildVersionString 三态（缺失→dev.unknown 不编造 0.0.0 / release+sha / preview-dev.sha / shortSha trim+7 / 渠道大小写）；G1-G4 生成物同源事实（1.0.5/101/preview/PREVIEW、ota BLOCKED 带 reason、平台七键序+REFERENCE、verFallback 基准）；M1-M5 页面模型（默认元数据/preview 注入/releases+artifacts 注入 VERIFIED/空元数据兜底/注入不污染全局）。
  - 矩阵 F027 行回填：三线 E1 PASS（U-AND 正典既有、F-AND/A-AND 本轮单测 14/14×2）；P009/P010 手写版本事实清零；E5 真机 P009/P010 抽查留硬件窗口。证据 `verification/windows-mobile-v1/20260909-win-b2/w5-f027-version-metadata/e1-summary.txt`。
- **2026-09-10（W5 纯代码·F030 不做国际化静态守卫 + i18n 脚手架清零）**：
  - 正典=PRD §5 F030/§8 R30/2026-09-02 P-05 关闭决议：不做 i18n，UI 全中文硬编码；验证方式=删除红线静态检查（同 F023 性质）。
  - **移除**：E-WIN/T-WIN 整套 i18n 机器（I18nManager.js 系统语言探测+字典 fetch+data-i18n DOM 翻译+language-changed；两线字典/标注 diff 实证逐字节一致；index.html 剥 12 处 data-i18n 属性留内联中文；app.js 移除 init 块）——F023 轮已预告「i18n 脚手架整体移除留 W5（F030）」本轮兑现；uniapp `locale/{zh-CN,en-US}.json` 孤儿字典同批删除（与桌面线同键族，零接线实证：0 处 $t/manifest 无 locale 配置/0 引用）。
  - **保持（在册决议）**：F-AND main.dart Global* delegates+supportedLocales=框架级基建（FLUTTER-G1-004，Material 内建控件串本地化，产品文案仍硬编码中文）；lib/l10n/**=PRD「就绪未接线」在册现状，守卫路径白名单，目录外任何 AppLocalizations 接线违规。A-AND 无 localeConfig/values-<locale>（扫描干净）。
  - **守卫**：`scripts/check-f030-no-i18n.mjs` 接入 verify-uniapp 第 14 门禁——10 产品源集×三规则（i18n 机器调用式正则/语言切换入口文案/Android localeConfig）+ 结构检查（uniapp locale(s)//E/T-WIN locales//I18nManager.js/Android 限定符目录不存在）；自检注入 4 类违规全检出后还原（gate-selftest.log）。
  - 验证：verify-uniapp 28+14 全过；build:mp-weixin DONE（locale 移除无副作用）；两桌面线 app.js node --check 过。限制：桌面线运行级走查随 W6（T-WIN 待 Rust 工具链）。矩阵 F030 行回填 E1 PASS。证据 `verification/.../w5-f030-no-i18n/`。
- **2026-09-10（W6 桌面线·E-WIN 功能补齐 + T-WIN 镜像）**：
  - **F027 版本元数据桌面投影**（a340de7）：生成管线一源九产物（uniapp 全套 + F-AND Dart + K-AND Kotlin + E-WIN/T-WIN `config/release-metadata.generated.js` 全局脚本）；E-WIN preload 补 `app:getVersion`（运行时渠道成功才覆盖 metadata 基准）；P010 版本记录视图 + F029 分享（导出 .txt / 剪贴板兜底）；`tests/desktop/version-metadata.desktop.test.mjs` 12 例。
  - **OTA 契约对齐**（8278a89）：OtaDialog 重写为真实契约链路（选包 .bin → sha256/manifest 校验（R-1 方案 A：无 manifest 省略 target 字段，真固件按 missing_target 拒绝）→ CTRL start/ready(30s) → DATA 分块 writeNoResponse(20ms 间隔) → commit/success(30s) → abort）；共享 `ota-contract.js`（OtaManifest/OtaStartPayload/OtaStatusClassifier R-2 子串分类）；T-WIN invoke/listen 适配层镜像。
  - **F005 批准链 + C9 写入分段**（01973e0）：`device-display-name.js`（uniapp 锁定镜像）+ DeviceCard 接线；WriteDialog 单次/批量（每行一条）/循环（次数×间隔，0=∞）三模式。
  - **F026 日志脱敏**（dfeded8）：`log-redaction.js` 镜像 + 渲染端 addLog 唯一漏斗。
  - **Smart HID 协议 bundle**（bf1ddd7）：`smart-hid.bundle.js`（uniapp 服务层纯逻辑单文件合并挂 window.SmartHid：errors→framing→profile-contract→session-registry→provisioning→diagnostic→workflow-engine）+ 向量锁测试；传输/页面编排在桌面层待 P002/P003/P005。
  - **E-WIN 启动 + 扫描链修复**（b0cd7fd）：Electron 27.3.11 实启过（noble poweredOn/真实扫描发现设备）；四缺陷修（服务发现风暴互喂/OTA UUID 规范化不等/动态 OTA 按钮指向不存在 id/连接状态更新时机）。
  - **P009 关于页首轮对齐**（43609b4，用户走查驱动）：结构对齐 prototype p009-about.js（navbar/身份卡/应用信息/平台状态 rel-row/四行菜单/foot）；F028 推广卡桌面线裁撤（a88c358，uniapp 移动端保留）；滚动修复（switchTab 内联 display 覆盖 flex → .about-shell height:100%）。
  - Mac 线并行：macos-ota 5d59358 / ios-ota 2d6e79c（OTA 契约镜像，Mac 主机完成）。
- **2026-09-10（用户指令：原型对齐全量提前——六页正典化）**：用户明确「都要对齐，不是只有关于页面」，第二阶段 UI 对齐从 P009 单点提前为全量执行（顺序 P001→P006→P007→P008→P010；P002/P003/P005 桌面未实现待功能开发）。
  - **基建+P001**（d914351）：新增 `prototype.css`（原型正典 tokens/components/pages/desktop 产品部分整体搬运，适配仅三处：screen 铺满视口/P006 双栏挂 #deviceDetailView/.view 显隐）；外壳重构 screen/pagehost/底部 TabBar 四枚+图标 sprite 全集（24 枚）；DeviceCard/FilterPanel 转 light DOM 正典结构（.dev 卡双变体/.filter 四行）；空态换 C.ILL SVG 插图；toast 正典化。
  - **P006**（5d9a956）：subnav+devhead（st 三态圆点/状态词/连接断开互斥钮——E-WIN 补齐详情页连接按钮）+ renderServices 状态机（idle/connecting/服务发现中/ready/empty）+ ServicePanel 正典 .svc 树（折叠/全部展开收起/OTA 服务红 dl）+ LogPanel dock 六色中文 chip + WriteDialog/OtaDialog .mask/.modal 换壳（逻辑全保留）+ desktop.js 双栏（左设备/服务·右日志常驻）。**三个存量缺陷修复**：E-WIN ServicePanel 只派发 char-action 但监听 read/write/notify 三事件（读写通知按钮全部无响应）；写入弹窗调用不存在的 open()（从未能打开）；从扫描卡直连进入详情头部名称/ID 从未写入。WriteDialog 补 close 事件派发（循环模式关闭弹窗中止修复）。
  - **P007**（79e2e99）：SESSIONS navbar + sumcard 双模式（1 台隐藏/≥2 台 num+全部断开）+ link 空态去扫描按钮。
  - **P008**（828de92）：bytebar 31B 预算四行明细+超限拦截（E-WIN 补齐预算拦截能力）+ UUID 4/8/36 位校验 + 状态徽章四态 + 检查支持（原生层口径日志）+ cardv 日志卡；T-WIN 广播 Tab 恢复可达（原 display:none 无人解除）。
  - **P010**（2b70689）：subnav+四卡（当前版本大字/当前限制 warn 行/发布历史/预览记录 rel-row）+ 复制版本信息按钮 + foot 投影声明；移除手写表格结构。
  - **收尾**（4090563）：styles.css 1435→429 行（仅留 about-* 命名空间，两线归一零差异，T-WIN legacy 变量别名零引用退役）；placeholders/ 8×2 占位图退役。
  - 验证口径：每页 CDP DOM 审计（P001 29/29 · P006 39/39 · P007 22/22 · P008 22/22 · P010 18/18，真实 Electron + --disable-gpu + 注入确定性设备走真实代码路径）+ 桌面测试 58/58 + 镜像文件（prototype.css/DeviceCard/FilterPanel/ServicePanel/LogPanel/WriteDialog/styles.css）两线零差异；P001/P006 另有实像素截图核对。限制：T-WIN 仅静态镜像验证（Rust 工具链未解锁，运行级走查待 P7）。
- **2026-09-11（W6 · P5 第二步：Smart HID 桌面传输编排 + P002/P003/P005 + 扫描卡双入口）**：bf1ddd7 落的纯逻辑 bundle 接通真实桌面链路。
  - **hid-service.js（两线逐字节镜像）**：uniapp services/smart-hid + provisioning/{transport,orchestrator} + provision-form 桌面投影；依赖注入 bleAPI（E-WIN preload / T-WIN invoke+listen 适配层）。GATT 链 = connect→discover→服务特征确认（UUID 形状自适应原样回传）→先订阅 STATUS/INFO→读 INFO 验证身份；candidate = buildCandidate→encodePayloadFrames(framed-v1, ATT 23 保守分帧)→writeRaw 帧间 30ms 带响应；provisionAndWait = waiter 先建再写；ownsDevice 重连独占（U-REC-001 同型预防，App 层 ownsDevice 守卫不抢跑自动重连）；diagnose 五项映射；P003 会话内存快照；F023 红线零持久化（测试锁）。
  - **P002 三阶段向导**（正典 p002-provision.js 结构：stepper/三 panel/ebanner/prow 四行）：连接→填写配置（SSID/密码 eye 切换/ControlHub 地址 + F020 配对码 bigact→粘贴手输 sheet，桌面口径 10_platform §2.4）→下发状态（进度实时 STATUS notify 驱动 + F022 恢复四分支 diagnostics/pairing/form/retry + U-01 离开确认 modal）。**P003 会话内存快照**（身份/最近配置 kv + 重新配置/运行诊断/高级 BLE 调试）。**P005 五项诊断**（offline→connect→checking→live 状态机 + 错误码显隐）。
  - **扫描卡 SHID 徽章双入口**（正典 C1 devCard）：onDeviceDiscovered 戳 profileMatch（强=广告服务 UUID / 弱=SHID- 名称前缀；E-WIN noble/T-WIN service_uuids/uniapp 三形状投影）→ DeviceCard 匹配 chip + ava.shid + 「配置 Smart HID」主按钮 + 连接降 soft。
  - **测试抓出真 bug 三枚（已修）**：①waitForProvisionResult 链式 .then() 丢 .cancel → 写帧失败 waiter 5s 超时悬挂（shaped.cancel 桥接）；②shaped 写入期间被拒存在 unhandledRejection 窗口（no-op catch 兜底）；③deriveProgress 错误态须 base 累加（uniapp store 就地突变语义，中段失败保留 wifi=done）。
  - 验证：tests/desktop **78/78**（新增 smart-hid-desktop.test.mjs 20 例：镜像 3/传输 10/红线 1/向量 6）+ verify-uniapp 28+14 PASS + 真实 Electron CDP 冒烟（脚本链加载/三视图入口激活/attach 成功/F023 DOM 无 token/真实 noble 假设备优雅报错不崩）。prototype.css 补 .bigact 正典块。证据 `verification/.../w6-p5-hid-desktop/e1-summary.txt`。限制：E5 真机全链（真 SHID 固件+ControlHub 配对码）留硬件窗口；T-WIN 运行级走查留 P7；P002 摄像头扫码未实现（桌面以粘贴/手输为主路径，正典允许）。
- **2026-09-11（P7：T-WIN Rust 工具链恢复 + Tauri 构建 + 首度运行级走查）**：W6 计划项「T-WIN：安装/恢复 Rust 工具链，构建并运行 Tauri」收口。
  - **工具链**：rustup stable-x86_64-pc-windows-msvc 1.98.1（minimal，~/.cargo；Git Bash 需 export PATH）；宿主 MSVC（VS2022 Community + SDK 10.0.22621）齐备；cargo build 出 `target/debug/smart-ble-tauri.exe`。
  - **修掉三缺陷（全部本步实测发现）**：①Cargo.toml 缺 tauri `app-all` feature → tauri-build 失败（增补）；②**P0 运行级致命**——T-WIN app.js 顶层重复声明 BleUtils.js 顶层名（`MAX_RECONNECT_ATTEMPTS`/`escapeHtml`）→ 实例化期 SyntaxError → **app.js 从未执行过**（Tab/扫描/重连/Smart HID 全瘫，页面只是静态壳；此前无运行级验证故未暴露）。修复=删重复声明（escapeHtml 是 0 调用死代码）；防回归=新增 `tests/desktop/script-co-load.test.mjs` 7 例，两线脚本链按真实顺序装入同一 vm 上下文（重复顶层声明与浏览器同语义抛错），反证注回重复声明即失败；③P2——P002 连接失败横幅协议码片是静态占位 identity_failed（两线同病），渲染只填文本；修复=码片加 id 按 error.code 填充/无码隐藏（E-WIN CRLF / T-WIN LF 各按行尾口径补丁）。
  - **WebView2 CDP 运行级走查 30/30 全绿**（`WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port` + node WebSocket 同套驱动）：脚本链/挂载/五 Tab+版本页/P009 chip 投影（v1.0.5-dev.unknown，commit 如实留空）/Smart HID 三视图/P002 向导（stepper+设备名+假设备真实 IPC 优雅失败「Device not found」+码片隐藏）/P005 五项/F023（storage 空+DOM 无 token）/真实 BLE（btleplug WinRT：init_ble+start_scan 4s 发现 7 台真实设备+优雅停止）/ownsDevice 守卫/零 JS 异常。坑：Page.reload 摧毁在途 evaluate 上下文。
  - 验证：tests/desktop **85/85**（78+7）+ cargo build exit 0。证据 `verification/.../p7-twin-rust/e1-summary.txt`（含 cdp-walkthrough.mjs 脚本与 run 记录）。限制：T-WIN 真实 GATT 连接/读写通知需外设窗口（本步 BLE 真实性覆盖到扫描级）。`make verify` 的 cargo check 自此可用。
