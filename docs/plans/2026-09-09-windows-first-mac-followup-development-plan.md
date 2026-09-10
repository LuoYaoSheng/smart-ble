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
