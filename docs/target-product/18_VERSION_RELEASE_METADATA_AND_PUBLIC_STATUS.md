# 18 版本、Release Metadata 与公开状态

```yaml
status: APPROVED
document_version: 1.0
owner: Smart BLE Release
last_reviewed: 2026-09-01
approved_by: user
supersedes: []
```

---

## 1. 本文负责什么 / 不负责什么

本文负责：VERSION 规则、Tag/Manifest/Artifact 管理、公开声明登记（CLAIM-001~030）、公开状态评定与联动、无产物降级、二维码规则。

本文不负责：测试规范（`docs/target-tests/`）；落地页结构（`web/WEB-001`）。

---

## 2. VERSION（版本唯一事实源）

- 仓库根 `VERSION` 文件：`MAJOR.MINOR.PATCH`（semver），人读正典；
- 投影链（五处一致，TEST-C-006）：`VERSION → 构建 → manifest.json/app 版本 → 关于页（PAGE-009）→ 版本页（PAGE-010）→ Release Metadata → 落地页徽标`；
- 开发构建显示 `dev.<shortsha>`；读取失败显示 `dev.unknown`（ERR-DATA-05）；
- Tag 规则：`v<VERSION>`（如 `v1.0.0`）；固件版本独立语义化但与 App Release Metadata 同步登记。

## 3. PROTO-010 Release Metadata Schema（DATA-009 机器面）

```json
{
  "release_tag": "v1.0.0",
  "app_version": "1.0.0",
  "commit": "<full sha>",
  "built_at": "2026-09-01T00:00:00Z",
  "artifacts": [
    {"kind": "apk", "url": "…", "sha256": "…", "size": 123},
    {"kind": "firmware-peripheral", "url": "…", "sha256": "…", "size": 123},
    {"kind": "firmware-observer", "url": "…", "sha256": "…", "size": 123}
  ],
  "wechat_qr": {"status": "published|not_released", "image": "…"},
  "verified_capabilities": [
    {"claim_id": "CLAIM-004", "status": "VERIFIED", "evidence_ids": ["EVID-001","EVID-003"]}
  ],
  "known_limitations": ["…"],
  "tested_devices": ["Pixel 7 / Android 14", "…"]
}
```

生成与校验：Release 流程生成（禁止手写）；发布前校验五处一致+产物 SHA 实测；落地页/版本页只消费本文件。

## 4. Artifact 规则

- 每个产物必附 SHA256 与大小；页面展示前 8 位并提供完整值复制；
- APK：UniApp Android 正式构建（**不是**其他客户端产物；下载卡与产物 kind 一一对应）；
- 固件：peripheral 与 observer 两个 bin + manifest（版本/shortsha/SHA）；
- 微信：正式小程序码（发布+扫码实测通过才展示，否则 NOT_RELEASED）；
- 无产物=不出现下载链接（REQ-060）。

## 5. 公开状态评定规则

| 状态 | 评定条件 |
|---|---|
| VERIFIED | 对应 TEST 全过 + 证据入 EVID + Metadata 登记 |
| PREVIEW | E0–E4 证据存在；页面显示"预览"+已知限制 |
| BLOCKED | 外部阻断（固件/工具链/凭据）；显示原因 |
| UNSUPPORTED | 平台能力缺失；显示替代 |
| NOT_RELEASED | 产物未发布；无下载入口 |

联动：能力卡（WEB-001）、平台表、关于页、版本页全部从同一 Metadata 投影；漂移即 ERR-WEB-04 阻断发布。

## 6. 公开声明登记（CLAIM-001~031）

| ID | 声明（落点） | 证据前提 | 对应测试 |
|---|---|---|---|
| CLAIM-001 | 产品定位一句话（Hero） | 与 `01` 一致 | TEST-R-006 |
| CLAIM-002 | 当前版本与渠道（Hero 徽标） | Metadata | TEST-R-002 |
| CLAIM-003 | 核心闭环七环节 | 各环节达标 | TEST-R-007 |
| CLAIM-004 | 扫描与广播解析 | E5 双平台+夹具 | TEST-A-005、TEST-W-007、TEST-E-001 |
| CLAIM-005 | 两轮扫描与筛选 | 同上 | 同上 |
| CLAIM-006 | 连接与 GATT 读写/订阅 | E5 | TEST-A-006/008、TEST-W-007、TEST-E-003 |
| CLAIM-007 | 属性/权限组合教学服务 | E5 | TEST-E-003 |
| CLAIM-008 | 按设备通信日志与导出 | E5 | TEST-A-008、TEST-W-008 |
| CLAIM-009 | 多设备会话管理 | E5 | TEST-A-009、TEST-W-009 |
| CLAIM-010 | OTA 完整事务+版本回读 | TEST-E-007+A/W 对应全过 | TEST-E-007、TEST-A-011（否则 BLOCKED，DEC-001） |
| CLAIM-011 | 手机广播+Observer 验证 | E5 Observer | TEST-E-006、TEST-A-010 |
| CLAIM-012 | 版本透明（五处一致） | TEST-C-006 | TEST-C-006、TEST-R-002 |
| CLAIM-013 | 平台状态表 | `08` 投影 | TEST-R-003 |
| CLAIM-014 | Smart HID 配网/诊断 | TEST-H 全过 | TEST-H-001..006（DEC-006） |
| CLAIM-015 | 开源 MIT 与源码可得 | 仓库/License | TEST-R-005 |
| CLAIM-016 | ESP32 双模式夹具 | 固件可下载可复现 | TEST-E-008、TEST-R-008 |
| CLAIM-017 | 三条 5 分钟快速开始（Quick Start：前置条件已满足，不含工具链从零安装，`19` 第 2 节） | 教程实测 | TEST-R-005 |
| CLAIM-018 | 下载含 SHA 与设备清单 | Metadata | TEST-R-001/008 |
| CLAIM-019 | 已知限制公开 | Metadata | TEST-R-003 |
| CLAIM-020 | 证据可查（EVID 链接） | 证据存在 | TEST-R-007 |
| CLAIM-021 | 隐私立场（本地优先无云端） | SEC-008 | TEST-R-003 |
| CLAIM-022 | 安全披露渠道 | SECURITY.md | TEST-R-005 |
| CLAIM-023 | 在线交互原型 | 原型部署 | TEST-R-006 |
| CLAIM-024 | 真实 App 截图 | 截图存在+alt | TEST-R-006 |
| CLAIM-025 | 贡献指南与 Profile 扩展 | 文档存在 | TEST-R-005 |
| CLAIM-026 | 文档站可离线阅读核心内容 | SSG | TEST-R-006 |
| CLAIM-027 | 微信小程序入口 | 正式码可用 | TEST-R-009 |
| CLAIM-028 | Android APK 下载 | 产物+SHA | TEST-R-001 |
| CLAIM-029 | SEO/OG/canonical 正确 | 抓取一致 | TEST-R-006 |
| CLAIM-030 | 无障碍承诺（对比度/键盘/alt） | a11y 走查 | TEST-R-010 |
| CLAIM-031 | 新电脑 30 分钟 Clean Machine 端到端闭环（clone→依赖→build→flash→install→scan→connect→write→notify，`19` 第 2 节） | 独立电脑全流程录屏 | TEST-R-011（与 CLAIM-017 的 5 分钟 Quick Start 使用不同测试 ID，不得互相冒充） |

禁止：任何未登记声明、无证据状态词、渲染数字（"6+ 入口"类）。

## 7. 无产物降级

- 全部产物未发布：Hero 状态=NOT_RELEASED；下载区为说明卡；主 CTA→在线原型/源码；能力卡按各自证据标 PREVIEW/BLOCKED；
- 部分产物缺失：对应卡 NOT_RELEASED，其余正常；
- 资源缺失（截图/原型）：区块隐藏+一行说明（STATE-W001-04）。

## 8. 二维码规则

- 仅展示**正式小程序码**（体验版二维码不入公开页）；
- 发布前 E6：实机扫码进入小程序成功；失效即 ERR-WEB-03 重新生成；
- 页面给文字等效（小程序名+搜索路径），二维码图有 alt。

## 9. 验收条件与关联测试规划

- VERSION→五处一致链与开发版规则；
- Metadata Schema 完整且为公开面唯一来源；
- 30 条 CLAIM 全部有证据前提与测试；
- 降级与二维码规则明确。

关联计划测试：`TEST-C-006`（一致性）、`TEST-R-001..010`（E6 全套）。
