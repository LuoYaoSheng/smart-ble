# Windows Mobile V1 — 修改前基线汇总（Phase B 首轮）

- Run ID: `20260904-win-b1`；日期 2026-09-04；分支 `refactor/uniapp-v1`；commit `dbb38a8`
- 环境：Windows 10 22H2 / Flutter 3.38.3 / HBuilderX 5.24.2026081301 / PlatformIO 6.1.18 / Node 20.19.3（+nvm 23.8.0）
- 真机：SM-G9910（`R5CR1284Y7H`，Android 15）；ESP32：COM12（CH343，**实测芯片 ESP32-S3**）

## A. UniApp 基线（U-WX / U-AND）

| 项 | 命令/入口 | 状态 | 说明 |
|---|---|---|---|
| 单元测试×28 + 静态 Gate×11 | `bash scripts/verify-uniapp.sh` | **PASS** | 127 断言；Windows 兼容修复 5 处后全绿（见 D 节） |
| Smart HID 契约锁 | verify-uniapp.sh 内含 | PASS | CRLF 归一化后与锁一致 |
| HTML 原型真实点击 | `npx playwright test tests/target/pages/specs` | **PASS** | 230 用例 28.8s（Chromium 131 补装后） |
| 页面与导航（UniAutomator mp-weixin） | `scripts/verify-uniapp-pages.sh` | **BLOCKED** | HBuilderX 5.24 CLI 无 `uniapp.test` 命令（`cli help` 仅有 launch/open/project/cloud） |
| HBuilderX 微信编译（mp-weixin） | `cli launch mp-weixin` | **BLOCKED_IIFE** | rollup `manualChunks` vs `inlineDynamicImports` 不兼容（编译器 5.24 vue3）→ 已停止；与 macOS 侧已登记的 IIFE 类问题同型 |
| UniApp Android App 编译探针 | `scripts/e5/build-android-test.sh` | **PASS（COMPILE_OK）** | app-service.js SHA256 `f053b85a…`；不宣称安装/E5 |
| Android 微信真机预览 | 人工 | NOT_RUN | 需手机微信配合扫码/登录 |
| UniApp Android 真机运行 | 人工 | NOT_RUN | compile probe 之外留待 Gate |
| 环境就绪探测 | `scripts/e5/check-env.mjs` | **READY** | 1 物理机 + 串口可用（Windows 化修复后） |

## B. Flutter 基线（F-AND）

| 项 | 状态 | 说明 |
|---|---|---|
| `flutter pub get` | PASS | 1 discontinued / 64 outdated 提示，非阻塞 |
| `dart format --set-exit-if-changed lib test` | **FAIL（基线缺陷登记）** | 32 文件中 20 个有 format 偏差；未写回 |
| `flutter analyze` | PASS | No issues found（11.5s） |
| `flutter test` | PASS | 11 项全过（宿主侧 fbp unsupported 打印为预期） |
| `flutter build apk --debug` | PASS | Gradle 340.9s；`app-debug.apk` 185,569,910B；SHA256 `0339b5a147645c67066092d6396994233dadaa358d8bdfb846010cdb41851f4d`；doctor 黄牌（cmdline-tools/license）未阻塞 |
| `flutter devices` | PASS | 4 设备含真机 |
| `flutter run -d <device>` | NOT_RUN | 交互式真机会话留待 Gate（基线只记录构建层） |
| 差距审计 | 完成 | `docs/specs/06_review/FLUTTER_PRODUCT_GAP_AUDIT.md`（20 项偏差全部 CONFIRMED/PARTIAL/ABSENT 定级）+ `08_development/FLUTTER_REUSE_MATRIX.md` |

## C. ESP32 基线

| 项 | 状态 | 说明 |
|---|---|---|
| `pio run -e fixture_peripheral` | **SUCCESS** | 2:17.8；firmware.bin SHA256 `6c64edbf6cca8ff30e7de595b93e591a6e1fedc94a79fd1886d3a8cb31b89b2b` |
| `pio run -e fixture_observer` | **SUCCESS** | 1:49.1；firmware.bin SHA256 `82487ec8c3f970216c7b53088d7dc09f11929932f95bdc27bb5cb1372648e378` |
| `pio device list` | PASS | COM12=CH343（ESP32）、COM4=手机 ADB 复合口 |
| 烧录 fixture_peripheral @COM12 | **FAIL（DEF-001）** | esptool：`This chip is ESP32-S3 not ESP32. Wrong --chip argument?` —— 板卡为 **ESP32-S3**，固件目标 `board=esp32dev` |
| 串口启动日志/广播名/UUID | NOT_RUN | 烧录未成功，无法取启动日志 |

## D. 本轮跨系统修复（§4 工具链兼容）

1. `apps/uniapp/env.js`：微信 CLI 路径改为 `WECHAT_DEVTOOLS_CLI` 环境变量（不再写死 macOS 路径）。
2. `scripts/e5/check-env.mjs`：Windows 化（pio.exe 发现、COM 口识别、HBuilderX/微信 CLI 多路径发现、Android SDK 默认路径、adb.exe）。
3. `scripts/verify-uniapp.sh`：TS-capable Node 解析（NODE_BIN→系统 node≥22.18/23.6→NVM_HOME 扫描），单测可加载锁定 .ts 协议镜像。
4. `scripts/verify-uniapp-pages.sh` + `scripts/e5/build-android-test.sh`：HBuilderX CLI 跨平台发现 + sha256 回退；新增 `scripts/verify-uniapp.ps1`、`verify-uniapp-pages.ps1`（委托原 bash，不跳 Gate）。
5. CRLF 防线：`scripts/check-smart-hid-contract.mjs`、`bump-smart-hid-lock.mjs`、`generate-release-metadata.mjs` 归一化 LF 比较；新增 `.gitattributes` 钉死 VERSION+release 元数据 `eol=lf`。
6. `scripts/check-uniapp-sfc.mjs`：@vue/compiler-sfc 跨平台发现（HBUILDERX_CLI/常见安装路径）。

## E. 缺陷登记（第一断点）

| 编号 | 级别 | 摘要 | 第一断点 | 影响 | 状态 |
|---|---|---|---|---|---|
| DEF-001 | P1 | ESP32 板卡实测为 ESP32-S3，固件目标 board=esp32dev 不匹配，烧录失败 | hardware 固件板型配置（platformio.ini）与实物硬件 | 全部真机 E5（三实现线 Peripheral/Observer 轮） | RESOLVED（2026-09-04 E5 轮：esptool 实测 S3 rev v0.2/16MB，新增 fixture_common_s3/peripheral_s3/observer_s3 并烧录验证，原 esp32dev 环境未动；见 I 节与 e5-realdevice/） |
| DEF-002 | P2 | HBuilderX 5.24 CLI 移除 uniapp.test，UniAutomator 页面测试入口失效 | 测试工具链（HBuilderX CLI 版本） | U-WX/U-AND 页面自动化（E1–E4） | OPEN（方案：装对应版本/插件或迁 uni-automator npm） |
| DEF-003 | P2 | mp-weixin 编译 rollup manualChunks/inlineDynamicImports 不兼容 | 编译工具链（HBuilderX 5.24 vue3 编译器；根因是 vite.config 顶层无条件 inlineDynamicImports 波及 mp 平台） | U-WX 小程序产物生成 | RESOLVED（2026-09-04 增补：纯 CLI 构建 + inline 补丁收敛为仅 APP 平台，见 H 节与 uniapp-cli-build.txt） |
| DEF-004 | P3 | Flutter 20 文件 dart format 偏差 | apps/flutter 代码规范 | F-AND Gate M1 前置 | OPEN（M1 一次性 `dart format` 收口） |
| DEF-005 | P3 | flutter doctor：cmdline-tools 缺失、license 未确认 | 本机 Android SDK | 目前未阻塞 debug 构建；release/某些 gradle 任务可能受阻 | OPEN（记录在案） |
| DEF-006 | P1 | S3 外设固件客户端断连后停止广播（2/2 复现），仅硬复位可恢复；运行期串口事件静默 | 真机 E5 连接/断连循环（NimBLE onDisconnect 或 loop 重启广播路径） | E5 三客户端重复连接场景 + S3 串口事件契约 | OPEN（下一步：loop 心跳构建定位挂死 vs 广播失败；核对 NimBLE-Arduino 1.4.x+core 组合） |
| DEF-007 | P3 | U-AND 首页蓝牙状态行恒显「蓝牙已关闭」 | apps/uniapp/composables/use-ble-scan.js `uni.getSystemSetting().bluetoothEnabled`（App 端不返回） | 仅显示层；真机扫描/发现已验证可用 | OPEN |

## F. 未执行项汇总

- Android 微信真机预览 / UniApp Android 真机运行 / Flutter `flutter run` 交互会话：NOT_RUN（首轮基线不含交互式真机会话，留待 Gate）。
- ESP32 Observer 烧录与三客户端广播验证：BLOCKED（DEF-001 连带）。
- 严格双外设多设备 E5：BLOCKED_FIXTURE（仅 1 块 ESP32 + 手机 ADB 口不可作外设）。
- Smart HID 真实配网 E5：BLOCKED_HARDWARE（无真实 Smart HID 固件/ControlHub 证据）。
- iOS 全线：微信 iOS NOT_RUN_DEVICE_MISSING；UniApp iOS / Flutter iOS BLOCKED_HOST/NOT_CONFIGURED。
- Phase A specs 产物（FLUTTER_IMPLEMENTATION_PROFILE / MOBILE_IMPLEMENTATION_SCOPE 等）：尚未在任何主机执行——本轮 Windows 只做 Phase B，已在汇报中标注。

## G. 安全

无 Wi-Fi 密码/token/证书/签名/账号凭据入档；大体积 APK 留 ignored 路径，仅记录 SHA256。

## H. 增补（2026-09-04：UniApp 去 HBuilderX 编译依赖）

应用户要求评估并落地「不经 HBuilderX、直接 CLI 构建」：

- `apps/uniapp` 挂上 npm `vue3` 线工具链（@dcloudio 四包锁定 `3.0.0-alpha-5020520260829001` + vite `5.2.8` + vue `3.4.21`）；新增 `scripts/uniapp/run-uni.mjs` 把 HBuilderX 根目录布局映射到 CLI（UNI_INPUT_DIR/UNI_OUTPUT_DIR），产物仍落 `unpackage/dist/{dev|build}/<platform>`，既有工具路径不变。
- `npm run build:mp-weixin` **PASS**（DEF-003 解除，产物 1344 KB）；`npm run build:app` **PASS**（`app-service.js` 产出）。HBuilderX 此后仅承担真机运行/基座/APK 打包。
- 根因修复：vite.config 顶层无条件 `inlineDynamicImports` 收敛为仅 APP 平台注入；工具链解析改为工程 node_modules 优先、HBuilderX 目录兜底（跨 macOS/Windows）。
- `check-uniapp-assets.mjs` 扩展 dev/build 双目录取最新 mtime；`--require-compiled` 对 CLI 产物 PASS（16 引用）。
- 回归：`verify-uniapp.sh` PASS（28 unit files + 11 static gates）。证据：`uniapp-cli-build.txt`。
- 未验证：HBuilderX 路径 mp-weixin 编译（理论同解，未跑）；微信开发者工具导入真机预览 NOT_RUN；APP 产物 HBuilderX 真机运行 NOT_RUN。

## I. 增补（2026-09-04：E5 真机轮 PC×手机×硬件）

应用户要求以真机联测为当前重点，完成三端第一轮闭环（基线 git 79dbc14，详见 `e5-realdevice/README.md`）：

- **硬件（DEF-001 RESOLVED）**：COM12 esptool 实测 ESP32-S3 rev v0.2 / 16MB quad；platformio.ini 新增 `fixture_common_s3`/`fixture_peripheral_s3`/`fixture_observer_s3`（board=esp32-s3-devkitc-1、去 `-mfix-esp32-psram-cache-issue`/`BOARD_HAS_PSRAM`，原 esp32dev 环境未动）。peripheral_s3 烧录 COM12 PASS，串口 boot JSON + 3 服务 12 特征 + `{"type":"adv","status":"started"}` PASS；observer_s3 编译 PASS（未烧录，单板占用）。
- **F-AND 手机**：debug APK 构建/安装/授权 PASS；`svc bluetooth enable` 被三星拒绝，经 REQUEST_ENABLE 对话框 + uiautomator 定位点击开启；扫描发现 BLEToolkit-Server（-49dBm）、连接 + device_info 读取（1.0.0/peripheral/MAC 与 esptool 一致）全 PASS。
- **U-WX PC**：微信开发者工具已登录；`cli open` stderr 报 getAppInfo GENERIC_ERROR 但窗口与模拟器实际渲染首页（PASS_WITH_LIMITATION）；`cli preview` 预览包 1.0MB + 二维码生成 PASS（appid wxf6c58b1dcac4c82d 有预览权限）。手机扫码 NOT_RUN（需人工）。
- **U-AND 手机**：HBuilderX CLI `launch app-android --deviceId`（纯 CLI）基座安装+同步+启动 PASS，App Launch/Show 日志在案；首页渲染 PASS；ESP32 复位后扫描发现 -49dBm PASS。
- **新缺陷**：DEF-006（P1）S3 断连后停止广播 2/2 复现 + 运行期串口事件静默；DEF-007（P3）U-AND 蓝牙状态行误显（仅显示层）。
- 现场注意：Windows 上 `timeout` 杀 pio monitor 会留僵尸进程占 COM12（本轮踩坑两次，需 `taskkill /IM pio.exe /F`）。

---

## H. 真机补测轮（13:36–14:05，git dbb38a8）— DEF-006 定案 + Windows GATT 轮

| 项 | 状态 | 说明 |
|---|---|---|
| F-AND 完整 Peripheral 轮 | **PASS** | 扫描(-28dBm)→连接→读×2(BEB5483E=`30 5B CA 3F`、2A00=`BLEToolkit-Server`)→写(`hello-ble-toolkit` 17B 串口逐字节一致)→订阅通知(attr34 订阅成功、37B 投递)→断开→510ms 恢复广播→复连全链；每步 UI dump+串口双证据 |
| U-AND 连接 | **FAIL（DEF-009 P1）** | 「连接中…」静默回列表；logcat 无 connectGatt 行、固件零连接事件；读/写/notify NOT_RUN |
| Windows 主机 GATT 轮 | **PASS** | csc+WinRT 原生工具（PS 脚本块收不到 WinRT 事件为宿主限制）；扫描 -38dBm → 连接 → 5 服务/15 特征 → 读 2A00/2A01 → 写 `win-gatt-write`(串口 hex 一致) → Dispose→515ms 恢复广播 |
| DEF-006 | **RESOLVED（改判）** | 三客户端 510/514/515ms 恢复广播 + 心跳 adv:1 稳定 2.6h+；上午复现系手机蓝牙栈僵死+扫描节流伪象 |
| 新登记 | DEF-009 / DEF-010 | U-AND 连接静默失效(P1)；F-AND 通知载荷未在 UI 呈现(P3) |

证据：`e5-realdevice/def006/`、`e6-windows/`；登记：`baseline-results.json`（followups #3）。

## I. Windows 监听安卓广播轮（14:10–14:17）

| 项 | 状态 | 说明 |
|---|---|---|
| F-AND 广播→Windows 监听 | **PASS** | BleAdvDump（csc+WinRT 全载荷解析）：广播期 `4237044C3D48 name=[耀生 的 S21] conn=1 uuids=0000fff0 rssi=-58/-59`；未广播基线与停止后复扫（371 事件）均无该设备 |
| U-AND 广播→Windows 监听 | **FAIL（DEF-009 扩展）** | UI「正在广播」但 logcat 零广播 API 调用、空中无手机广播；与连接静默失效同型 |
| Windows 工具链 | BleAdvDump.cs 入库（exe 不提交） | 名称/服务UUID/厂商数据/可连接标志/RSSI 区间全解析 |

证据：`e7-broadcast/`；登记：`baseline-results.json`（followups #4）。
