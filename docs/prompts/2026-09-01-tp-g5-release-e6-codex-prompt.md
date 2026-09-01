# Codex 提示词：TP-G5——落地页、Release 与独立电脑 E6

> 前置：发布范围内的 Must 已达到自动化 PASS 与所需 E5，用户已批准 Release Candidate 范围。
> 本轮负责公开状态、产物、落地页、独立电脑复现和正式发布；不允许用无证据能力填充营销内容。

---

## 可直接复制给 Codex

```text
你现在执行 Smart BLE 的 TP-G5：落地页、Release 与独立电脑 E6。

工作区：

/Users/luoyaosheng/Desktop/project/Open/smart-ble

输入：

RELEASE_CHANNEL=<rc | stable>
EXPECTED_SOURCE_COMMIT=<完整 commit>
EXPECTED_VERSION=<version>
APP_ARTIFACT=<路径或 NOT_RELEASED>
WECHAT_RELEASE_RECORD=<证据路径或 NOT_RELEASED>
PERIPHERAL_ARTIFACT=<路径>
OBSERVER_ARTIFACT=<路径>
E5_EVIDENCE_IDS=<列表>
LANDING_PAGE_URL=<预览/正式 URL>
RELEASE_REMOTE=<明确远端；本轮默认不 push，除非用户另行授权>

必须读取 APPROVED target-product、target-tests、TP-G2/3/4 报告、Release Metadata 目标、Landing 目标和全部 E5 证据。

若发布范围内 Must 未达到要求 E5，或版本/commit/artifact 不固定：

输出 `RELEASE_PREREQUISITES_NOT_MET` 并停止。

==================================================
一、发布纪律
==================================================

- 公开状态必须来自目标测试和证据；
- 不存在 Artifact 时显示 NOT_RELEASED，不生成假下载；
- URL 与 SHA 必须同时存在；
- PREVIEW/RC/VERIFIED/NOT_RELEASED/UNSUPPORTED 状态严格合法；
- 不把 Flutter/Tauri/原生参考实现作为 UniApp 第一版主下载；
- 微信没有正式/体验发布记录时不得显示可用二维码；
- 不在未授权情况下 push、tag、deploy 或发布；
- Release Verify 失败时不得继续标完整可用；
- 敏感数据不得进入 Release、截图或公开证据。

==================================================
二、版本与 Metadata
==================================================

核对并生成：

- 根 VERSION；
- UniApp manifest/package/关于/版本页；
- release/release-manifest.json；
- docs/public/release/latest.json；
- Tag 计划；
- Changelog；
- Artifact 列表；
- SHA256SUMS；
- Evidence IDs；
- 测试设备；
- 已知限制；
- 公开状态。

要求：

- version 完全一致；
- source commit == EXPECTED_SOURCE_COMMIT；
- clean release 时 dirty=false；
- 每个 Artifact 文件存在、SHA 可重算；
- Android 未发布时 URL/SHA null；
- 微信状态根据真实发布记录；
- Peripheral/Observer 绑定版本、commit、SHA；
- OTA/Smart HID 只按实际证据状态公开。

==================================================
三、CI 与 Release 工程
==================================================

将 Release 主线对齐目标产品：

- UniApp 自动化与构建可执行部分；
- 微信构建/发布记录，缺凭据时 BLOCKED_BY_CREDENTIAL；
- Peripheral/Observer build/test/artifact；
- target verify；
- docs/prototype/landing build；
- manifest/SHA；
- Artifact upload；
- Release notes。

旧 Flutter/Tauri Release Job：

- 不得继续充当第一版主 Release；
- 可移到 reference/legacy workflow 或非阻断 Job；
- 不删除历史源码。

CI/Release 需要 clean checkout 可复现，测试报告作为 Artifact，不跟踪到 Git。

==================================================
四、生产落地页 WEB-001
==================================================

严格按 APPROVED WEB-001 目标实现：

1. Hero：产品、版本、channel、公开状态、真实 CTA。
2. 当前正式主线：UniApp Android / 微信 / LightBLE。
3. 核心 BLE 闭环。
4. 能力卡，状态由 release metadata 驱动。
5. 平台矩阵与正确降级。
6. 真实 App 截图和 alt。
7. 在线 10 页原型。
8. ESP32 Peripheral / Observer：角色、板型、教程、Artifact、SHA。
9. 微信/Android/ESP32 三条快速开始。
10. 下载或 NOT_RELEASED；无假 `<a>`。
11. commit/version/SHA/device/evidence/limitations。
12. Smart HID 第一方 Profile 与真实状态。
13. GitHub、Issue、Security、License、贡献。
14. SEO/OG/canonical。
15. mobile/desktop/light/dark/a11y。

公开页面不能显示内部 P0/P1 审计噪音，但必须显示用户相关限制。

==================================================
五、Release Candidate 构建
==================================================

从 clean checkout 或独立 worktree：

1. 安装固定依赖；
2. 运行 target verify；
3. 运行现有回归；
4. 运行 docs/prototype/landing E4；
5. 构建 Peripheral/Observer；
6. 构建可用 App artifact；
7. 生成 Metadata/SHA/Notes；
8. 复制 E5 Evidence 摘要；
9. 打包 RC；
10. 不发布前先执行独立验证。

所有命令、工具版本和产物写入 RC Evidence。

==================================================
六、独立电脑 RELEASE_VERIFY
==================================================

验证电脑必须：

- 使用 EXPECTED_SOURCE_COMMIT；
- 从公开/RC 地址下载 Artifact，而不是开发机复制的 build；
- 校验 SHA；
- Android fresh install；
- 微信版本/二维码/最小 smoke；
- ESP32 从零安装依赖、构建或下载、烧写、串口确认、最小联调；
- 访问 LANDING_PAGE_URL；
- 验证所有下载、二维码、内部/外部链接；
- 验证版本、状态、Evidence、限制；
- 验证 mobile/desktop/light/dark、console、键盘、焦点、alt、SEO/OG/canonical；
- 输出 E6 证据；
- 不修源码。

任何关键失败：Release Verify FAIL，不得继续正式发布。

==================================================
七、发布授权边界
==================================================

默认只生成 RC 和发布计划，不执行：

- git push；
- tag push；
- GitHub/Gitee Release；
- Pages 正式部署；
- 微信上传/提交审核。

只有用户在本轮明确授权对应动作和远端/凭据，才可执行。授权不完整则停在 `READY_TO_PUBLISH`。

==================================================
八、发布后 TP-G6 烟测计划
==================================================

发布前创建并冻结：

- 下载验证；
- SHA；
- Android 新安装；
- 微信最小扫描/GATT/分享；
- ESP32 Artifact→刷写→联调；
- 落地页、原型、文档、二维码、外链；
- 关于/版本/Metadata 一致；
- 回滚条件；
- 状态降级和公告模板。

==================================================
九、提交与报告
==================================================

建议拆分：

- chore(release): align Smart BLE release metadata and artifacts
- feat(site): publish the verified Smart BLE product entry
- ci(release): build UniApp and ESP32 release artifacts
- docs(release): add RC notes evidence and limitations

不得无授权 push。

最终报告：

TP-G5 STATUS
RELEASE CHANNEL / VERSION / COMMIT
ARTIFACTS / SHA
E5 EVIDENCE
CI / BUILD RESULTS
LANDING PAGE RESULTS
RELEASE_VERIFY E6
KNOWN LIMITATIONS
READY_TO_PUBLISH / BLOCKED
COMMITS
PUSH/TAG/DEPLOY STATUS
NEXT: 用户授权发布，随后 TP-G6 发布后烟测

没有独立 E6 的能力不得在落地页标 VERIFIED。
```
