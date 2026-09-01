# Codex 提示词：Smart BLE 全面独立验证

> 在另一台电脑执行。
> 支持 `BUILD_ONLY`、`HARDWARE_E5`、`RELEASE_VERIFY` 三种模式。
> 验证机只复现和记录，不修业务源码。

---

## 使用前填写

```text
MODE=BUILD_ONLY | HARDWARE_E5 | RELEASE_VERIFY
EXPECTED_APP_COMMIT=<完整 smart-ble commit>
EXPECTED_VERSION=<Smart BLE version>
EXPECTED_PERIPHERAL_SHA256=<sha256 | NOT_APPLICABLE>
EXPECTED_OBSERVER_SHA256=<sha256 | NOT_APPLICABLE>
EXPECTED_ANDROID_SHA256=<sha256 | NOT_APPLICABLE>
RELEASE_URL=<正式/RC Release URL | NOT_APPLICABLE>
LANDING_PAGE_URL=<公开/预览 URL | NOT_APPLICABLE>
ANDROID_DEVICE=<型号与系统 | NOT_APPLICABLE>
WECHAT_DEVICE=<型号、系统、微信版本 | NOT_APPLICABLE>
PERIPHERAL_PORT=<明确端口 | NOT_APPLICABLE>
OBSERVER_PORT=<明确端口 | SECOND_PHONE | NOT_APPLICABLE>
ENABLE_SMART_HID_E5=NO | YES
```

---

## 可直接复制给验证机 Codex

```text
你现在执行 Smart BLE 全面独立验证，不是开发任务。

工作区根目录通常为：

/Users/luoyaosheng/Desktop/project/Open

目标仓库：

<OPEN_ROOT>/smart-ble

总计划：

<OPEN_ROOT>/smart-ble/docs/plans/2026-08-31-uniapp-esp32-full-product-delivery-plan.md

Gate 看板：

<OPEN_ROOT>/smart-ble/docs/verification/full-delivery-gate-board.md

固定输入：

MODE=<BUILD_ONLY | HARDWARE_E5 | RELEASE_VERIFY>
EXPECTED_APP_COMMIT=<完整 commit>
EXPECTED_VERSION=<version>
EXPECTED_PERIPHERAL_SHA256=<sha | NOT_APPLICABLE>
EXPECTED_OBSERVER_SHA256=<sha | NOT_APPLICABLE>
EXPECTED_ANDROID_SHA256=<sha | NOT_APPLICABLE>
RELEASE_URL=<url | NOT_APPLICABLE>
LANDING_PAGE_URL=<url | NOT_APPLICABLE>
ANDROID_DEVICE=<...>
WECHAT_DEVICE=<...>
PERIPHERAL_PORT=<...>
OBSERVER_PORT=<... | SECOND_PHONE>
ENABLE_SMART_HID_E5=<NO | YES>

==================================================
1. 验证纪律
==================================================

1. 只测试，不修业务源码。
2. 不自动 pull、merge、rebase、reset、stash、checkout 或 push。
3. HEAD 不等于 EXPECTED_APP_COMMIT 时立即停止。
4. 版本、固件和 APK SHA 不匹配时立即停止对应模式。
5. 不把 E0～E4 当 E5，不把开发机结果复制成独立结果。
6. 不自动选择未知串口。
7. HARDWARE_E5 只烧写指定 LightBLE 测试板。
8. 不执行 Smart HID efuse、Secure Boot、Flash Encryption。
9. 不保存密码、token、API Key、私钥或个人设备标识。
10. 失败只记录第一断点和证据，不顺手修复。
11. 测试报告写入仓库外或 ignored 目录。
12. 最终 tracked worktree 必须 clean。
13. 没有执行的项目标 NOT_EXECUTED，缺工具标 BLOCKED_BY_ENV/TOOLCHAIN，缺凭据标 BLOCKED_BY_CREDENTIAL。

==================================================
2. 证据目录
==================================================

RUN_ID：

YYYYMMDD-HHMM-<app-shortsha>-<mode>-<os-arch>

EVIDENCE_ROOT：

<OPEN_ROOT>/verification/smart-ble-full/<RUN_ID>/

目录：

```text
environment.md
baseline.md
build-results.md
page-results.md
operation-results.md
hardware-results.md
landing-page-results.md
release-results.md
app-logs/
esp32-serial/
screenshots/
videos/
artifacts/
checksums.txt
summary.md
```

完整 stdout/stderr 保存到 evidence，不让测试工具覆盖 tracked Playwright report 或结果文件。

==================================================
3. 基线与工具链
==================================================

记录：

- 日期、时区、OS、版本、架构。
- Git、Node、npm、Python、Java。
- HBuilderX 和 CLI。
- 微信开发者工具、基础库和 CLI。
- PlatformIO 和框架版本。
- 浏览器/Playwright。
- Android/微信测试设备。
- USB 串口清单。
- 网络和公开 URL 可达性；不记录密码。

仓库：

- git status --short --branch
- git rev-parse HEAD
- git log --oneline --decorate -n 8

要求：

- worktree clean。
- HEAD == EXPECTED_APP_COMMIT。

否则输出 BASELINE_MISMATCH 并停止。

确认以下产物存在：

- 全面交付计划。
- Gate 看板。
- 10 页 + WEB-001 审核。
- Runtime audit。
- Page-operation matrix。
- Landing claim/link matrix。
- 产品契约和发布门禁。
- App/落地页原型。
- ESP32 fixture contract。
- release metadata；若当前 Gate 尚未到 Release，可按模式标 NOT_AVAILABLE_AT_BASELINE。

==================================================
4. 所有模式共同执行：BUILD 与 E0～E4
==================================================

## 4.1 统一自动化

优先使用仓库统一 verify 命令，必须覆盖：

- 产品契约。
- 页面、路由和 Tab。
- BLE Runtime。
- 扫描和 session。
- GATT operation。
- 多设备和 tuple routing。
- Broadcast payload、mode owner 和 server lifecycle。
- OTA manager。
- Smart HID pure/Profile tests。
- 资源、SFC、版本和 release metadata。
- `git diff --check`。

保存每条命令、exit code、时长和日志。

## 4.2 App 与落地页原型

- 运行 10 页 App 原型 Playwright。
- 运行落地页信息架构/生产页 Playwright。
- 手机/桌面、亮色/暗色。
- console error = 0。
- 关键 CTA 两次点击可达。
- 图片 alt、键盘和焦点。

## 4.3 文档站

- `npm ci`。
- VitePress production build。
- 内部链接检查。
- 本地预览页面 smoke。

## 4.4 ESP32

- `pio test`。
- `pio run -e fixture_peripheral`。
- `pio run -e fixture_observer`。
- 协议锁检查。
- 计算固件 SHA。

若 EXPECTED SHA 不是 NOT_APPLICABLE，则必须完全匹配。

## 4.5 UniApp

按环境能力执行：

- H5 production build。
- Android production/debug test build。
- mp-weixin production build。
- UniAutomator 10 页和四 Tab。

记录 HBuilderX、Runtime 和微信基础库版本。

## 4.6 当前落地页静态真实性

对 `docs/index.md`、VitePress config 和 release metadata 检查：

- 当前正式主线为 UniApp Android + 微信 + ESP32。
- 其他客户端标参考/后续，不宣称完整。
- 版本与 EXPECTED_VERSION 一致。
- 不存在无产物的可点击下载。
- 公开状态不高于 evidence。
- SEO/OG 与页面一致。
- 当前截图、固件、原型、证据和限制入口存在。

==================================================
5. MODE=BUILD_ONLY
==================================================

不执行：

- ESP32 upload 和 monitor。
- Android 安装和 BLE。
- 微信真机 BLE。
- 手机 Peripheral 观察。
- OTA 真机。
- Smart HID E5。
- 公开 Release 下载验证；若 URL 存在可做非阻断可达性检查。

BUILD_ONLY 只能证明：

- 固定源码可复现。
- 自动化和构建可复现。
- App/落地页 E4 可复现。

结束时计算 evidence SHA，确认 worktree clean 并报告。

==================================================
6. MODE=HARDWARE_E5
==================================================

必须满足：

- 用户明确选择 HARDWARE_E5。
- PERIPHERAL_PORT 是专用测试板。
- OBSERVER_PORT 是第二块板，或明确 SECOND_PHONE。
- 固件 SHA 固定。
- Android/微信设备明确。
- 用户允许 PlatformIO upload。

烧写前：

- 显示目标端口、板型、环境和固件 SHA。
- 验证端口存在且两个端口不同。
- 不自动替换端口。
- 不执行 erase-all，除非另有授权。

## 6.1 Peripheral

- 烧写 `fixture_peripheral`。
- 保存 boot、advertising、connect、service、read、write、notify、OTA、disconnect 的串口 JSON event。

## 6.2 Observer

ESP32 Observer：

- 烧写 `fixture_observer`。
- 保存手机广播解析。

SECOND_PHONE：

- 记录观察 App、手机、系统和版本。
- 保存可导出的广播信息和截图。

## 6.3 Android 按 PAGE/OP

PAGE-001：

- 蓝牙关闭。
- 权限拒绝/允许/设置恢复。
- 第一轮、手动停、自动停、hide 停。
- 第二轮。
- 名称、RSSI、去重、筛选。
- 广播详情和复制。
- 卡片不误连接，连接前停扫描。

PAGE-006：

- 连接、服务和特征。
- Read。
- TEXT/HEX Write，LED 四命令。
- 非法 HEX 不调用 API。
- Notify 开/值/关。
- 权限错误。
- 日志。
- 主动断开、ESP32 断电、重连。
- Fault Injection。
- OTA 仅在有安全恢复方案时执行；否则 BLOCKED。

PAGE-007：

- 两设备 session。
- 进入详情复用连接。
- 同 UUID Notify 不串线。
- 断开 A 不影响 B。
- 全部断开和部分失败。

PAGE-008：

- 平台能力。
- 默认 payload。
- Observer 核对名称、UUID、Manufacturer、原始字节。
- 31 字节成功。
- 32 字节阻止且观察端无新广播。
- start/stop/hide/unload。
- 活动 Central 连接保护和模式恢复。

PAGE-009/010：

- 真实版本、平台状态、链接、反馈、分享、返回和滚动。

## 6.4 微信按 PAGE/OP

使用正式 AppID、稳定基础库和真实微信，独立执行：

- 权限和定位实际策略。
- 两轮扫描。
- GATT Read/Write/Notify。
- 多设备和跨 Tab。
- Central/Peripheral。
- Observer。
- 外链复制、小程序跳转、好友/朋友圈分享。

Android 结果不能复制成微信结果。

## 6.5 Smart HID

只有 `ENABLE_SMART_HID_E5=YES` 且提供固定 Smart-HID firmware、ControlHub、测试板和网络时执行：

- PAGE-002～005。
- matcher、Device Info、QR、candidate、status、错误、历史、诊断。
- READY 后 ControlHub → USB HID。

否则 PAGE-002～005 E5 标 NOT_EXECUTED，不阻塞通用 BLE E5。

## 6.6 PASS 条件

每个 OP 同时满足：

- 页面反馈正确。
- Runtime 调用正确。
- ESP32/Observer 结果正确。
- 后续状态正确。
- listener/session/adapter 清理正确。

==================================================
7. MODE=RELEASE_VERIFY
==================================================

前置：

- RELEASE_URL 和 LANDING_PAGE_URL 不是 NOT_APPLICABLE。
- EXPECTED_VERSION、commit、Android/固件 SHA 固定。
- RC 或正式产物已经发布。

## 7.1 Release 下载

从公开 Release 下载：

- Android 产物；若正式不提供，则 release metadata 必须明确 NOT_RELEASED。
- Peripheral 固件。
- Observer 固件。
- SHA256SUMS / manifest。
- Release notes 和已知限制。

校验：

- 文件存在。
- SHA 与 EXPECTED 完全一致。
- manifest version/commit/evidence 匹配。
- 没有旧 Flutter/Tauri 产物被标成当前首版主下载。

## 7.2 Android 新安装

- 从下载产物全新安装。
- 首次权限。
- 第一次扫描。
- 连接、最小 Read/Write/Notify。
- 关于页和版本页。

## 7.3 微信

- 体验版/正式版版本与 release metadata 一致。
- 最小扫描/GATT/分享 smoke。
- 没有凭据时不能在验证机假执行上传；发布记录必须由已有证据证明。

## 7.4 ESP32 从零复现

- 在干净目录下载/克隆。
- 按公开教程安装依赖。
- 构建或使用下载固件。
- 指定端口烧写。
- 串口确认版本和模式。
- 与 App 完成最小联调。

## 7.5 公开落地页

访问 LANDING_PAGE_URL，验证：

Hero：

- 产品定位、版本和状态正确。
- 主/次 CTA 与真实可用入口一致。

能力与平台：

- `VERIFIED/PREVIEW/BLOCKED/UNSUPPORTED/NOT_RELEASED` 与 release metadata 一致。
- 不宣称多平台全部完整。

截图与原型：

- 真实产品截图可加载。
- 在线原型可进入。

ESP32：

- Peripheral/Observer 说明、教程、固件下载和 SHA 可达。

下载和二维码：

- Android 下载实际可用。
- 微信二维码可识别并进入正确小程序/页面；没有正式二维码时不得显示假入口。
- 所有下载链接匹配 manifest。

证据和限制：

- commit、版本、固件 SHA、设备、evidence run、已知限制存在。

文档与贡献：

- GitHub、Issue、产品契约、Profile、Security、License 可达。

页面质量：

- 手机/桌面、亮/暗。
- console error = 0。
- 键盘和焦点。
- 图片 alt。
- SEO/OG/canonical。
- 所有内部/外部链接。

## 7.6 发布后状态

任何关键下载、二维码、版本或声明不一致：

- RELEASE_VERIFY FAIL。
- 不得继续宣称完整可用。
- 记录第一断点并反馈开发电脑。

==================================================
8. 矩阵与证据
==================================================

不要修改开发仓库中的矩阵；在 evidence 中复制并回填：

- PAGE/WEB/OP。
- Build result。
- Android result。
- WeChat result。
- ESP32/Observer event。
- Landing claim/link result。
- Release result。
- evidence path。
- PASS/FAIL/BLOCKED/NOT_EXECUTED。
- first breakpoint。

对 evidence 目录生成 SHA256 清单。

==================================================
9. 结束卫生检查
==================================================

- git status --short --branch
- git diff --check

要求 tracked files 零修改。

若测试生成 tracked 文件：

- 保存 diff。
- 标 TEST_HYGIENE_FAIL。
- 只恢复可证明由本轮生成的文件。
- 不碰用户原有改动。

==================================================
10. 最终报告
==================================================

MODE:
OVERALL:
RUN_ID:

BASELINE:
- expected/actual commit
- expected/actual version
- expected/actual artifact SHA
- initial/final worktree

ENVIRONMENT:
- OS/arch
- Node/npm/Java
- HBuilderX/微信工具/基础库
- PlatformIO
- 手机、板、端口

BUILD RESULTS:
- contract/tests
- App prototype
- landing page/docs
- firmware peripheral/observer
- H5/Android/mp-weixin

PAGE RESULTS:
- PAGE-001～010
- WEB-001

HARDWARE RESULTS:
- Android
- WeChat
- Peripheral
- Observer
- OTA
- Smart HID

RELEASE RESULTS:
- downloads
- manifest/SHA
- Android fresh install
- WeChat smoke
- ESP32 from zero
- landing page/QR/links/SEO

FIRST FAILURE:
- PAGE/WEB/OP
- expected
- actual
- first breakpoint
- logs/evidence

EVIDENCE:
- root
- checksums

SOURCE CHANGES:
- NONE

NEXT:
- 返回开发电脑只修确认的第一断点
- 验证机不修源码

没有实际执行的项目不得写 PASS。
```
