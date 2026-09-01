# Codex 提示词：TP-G6——发布后烟测、降级与维护

> 前置：用户已经明确授权并完成 RC/正式发布。
> 本轮从公开入口重新验证，不使用开发机本地产物替代公开下载。

---

## 可直接复制给 Codex

```text
你现在执行 Smart BLE 的 TP-G6：发布后烟测、状态降级与维护闭环。

输入：

RELEASE_CHANNEL=<rc|stable>
RELEASE_VERSION=<version>
RELEASE_TAG=<tag>
RELEASE_URL=<url>
LANDING_PAGE_URL=<url>
EXPECTED_SOURCE_COMMIT=<commit>
EXPECTED_ARTIFACT_SHA256=<清单>
WECHAT_PUBLIC_ENTRY=<正式/体验入口>
TEST_DEVICES=<设备列表>

如果发布地址、版本、commit 或 artifact SHA 不完整，输出 `POST_RELEASE_INPUT_INCOMPLETE` 并停止。

==================================================
一、原则
==================================================

- 只从公开 Release、公开落地页和公开二维码开始；
- 不使用开发机 build 代替下载产物；
- 失败时不继续宣传完整可用；
- 测试失败先降级公开状态，再进入修复；
- 不在烟测过程中顺手修源码；
- 公开状态、Known Limitations 和公告必须同步；
- 不泄露凭据和个人设备信息。

==================================================
二、公开下载与 SHA
==================================================

从 RELEASE_URL 下载：

- Android artifact 或确认 NOT_RELEASED；
- Peripheral firmware；
- Observer firmware；
- Manifest；
- SHA256SUMS；
- Release Notes；
- 已知限制。

验证：

- HTTP 可达；
- 文件名、大小、类型；
- SHA 完全一致；
- version/commit/channel/evidence；
- 无旧 Flutter/Tauri 产物冒充当前主下载；
- 无多余敏感文件。

==================================================
三、Android 新安装烟测
==================================================

- 卸载旧版本或使用干净设备；
- 安装公开下载 artifact；
- 首次权限；
- 第一次扫描；
- 连接 Peripheral；
- 最小 Read/Write/Notify；
- PAGE-007 Session；
- PAGE-009/010 版本；
- 必要分享/外链；
- 崩溃、白屏、死路和假成功检查。

若 Android 为 NOT_RELEASED，确认落地页无可点击假下载。

==================================================
四、微信公开入口烟测
==================================================

- 扫描公开二维码/入口；
- 确认 AppID、版本、渠道；
- 首次权限；
- 最小扫描/GATT；
- Peripheral（若发布范围）；
- 分享；
- 外链/小程序跳转；
- 页面和版本；
- 不使用开发者工具代替公开版本。

二维码无效、版本不符或关键功能失败立即阻断公开 VERIFIED。

==================================================
五、ESP32 从公开资料复现
==================================================

在干净目录/电脑：

- 按落地页和文档安装依赖；
- 下载或构建 Peripheral/Observer；
- 校验 SHA；
- 指定端口烧写；
- 串口确认 version/mode/commit；
- Android/微信最小联调；
- Observer 验证手机广播；
- 记录文档缺口和隐含前置。

不允许使用开发机私有配置、COM3 假设或未公开文件。

==================================================
六、落地页与文档烟测
==================================================

验证 LANDING_PAGE_URL：

- Hero/版本/channel/status；
- CTA；
- 能力卡和证据；
- 平台状态；
- 截图；
- 原型；
- ESP32；
- 三条快速开始；
- 下载/二维码；
- Evidence/Limitations；
- Smart HID；
- GitHub/Issue/Security/License；
- mobile/desktop/light/dark；
- console；
- 键盘/焦点/alt；
- SEO/OG/canonical；
- 所有内外链。

页面声明必须与公开 Release Metadata 一致。

==================================================
七、状态降级与回滚
==================================================

关键失败时立即确定：

- 将相关能力从 VERIFIED 降为 PREVIEW/BLOCKED/NOT_RELEASED；
- 隐藏或禁用坏下载/二维码；
- 更新 Known Limitations；
- 创建 Incident/Issue；
- 决定回滚 Tag/Artifact/页面或发布 Hotfix；
- 保留旧 Artifact 与 SHA，不静默覆盖；
- 公告影响、规避和预计修复版本。

回滚不自动执行，除非用户明确授权。

==================================================
八、证据与报告
==================================================

创建：

```text
verification/post-release/<RUN_ID>/
├── environment.md
├── downloads.md
├── android.md
├── wechat.md
├── esp32.md
├── landing.md
├── links.md
├── incidents.md
├── screenshots/
├── logs/
├── checksums.txt
└── summary.md
```

最终报告：

TP-G6 STATUS
RELEASE VERSION/TAG/COMMIT
DOWNLOAD/SHA
ANDROID
WECHAT
ESP32 FROM ZERO
LANDING/DOCS/LINKS/SEO
INCIDENTS
PUBLIC STATUS CHANGES
ROLLBACK/HOTFIX RECOMMENDATION
EVIDENCE ROOT
SOURCE CHANGES: NONE（除非用户授权状态修复）
NEXT: 关闭发布或进入指定 FIX/Hotfix

任何没有从公开入口执行的项不得写 PASS。
```
